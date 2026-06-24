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

    // Offline SOS fields
    const localSosId = typeof body?.local_sos_id === 'string' ? body.local_sos_id : null
    const createdTimestamp = typeof body?.created_timestamp === 'string' ? body.created_timestamp : null
    const networkStatus = body?.network_status === 'offline' ? 'offline' : 'online'

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

    // Calculate delivery delay and status
    const serverNow = new Date()
    const originalCreatedAt = createdTimestamp ? new Date(createdTimestamp) : serverNow
    const delayMs = serverNow.getTime() - originalCreatedAt.getTime()
    const delayMinutes = Math.max(0, delayMs / 60000)
    let deliveryStatus: 'live' | 'delayed' | 'late_request' = 'live'
    if (delayMinutes > 10) deliveryStatus = 'late_request'
    else if (delayMinutes > 2) deliveryStatus = 'delayed'

    const { data: incident, error: incidentError } = await admin
      .from('incidents')
      .insert({
        ...payload,
        address: auth.profile.address,
        barangay: auth.profile.barangay,
        municipality: auth.profile.municipality,
        is_drill: reportMetadata.is_drill,
        // Offline SOS tracking
        local_sos_id: localSosId,
        network_status_at_creation: networkStatus,
        delivery_status: deliveryStatus,
        delivery_delay_minutes: Math.round(delayMinutes * 100) / 100,
        // Original location (when SOS was first created)
        created_latitude: latitude,
        created_longitude: longitude,
        created_accuracy: gpsAccuracy,
        created_timestamp: originalCreatedAt.toISOString(),
        // Sent location (current GPS at time of submission)
        sent_latitude: latitude,
        sent_longitude: longitude,
        sent_accuracy: gpsAccuracy,
        sent_timestamp: serverNow.toISOString(),
        // Priority
        priority: 'critical',
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

    // Insert timeline events
    const timelineEvents = [
      {
        incident_id: incident.id,
        event_type: 'sos_created',
        label: 'SOS Created',
        description: `Emergency SOS sent by ${auth.profile.full_name}`,
        actor_id: auth.profile.user_id,
        actor_name: auth.profile.full_name,
        actor_role: 'resident',
        metadata: { gps_accuracy: gpsAccuracy, network_status: networkStatus },
        occurred_at: originalCreatedAt.toISOString(),
      },
      {
        incident_id: incident.id,
        event_type: 'gps_captured',
        label: 'GPS Location Captured',
        description: `Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        actor_id: auth.profile.user_id,
        actor_name: auth.profile.full_name,
        actor_role: 'resident',
        metadata: { latitude, longitude, accuracy: gpsAccuracy },
        occurred_at: originalCreatedAt.toISOString(),
      },
    ]

    // Add offline-specific events
    if (networkStatus === 'offline') {
      timelineEvents.push({
        incident_id: incident.id as string,
        event_type: 'queued_offline',
        label: 'Queued Offline',
        description: 'SOS was created while device was offline',
        actor_id: auth.profile.user_id,
        actor_name: auth.profile.full_name,
        actor_role: 'resident',
        metadata: { local_sos_id: localSosId },
        occurred_at: originalCreatedAt.toISOString(),
      })
      timelineEvents.push({
        incident_id: incident.id as string,
        event_type: 'sos_synced',
        label: `SOS Synced (${deliveryStatus.replace('_', ' ')})`,
        description: `Delivered after ${Math.round(delayMinutes)} minute${Math.round(delayMinutes) !== 1 ? 's' : ''} delay`,
        actor_id: auth.profile.user_id,
        actor_name: auth.profile.full_name,
        actor_role: 'system',
        metadata: { delay_minutes: delayMinutes, delivery_status: deliveryStatus },
        occurred_at: serverNow.toISOString(),
      })
    }

    await admin.from('incident_timeline').insert(timelineEvents)

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
