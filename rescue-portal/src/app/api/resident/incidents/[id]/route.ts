import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { calculateSeverity } from '@/lib/severity-scoring'
import { mapEmergencyTypeToSeverityKey, selectHistoryActorId, type ReporterRole } from '@/lib/incident-submission'
import { attachEmergencyTypes } from '@/lib/incident-presentation'
import { isEmergencyTypeAvailableToOrganization } from '@/lib/emergency-type-catalog'
import { getResidentAccess, getTestReportMetadata } from '@/lib/owner-test-mode'
import type { RegistrationStatus, UserRole } from '@/lib/types'

export const dynamic = 'force-dynamic'

type QueryResult<T> = {
  data: T | null
  error: { message?: string } | null
}

type SupabaseQueryBuilder = PromiseLike<QueryResult<unknown>> & {
  select(columns: string): SupabaseQueryBuilder
  eq(column: string, value: unknown): SupabaseQueryBuilder
  update(values: Record<string, unknown>): SupabaseQueryBuilder
  insert(values: Record<string, unknown> | Record<string, unknown>[]): SupabaseQueryBuilder
  maybeSingle<T = Record<string, unknown>>(): Promise<QueryResult<T>>
  single<T = Record<string, unknown>>(): Promise<QueryResult<T>>
}

type SupabaseDataClient = {
  from(table: string): SupabaseQueryBuilder
}

type ResidentProfileRow = {
  id: string
  user_id: string
  role: UserRole
  full_name: string
  organization_id: string
  is_active: boolean
  registration_status: RegistrationStatus | null
}

type EmergencyTypeRow = {
  id: string
  name: string
  icon: string
  color: string
  organization_id: string | null
}

function clean(value: unknown) {
  return String(value ?? '').trim()
}

function normalizeHazards(hazards: unknown) {
  const values = Array.isArray(hazards) ? hazards.map((item) => String(item)) : []

  return {
    values,
    has_unconscious: values.includes('unconscious'),
    has_fire: values.includes('fire') || values.includes('fire_present'),
    has_flooding: values.includes('flooding'),
    has_violence: values.includes('violence'),
    severityHazards: values.map((value) => {
      if (value === 'fire') return 'fire_present'
      if (value === 'chemical') return 'hazmat'
      return value
    }),
  }
}

async function requireApprovedResident(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: NextResponse.json({ message: 'Please sign in first.' }, { status: 401 }) }
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single() as QueryResult<ResidentProfileRow>

  const access = profile
    ? getResidentAccess(profile, new URL(request.url).searchParams)
    : { allowed: false, ownerTestMode: false }

  if (profileError || !profile || !access.allowed) {
    return { error: NextResponse.json({ message: 'Approved resident or Owner Test Mode access required.' }, { status: 403 }) }
  }

  return { profile, access }
}

export async function PATCH(request: Request, context: RouteContext<'/api/resident/incidents/[id]'>) {
  const auth = await requireApprovedResident(request)
  if ('error' in auth) return auth.error

  try {
    const { id } = await context.params
    const body = await request.json()
    const reporterRole = clean(body?.reporter_role) as ReporterRole
    const typeId = clean(body?.emergency_type_id)
    const affectedCount = Math.max(0, Number(body?.affected_count ?? 1) || 0)

    if (reporterRole !== 'victim' && reporterRole !== 'passerby') {
      return NextResponse.json({ message: 'Choose whether you are the victim or a passerby.' }, { status: 400 })
    }

    if (!typeId) {
      return NextResponse.json({ message: 'Choose an emergency type.' }, { status: 400 })
    }

    const admin = await createAdminClient() as unknown as SupabaseDataClient
    const { data: incident, error: incidentError } = await admin
      .from('incidents')
      .select('id, status, intake_state')
      .eq('id', id)
      .eq('reporter_id', auth.profile.user_id)
      .maybeSingle<Record<string, unknown>>()

    if (incidentError) throw new Error(incidentError.message ?? 'Unable to load SOS incident.')
    if (!incident || incident.intake_state !== 'incoming') {
      return NextResponse.json({ message: 'Incoming SOS incident not found.' }, { status: 404 })
    }

    const { data: emergencyType, error: typeError } = await admin
      .from('emergency_types')
      .select('id, name, icon, color, organization_id')
      .eq('id', typeId)
      .maybeSingle<EmergencyTypeRow>()

    if (typeError || !emergencyType || !isEmergencyTypeAvailableToOrganization(emergencyType.organization_id, auth.profile.organization_id)) {
      return NextResponse.json({ message: 'That emergency type is not available to your municipality.' }, { status: 400 })
    }

    const hazards = normalizeHazards(body?.hazards)
    const description = clean(body?.description)
    const severity = calculateSeverity({
      emergencyType: mapEmergencyTypeToSeverityKey(emergencyType.id, emergencyType.name),
      hazards: hazards.severityHazards,
      affectedCount,
      description,
    })
    const now = new Date().toISOString()

    const { data: updatedIncident, error: updateError } = await admin
      .from('incidents')
      .update({
        emergency_type_id: emergencyType.id,
        description,
        affected_count: affectedCount,
        has_unconscious: hazards.has_unconscious,
        has_fire: hazards.has_fire,
        has_flooding: hazards.has_flooding,
        has_violence: hazards.has_violence,
        reporter_role: reporterRole,
        intake_state: 'details_received',
        severity: severity.level,
        updated_at: now,
      })
      .eq('id', id)
      .select('*')
      .single<Record<string, unknown>>()

    if (updateError || !updatedIncident) {
      throw new Error(updateError?.message ?? 'Unable to save SOS details.')
    }

    const reportMetadata = getTestReportMetadata(auth.access)
    const { error: historyError } = await admin
      .from('incident_status_history')
      .insert({
        incident_id: id,
        previous_status: incident.status,
        new_status: incident.status,
        changed_by: selectHistoryActorId(auth.profile),
        changed_by_name: auth.profile.full_name,
        changed_by_role: reportMetadata.changed_by_role,
        reason: 'Resident added SOS details.',
        metadata: {
          intake_state: 'details_received',
          reporter_role: reporterRole,
          severity_score: severity.score,
          severity_factors: severity.factors,
          hazards: hazards.values,
        },
      })

    if (historyError) throw new Error(historyError.message ?? 'Unable to record SOS details.')

    return NextResponse.json({
      incident: attachEmergencyTypes([updatedIncident], [emergencyType])[0],
    })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to save SOS details.' },
      { status: 500 }
    )
  }
}
