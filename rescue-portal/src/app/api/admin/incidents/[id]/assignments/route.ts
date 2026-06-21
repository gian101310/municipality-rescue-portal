import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const client = await createClient(); const { data: { user } } = await client.auth.getUser(); if (!user) return NextResponse.json({ message: 'Please sign in first.' }, { status: 401 })
  const { data: profile } = await client.from('user_profiles').select('id, role, full_name, organization_id, is_active, registration_status').eq('user_id', user.id).single() as any
  if (!profile?.is_active || !['super_admin','admin','dispatcher'].includes(profile.role)) return NextResponse.json({ message: 'Assignment access required.' }, { status: 403 })
  const { id } = await context.params; const { rescueUnitId } = await request.json(); if (!String(rescueUnitId ?? '').trim()) return NextResponse.json({ message: 'Choose a rescue team.' }, { status: 400 })
  const admin = await createAdminClient() as any; const [{ data: incident }, { data: team }] = await Promise.all([admin.from('incidents').select('*').eq('id', id).single(), admin.from('rescue_units').select('*').eq('id', rescueUnitId).single()])
  if (!incident || !team || incident.organization_id !== team.organization_id || (profile.role !== 'super_admin' && incident.organization_id !== profile.organization_id)) return NextResponse.json({ message: 'Incident or rescue team not found.' }, { status: 404 })
  const now = new Date().toISOString(); const { data, error } = await admin.from('incidents').update({ assigned_unit_id: team.id, status: 'assigned', updated_at: now }).eq('id', id).select('*').single(); if (error) return NextResponse.json({ message: error.message }, { status: 500 })
  await admin.from('rescue_units').update({ status: 'assigned', updated_at: now }).eq('id', team.id)
  await admin.from('incident_assignments').insert({ incident_id: id, rescue_unit_id: team.id, rescue_unit_name: team.name, assigned_by: profile.id, assigned_by_name: profile.full_name, status: 'assigned', assigned_at: now })
  await admin.from('incident_status_history').insert({ incident_id: id, previous_status: incident.status, new_status: 'assigned', changed_by: profile.id, changed_by_name: profile.full_name, changed_by_role: profile.role, reason: `Assigned to ${team.name}`, created_at: now })
  return NextResponse.json({ incident: data, team })
}
