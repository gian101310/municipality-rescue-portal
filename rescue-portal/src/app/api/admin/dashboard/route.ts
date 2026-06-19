import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { attachEmergencyTypes } from '@/lib/incident-presentation'

export const dynamic = 'force-dynamic'

type QueryResult<T> = {
  data: T | null
  error: { message?: string } | null
}

type SupabaseQueryBuilder = PromiseLike<QueryResult<unknown>> & {
  select(columns: string): SupabaseQueryBuilder
  eq(column: string, value: unknown): SupabaseQueryBuilder
  neq(column: string, value: unknown): SupabaseQueryBuilder
  in(column: string, values: string[]): SupabaseQueryBuilder
  gte(column: string, value: string): SupabaseQueryBuilder
  order(column: string, options?: { ascending?: boolean }): SupabaseQueryBuilder
  limit(count: number): SupabaseQueryBuilder
  single<T = Record<string, unknown>>(): Promise<QueryResult<T>>
}

type SupabaseDataClient = {
  from(table: string): SupabaseQueryBuilder
}

type ProfileRow = {
  id: string
  user_id: string
  full_name: string
  email: string
  role: string
  organization_id: string
  is_active: boolean
  registration_status: string | null
  avatar_url: string | null
}

type EmergencyTypeRow = {
  id: string
  name: string
  icon: string
  color: string
  description: string | null
}

const ACTIVE_STATUSES = [
  'submitted', 'received', 'verification_pending', 'verified',
  'assigned', 'dispatched', 'on_the_way', 'arrived', 'operation_in_progress',
  'transporting',
]

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ message: 'Please sign in first.' }, { status: 401 })
    }

    const admin = await createAdminClient() as unknown as SupabaseDataClient

    // Get current user profile
    const { data: profile, error: profileError } = await admin
      .from('user_profiles')
      .select('id, user_id, full_name, email, role, organization_id, is_active, registration_status, avatar_url')
      .eq('user_id', user.id)
      .single<ProfileRow>()

    if (profileError || !profile) {
      return NextResponse.json({ message: 'Profile not found.' }, { status: 403 })
    }

    if (!['super_admin', 'admin', 'dispatcher', 'team_leader'].includes(profile.role)) {
      return NextResponse.json({ message: 'Admin access required.' }, { status: 403 })
    }

    const orgId = profile.organization_id

    // Fetch all incidents for this organization
    const { data: allIncidents } = await admin
      .from('incidents')
      .select('id, status, severity, created_at, reference_number, reporter_name, reporter_phone, description, latitude, longitude, gps_accuracy, address, barangay, municipality, emergency_type_id, affected_count, has_unconscious, has_fire, has_flooding, has_violence, assigned_unit_id, reporter_id, updated_at, verified_at, dispatched_at, arrived_at, resolved_at, resolution_notes')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false }) as QueryResult<Record<string, unknown>[]>

    const incidents = allIncidents ?? []

    // Compute stats
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

    const activeIncidents = incidents.filter((i) => ACTIVE_STATUSES.includes(String(i.status)))
    const criticalIncidents = activeIncidents.filter((i) => i.severity === 'critical')
    const todayIncidents = incidents.filter((i) => String(i.created_at) >= todayStart)
    const resolvedToday = incidents.filter(
      (i) => (i.status === 'resolved' || i.status === 'closed') && String(i.resolved_at || i.updated_at) >= todayStart
    )

    // Compute avg response time for resolved incidents today
    let avgResponseMinutes = 0
    const resolvedWithTimes = resolvedToday.filter((i) => i.resolved_at && i.created_at)
    if (resolvedWithTimes.length > 0) {
      const totalMs = resolvedWithTimes.reduce((sum, i) => {
        const created = new Date(String(i.created_at)).getTime()
        const resolved = new Date(String(i.resolved_at)).getTime()
        return sum + (resolved - created)
      }, 0)
      avgResponseMinutes = Math.round(totalMs / resolvedWithTimes.length / 60000)
    }

    // Pending registrations count
    const { data: pendingRegs } = await admin
      .from('user_profiles')
      .select('id')
      .eq('organization_id', orgId)
      .eq('role', 'resident')
      .eq('registration_status', 'pending') as QueryResult<{ id: string }[]>

    // Emergency types
    const { data: emergencyTypes } = await admin
      .from('emergency_types')
      .select('id, name, icon, color, description') as QueryResult<EmergencyTypeRow[]>

    const stats = {
      total_incidents_today: todayIncidents.length,
      active_incidents: activeIncidents.length,
      critical_incidents: criticalIncidents.length,
      resolved_today: resolvedToday.length,
      pending_registrations: pendingRegs?.length ?? 0,
      average_response_time_minutes: avgResponseMinutes || null,
      total_incidents: incidents.length,
    }

    return NextResponse.json({
      profile: {
        full_name: profile.full_name,
        email: profile.email,
        role: profile.role,
        avatar_url: profile.avatar_url,
      },
      stats,
      incidents: attachEmergencyTypes(incidents, emergencyTypes ?? []),
      emergencyTypes: emergencyTypes ?? [],
    })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Dashboard load failed.' },
      { status: 500 }
    )
  }
}
