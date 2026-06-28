import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { attachEmergencyTypes } from '@/lib/incident-presentation'
import type { IncidentStatus, RegistrationStatus, UserRole } from '@/lib/types'

export const dynamic = 'force-dynamic'

type QueryResult<T> = {
  data: T | null
  error: { message?: string } | null
}

type SupabaseQueryBuilder = PromiseLike<QueryResult<unknown>> & {
  select(columns: string): SupabaseQueryBuilder
  eq(column: string, value: unknown): SupabaseQueryBuilder
  in(column: string, values: unknown[]): SupabaseQueryBuilder
  order(column: string, options?: { ascending?: boolean }): SupabaseQueryBuilder
}

type SupabaseDataClient = {
  from(table: string): SupabaseQueryBuilder
}

type StaffProfile = {
  id: string
  user_id: string
  role: UserRole
  organization_id: string
  is_active: boolean
  registration_status: RegistrationStatus | null
}

type EmergencyTypeRow = {
  id: string
  name: string
  icon: string
  color: string
  description: string | null
}

const incidentReadRoles: UserRole[] = ['super_admin', 'admin', 'dispatcher', 'team_leader', 'responder', 'verifier', 'staff']
const incidentStatuses = new Set<IncidentStatus>([
  'submitted', 'received', 'verification_pending', 'verified', 'assigned', 'accepted',
  'preparing', 'dispatched', 'on_the_way', 'arrived', 'operation_in_progress',
  'transporting', 'resolved', 'closed', 'duplicate', 'invalid', 'false_alert',
  'cancelled', 'unable_to_contact', 'transferred',
])

async function requireIncidentReader() {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: NextResponse.json({ message: 'Please sign in first.' }, { status: 401 }) }
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, user_id, role, organization_id, is_active, registration_status')
    .eq('user_id', user.id)
    .single() as QueryResult<StaffProfile>

  if (
    profileError ||
    !profile ||
    !profile.is_active ||
    !incidentReadRoles.includes(profile.role) ||
    (profile.registration_status && profile.registration_status !== 'approved')
  ) {
    return { error: NextResponse.json({ message: 'Incident access required.' }, { status: 403 }) }
  }

  return { profile }
}

export async function GET(request: NextRequest) {
  const auth = await requireIncidentReader()
  if ('error' in auth) return auth.error

  try {
    const admin = await createAdminClient() as unknown as SupabaseDataClient
    let query = admin
      .from('incidents')
      .select('*')
      .order('created_at', { ascending: false })

    if (auth.profile.role !== 'super_admin') {
      query = query.eq('organization_id', auth.profile.organization_id)
    }

    const statusParam = request.nextUrl.searchParams.get('status')
    if (statusParam) {
      const statuses = statusParam
        .split(',')
        .filter((status): status is IncidentStatus => incidentStatuses.has(status as IncidentStatus))
      if (!statuses.length) {
        return NextResponse.json({ message: 'No valid incident statuses supplied.' }, { status: 400 })
      }
      query = query.in('status', statuses)
    }

    const { data: incidents, error: incidentError } = await query as QueryResult<Record<string, unknown>[]>

    if (incidentError) throw new Error(incidentError.message ?? 'Unable to load incidents.')

    const { data: emergencyTypes } = await admin
      .from('emergency_types')
      .select('id, name, icon, color, description') as QueryResult<EmergencyTypeRow[]>

    return NextResponse.json({
      incidents: attachEmergencyTypes(incidents ?? [], emergencyTypes ?? []),
    })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to load incidents.' },
      { status: 500 }
    )
  }
}
