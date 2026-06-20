import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { calculateSeverity } from '@/lib/severity-scoring'
import {
  buildIncidentReference,
  mapEmergencyTypeToSeverityKey,
  validateIncidentSubmission,
} from '@/lib/incident-submission'
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
  order(column: string, options?: { ascending?: boolean }): SupabaseQueryBuilder
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
  email: string
  phone: string | null
  organization_id: string
  municipality_id: string | null
  is_active: boolean
  registration_status: RegistrationStatus | null
  address: string | null
  barangay: string | null
  municipality: string | null
  province: string | null
}

type EmergencyTypeRow = {
  id: string
  name: string
  icon: string
  color: string
  organization_id: string | null
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

async function findOrCreateEmergencyType(
  admin: SupabaseDataClient,
  organizationId: string,
  body: Record<string, unknown>
) {
  const typeId = clean(body.emergency_type_id)
  const typeName = clean(body.emergency_type_name)

  if (typeId) {
    const { data: typeById, error: typeByIdError } = await admin
      .from('emergency_types')
      .select('id, name, icon, color, organization_id')
      .eq('id', typeId)
      .maybeSingle<EmergencyTypeRow>()

    if (typeByIdError) throw new Error(typeByIdError.message ?? 'Unable to check emergency type.')
    if (typeById && isEmergencyTypeAvailableToOrganization(typeById.organization_id, organizationId)) return typeById
    if (typeById) throw new Error('That emergency type is not available to your municipality.')
  }

  if (typeName) {
    const { data: typeByName, error: typeByNameError } = await admin
      .from('emergency_types')
      .select('id, name, icon, color, organization_id')
      .eq('name', typeName)
      .maybeSingle<EmergencyTypeRow>()

    if (typeByNameError) throw new Error(typeByNameError.message ?? 'Unable to check emergency type.')
    if (typeByName && isEmergencyTypeAvailableToOrganization(typeByName.organization_id, organizationId)) return typeByName
  }

  const { data: createdType, error: createTypeError } = await admin
    .from('emergency_types')
    .insert({
      name: typeName || 'Other',
      icon: clean(body.emergency_type_icon) || 'AlertTriangle',
      color: clean(body.emergency_type_color) || '#6b7280',
      description: clean(body.emergency_type_description) || 'Resident submitted emergency type.',
      triage_questions: [],
      is_active: true,
      sort_order: 100,
      organization_id: organizationId,
    })
    .select('id, name, icon, color, organization_id')
    .single<EmergencyTypeRow>()

  if (createTypeError || !createdType) {
    throw new Error(createTypeError?.message ?? 'Unable to create emergency type.')
  }

  return createdType
}

export async function GET(request: Request) {
  const auth = await requireApprovedResident(request)
  if ('error' in auth) return auth.error

  try {
    const admin = await createAdminClient() as unknown as SupabaseDataClient
    const { data, error } = await admin
      .from('incidents')
      .select('*')
      .eq('reporter_id', auth.profile.user_id)
      .order('created_at', { ascending: false }) as QueryResult<Record<string, unknown>[]>

    if (error) throw new Error(error.message ?? 'Unable to load incidents.')

    const { data: emergencyTypes } = await admin
      .from('emergency_types')
      .select('id, name, icon, color') as QueryResult<EmergencyTypeRow[]>

    return NextResponse.json({
      incidents: attachEmergencyTypes(data ?? [], emergencyTypes ?? []),
    })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to load incidents.' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const auth = await requireApprovedResident(request)
  if ('error' in auth) return auth.error

  try {
    const body = await request.json()
    const typeId = clean(body?.emergency_type_id)
    const typeName = clean(body?.emergency_type_name)
    const description = clean(body?.description)
    const affectedCount = Math.max(0, Number(body?.affected_count ?? 1) || 0)
    const latitude = Number(body?.latitude)
    const longitude = Number(body?.longitude)

    const validation = validateIncidentSubmission({
      emergency_type_id: typeId,
      emergency_type_name: typeName,
      description,
      affected_count: affectedCount,
      latitude,
      longitude,
    })

    if (!validation.ok) {
      return NextResponse.json({ message: validation.message }, { status: 400 })
    }

    const admin = await createAdminClient() as unknown as SupabaseDataClient
    const emergencyType = await findOrCreateEmergencyType(admin, auth.profile.organization_id, body as Record<string, unknown>)
    const hazards = normalizeHazards(body?.hazards)
    const reportMetadata = getTestReportMetadata(auth.access)
    const severity = calculateSeverity({
      emergencyType: mapEmergencyTypeToSeverityKey(typeId, typeName),
      hazards: hazards.severityHazards,
      affectedCount,
      description,
    })
    const now = new Date()
    const referenceNumber = buildIncidentReference(now, Number(String(now.getTime()).slice(-6)))
    const incidentPayload: Record<string, unknown> = {
      reference_number: referenceNumber,
      organization_id: auth.profile.organization_id,
      reporter_id: auth.profile.user_id,
      reporter_name: auth.profile.full_name,
      reporter_phone: auth.profile.phone,
      emergency_type_id: emergencyType.id,
      severity: severity.level,
      status: 'submitted',
      description,
      affected_count: affectedCount,
      has_unconscious: hazards.has_unconscious,
      has_fire: hazards.has_fire,
      has_flooding: hazards.has_flooding,
      has_violence: hazards.has_violence,
      latitude,
      longitude,
      gps_accuracy: Number.isFinite(Number(body?.gps_accuracy)) ? Number(body?.gps_accuracy) : null,
      address: clean(body?.address) || auth.profile.address || null,
      barangay: clean(body?.barangay) || auth.profile.barangay || null,
      municipality: auth.profile.municipality,
      is_anonymous: false,
      is_drill: reportMetadata.is_drill,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    }

    const { data: incident, error: incidentError } = await admin
      .from('incidents')
      .insert(incidentPayload)
      .select('*')
      .single<Record<string, unknown>>()

    if (incidentError || !incident) {
      throw new Error(incidentError?.message ?? 'Unable to submit emergency report.')
    }

    await admin
      .from('incident_status_history')
      .insert({
        incident_id: incident.id,
        previous_status: null,
        new_status: 'submitted',
        changed_by: auth.profile.user_id,
        changed_by_name: auth.profile.full_name,
        changed_by_role: reportMetadata.changed_by_role,
        reason: auth.access.ownerTestMode
          ? 'Super Admin submitted an Owner Test Mode emergency report.'
          : 'Resident submitted emergency report.',
        metadata: {
          severity_score: severity.score,
          severity_factors: severity.factors,
          hazards: hazards.values,
        },
      })

    return NextResponse.json({
      incident: attachEmergencyTypes([incident], [emergencyType])[0],
      referenceNumber,
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to submit emergency report.' },
      { status: 500 }
    )
  }
}
