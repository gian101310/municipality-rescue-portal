import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import {
  buildIncidentReference,
  buildIncomingSosPayload,
  selectHistoryActorId,
  validateIncomingSosLocation,
} from '@/lib/incident-submission'
import { attachEmergencyTypes } from '@/lib/incident-presentation'
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
  phone: string | null
  organization_id: string
  is_active: boolean
  registration_status: RegistrationStatus | null
  address: string | null
  barangay: string | null
  municipality: string | null
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

export async function POST(request: Request) {
  const auth = await requireApprovedResident(request)
  if ('error' in auth) return auth.error

  try {
    const body = await request.json()
    const latitude = Number(body?.latitude)
    const longitude = Number(body?.longitude)
    const gpsAccuracy = Number.isFinite(Number(body?.gps_accuracy)) ? Number(body.gps_accuracy) : null
    const validation = validateIncomingSosLocation({ latitude, longitude })

    if (!validation.ok) {
      return NextResponse.json({ message: validation.message }, { status: 400 })
    }

    const admin = await createAdminClient() as unknown as SupabaseDataClient
    const { data: emergencyType, error: typeError } = await admin
      .from('emergency_types')
      .select('id, name, icon, color, organization_id')
      .eq('name', 'Emergency SOS')
      .maybeSingle<EmergencyTypeRow>()

    if (typeError || !emergencyType || emergencyType.organization_id !== null) {
      throw new Error(typeError?.message ?? 'Emergency SOS type is unavailable.')
    }

    const now = new Date()
    const referenceNumber = buildIncidentReference(now, Number(String(now.getTime()).slice(-6)))
    const reportMetadata = getTestReportMetadata(auth.access)
    const payload = buildIncomingSosPayload(
      { latitude, longitude, gpsAccuracy },
      {
        organizationId: auth.profile.organization_id,
        reporterId: auth.profile.user_id,
        reporterName: auth.profile.full_name,
        reporterPhone: auth.profile.phone,
        emergencyTypeId: emergencyType.id,
        referenceNumber,
        createdAt: now.toISOString(),
      }
    )

    const { data: incident, error: incidentError } = await admin
      .from('incidents')
      .insert({
        ...payload,
        address: auth.profile.address,
        barangay: auth.profile.barangay,
        municipality: auth.profile.municipality,
        is_drill: reportMetadata.is_drill,
      })
      .select('*')
      .single<Record<string, unknown>>()

    if (incidentError || !incident) {
      throw new Error(incidentError?.message ?? 'Unable to send SOS.')
    }

    const { error: locationError } = await admin
      .from('incident_locations')
      .insert({
        incident_id: incident.id,
        latitude,
        longitude,
        accuracy: gpsAccuracy,
        source: 'gps',
      })

    if (locationError) throw new Error(locationError.message ?? 'Unable to store SOS location.')

    const { error: historyError } = await admin
      .from('incident_status_history')
      .insert({
        incident_id: incident.id,
        previous_status: null,
        new_status: 'submitted',
        changed_by: selectHistoryActorId(auth.profile),
        changed_by_name: auth.profile.full_name,
        changed_by_role: reportMetadata.changed_by_role,
        reason: 'Resident sent GPS SOS; details pending.',
        metadata: { intake_state: 'incoming', gps_accuracy: gpsAccuracy },
      })

    if (historyError) throw new Error(historyError.message ?? 'Unable to record SOS handoff.')

    return NextResponse.json({
      incident: attachEmergencyTypes([incident], [emergencyType])[0],
      referenceNumber,
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to send SOS.' },
      { status: 500 }
    )
  }
}
