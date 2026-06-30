import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

const noteRoles = ['super_admin', 'admin', 'dispatcher', 'team_leader', 'responder', 'verifier', 'staff']

async function authorizeIncident(id: string) {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return { error: NextResponse.json({ message: 'Please sign in first.' }, { status: 401 }) }

  const { data: profile } = await client
    .from('user_profiles')
    .select('id, role, full_name, organization_id, is_active, registration_status')
    .eq('user_id', user.id)
    .single() as any

  if (!profile?.is_active || !noteRoles.includes(profile.role) || (profile.role !== 'super_admin' && profile.registration_status !== 'approved')) {
    return { error: NextResponse.json({ message: 'Incident note access required.' }, { status: 403 }) }
  }

  const admin = await createAdminClient() as any
  const { data: incident } = await admin.from('incidents').select('id, organization_id').eq('id', id).single()
  if (!incident || (profile.role !== 'super_admin' && incident.organization_id !== profile.organization_id)) {
    return { error: NextResponse.json({ message: 'Incident not found.' }, { status: 404 }) }
  }

  return { admin, incident, profile }
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const auth = await authorizeIncident(id)
  if ('error' in auth) return auth.error

  const { data, error } = await auth.admin
    .from('incident_notes')
    .select('id, note, user_name, user_role, created_at')
    .eq('incident_id', id)
    .eq('is_internal', true)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ message: error.message }, { status: 500 })
  return NextResponse.json({ notes: data ?? [] })
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const auth = await authorizeIncident(id)
  if ('error' in auth) return auth.error

  const body = await request.json().catch(() => ({}))
  const note = String(body.note ?? '').trim()
  if (!note) return NextResponse.json({ message: 'Note is required.' }, { status: 400 })
  if (note.length > 2000) return NextResponse.json({ message: 'Note must be 2,000 characters or fewer.' }, { status: 400 })

  const { data, error } = await auth.admin.from('incident_notes').insert({
    incident_id: id,
    user_id: auth.profile.id,
    user_name: auth.profile.full_name,
    user_role: auth.profile.role,
    note,
    is_internal: true,
  }).select('id, note, user_name, user_role, created_at').single()

  if (error) return NextResponse.json({ message: error.message }, { status: 500 })

  await auth.admin.from('audit_logs').insert({
    actor_id: auth.profile.id,
    actor_name: auth.profile.full_name,
    actor_role: auth.profile.role,
    action: 'create',
    entity_type: 'incident_note',
    entity_id: data.id,
    new_values: { incident_id: id, is_internal: true },
    organization_id: auth.incident.organization_id,
  })

  return NextResponse.json({ note: data }, { status: 201 })
}
