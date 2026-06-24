import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { attachEmergencyTypes } from '@/lib/incident-presentation'
import { selectHistoryActorId } from '@/lib/incident-submission'
import type { IncidentStatus, RegistrationStatus, UserRole } from '@/lib/types'

export const dynamic = 'force-dynamic'

type QueryResult<T> = {
  data: T | null
  error: { message?: string } | null
}

type SupabaseQueryBuilder = PromiseLike<QueryResult<unknown>> & {
  select(columns: string): SupabaseQueryBuilder
  eq(column: string, value: unknown): SupabaseQueryBuilder
  insert(values: Record<string, unknown> | Record<string, unknown>[]): SupabaseQueryBuilder
  update(values: Record<string, unknown>): SupabaseQueryBuilder
  single<T = Record<string, unknown>>(): Promise<QueryResult<T>>
}

type SupabaseDataClient = {
  from(table: string): SupabaseQueryBuilder
}

type StaffProfile = {
  id: string
  user_id: string
  role: UserRole
  full_name: string
  organization_id: string
  is_active: boolean
  registration_status: RegistrationStatus | null
}

type IncidentRow = {
  id: string
  organization_id: string
  emergency_type_id: string
  status: IncidentStatus
}

type EmergencyTypeRow = {
  id: string
  name: string
  icon: string
  color: string
  description: string | null
}

const incidentUpdateRoles: UserRole[] = ['super_admin', 'admin', 'dispatcher', 'team_leader', 'responder', 'verifier', 'staff']
const allowedStatuses: IncidentStatus[] = [
  'received',
  'verification_pending',
  'verified',
  'assigned',
  'accepted',
  'preparing',
  'dispatched',
  'on_the_way',
  'arrived',
  'operation_in_progress',
  'transporting',
  'resolved',
  'closed',
  'duplicate',
  'invalid',
  'false_alert',
  'cancelled',
  'unable_to_contact',
  'transferred',
]

async function requireIncidentUpdater() {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: NextResponse.json({ message: 'Please sign in first.' }, { status: 401 }) }
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, user_id, role, full_name, organization_id, is_active, registration_status')
    .eq('user_id', user.id)
    .single() as QueryResult<StaffProfile>

  if (
    profileError ||
    !profile ||
    !profile.is_active ||
    !incidentUpdateRoles.includes(profile.role) ||
    (profile.registration_status && profile.registration_status !== 'approved')
  ) {
    return { error: NextResponse.json({ message: 'Incident update access required.' }, { status: 403 }) }
  }

  return { profile }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireIncidentUpdater()
  if ('error' in auth) return auth.error

  try {
    const { id } = await context.params
    const body = await request.json()
    const status = String(body?.status ?? '') as IncidentStatus
    const reason = String(body?.reason ?? '').trim()

    if (!allowedStatuses.includes(status)) {
      return NextResponse.json({ message: 'Choose a valid incident status.' }, { status: 400 })
    }

    const admin = await createAdminClient() as unknown as SupabaseDataClient
    const { data: existingIncident, error: existingError } = await admin
      .from('incidents')
      .select('id, organization_id, emergency_type_id, status')
      .eq('id', id)
      .single<IncidentRow>()

    if (existingError || !existingIncident) {
      return NextResponse.json({ message: 'Incident not found.' }, { status: 404 })
    }

    if (auth.profile.role !== 'super_admin' && existingIncident.organization_id !== auth.profile.organization_id) {
      return NextResponse.json({ message: 'Incident belongs to another organization.' }, { status: 403 })
    }

    const now = new Date().toISOString()
    const updatePayload: Record<string, unknown> = {
      status,
      updated_at: now,
    }

    if (status === 'verified') updatePayload.verified_at = now
    if (status === 'dispatched' || status === 'on_the_way') updatePayload.dispatched_at = now
    if (status === 'arrived') updatePayload.arrived_at = now
    if (status === 'resolved') updatePayload.resolved_at = now
    if (status === 'closed') updatePayload.closed_at = now
    if (status === 'cancelled' || status === 'false_alert') updatePayload.cancelled_at = now

    const { data: updatedIncident, error: updateError } = await admin
      .from('incidents')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single<Record<string, unknown>>()

    if (updateError || !updatedIncident) {
      throw new Error(updateError?.message ?? 'Unable to update incident.')
    }

    await admin
      .from('incident_status_history')
      .insert({
        incident_id: id,
        previous_status: existingIncident.status,
        new_status: status,
        changed_by: selectHistoryActorId(auth.profile),
        changed_by_name: auth.profile.full_name,
        changed_by_role: auth.profile.role,
        reason: reason || null,
        metadata: null,
        created_at: now,
      })

    // Release the assigned rescue team back to "available" when the incident reaches a terminal state
    const terminalStatuses: IncidentStatus[] = ['resolved', 'closed', 'false_alert', 'cancelled', 'duplicate', 'invalid', 'unable_to_contact', 'transferred']
    if (terminalStatuses.includes(status) && updatedIncident.assigned_unit_id) {
      await admin
        .from('rescue_units')
        .update({ status: 'available', updated_at: now })
        .eq('id', updatedIncident.assigned_unit_id as string)
    }

    const { data: emergencyTypes } = await admin
      .from('emergency_types')
      .select('id, name, icon, color, description') as QueryResult<EmergencyTypeRow[]>

    return NextResponse.json({
      incident: attachEmergencyTypes([updatedIncident], emergencyTypes ?? [])[0],
    })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to update incident.' },
      { status: 500 }
    )
  }
}
