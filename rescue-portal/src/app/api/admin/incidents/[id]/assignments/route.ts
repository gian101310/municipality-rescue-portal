import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

type AssignmentRpc = (
  functionName: 'assign_incident_team',
  args: { p_incident_id: string; p_rescue_unit_id: string; p_actor_profile_id: string }
) => PromiseLike<{
  data: Record<string, unknown> | null
  error: { message: string } | null
}>

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) {
    return NextResponse.json({ message: 'Please sign in first.' }, { status: 401 })
  }

  const { data: rawProfile } = await client
    .from('user_profiles')
    .select('id, role, organization_id, is_active, registration_status')
    .eq('user_id', user.id)
    .single()
  const profile = rawProfile as null | {
    id: string
    role: string
    organization_id: string | null
    is_active: boolean
    registration_status: string
  }

  const hasAssignmentRole = ['super_admin', 'admin', 'dispatcher', 'staff'].includes(profile?.role ?? '')
  const needsApproval = profile?.role !== 'super_admin' && profile?.registration_status !== 'approved'
  if (!profile?.is_active || !hasAssignmentRole || needsApproval) {
    return NextResponse.json({ message: 'Assignment access required.' }, { status: 403 })
  }

  const { id } = await context.params
  const body = await request.json() as { rescueUnitId?: unknown }
  const rescueUnitId = String(body.rescueUnitId ?? '').trim()
  if (!String(rescueUnitId ?? '').trim()) {
    return NextResponse.json({ message: 'Choose a rescue team.' }, { status: 400 })
  }

  const admin = await createAdminClient()
  const assignmentAdmin = admin as unknown as { rpc: AssignmentRpc }
  const { data, error } = await assignmentAdmin.rpc('assign_incident_team', {
    p_incident_id: id,
    p_rescue_unit_id: rescueUnitId,
    p_actor_profile_id: profile.id,
  })

  if (error) {
    const message = error.message || 'Unable to assign the rescue team.'
    const status = /not found/i.test(message) ? 404 : /already assigned/i.test(message) ? 409 : 500
    return NextResponse.json({ message }, { status })
  }

  return NextResponse.json(data)
}
