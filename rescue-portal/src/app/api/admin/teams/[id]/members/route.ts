import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { isValidTeamPosition } from '@/lib/team-members'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const client = await createClient(); const { data: { user } } = await client.auth.getUser(); if (!user) return NextResponse.json({ message: 'Please sign in first.' }, { status: 401 })
  const { data: profile } = await client.from('user_profiles').select('role, organization_id, is_active, registration_status').eq('user_id', user.id).single() as any
  if (!profile?.is_active || !['super_admin', 'admin', 'dispatcher', 'staff'].includes(profile.role)) return NextResponse.json({ message: 'Team management access required.' }, { status: 403 })
  const { id } = await context.params; const body = await request.json(); if (!body.userId || !isValidTeamPosition(String(body.position))) return NextResponse.json({ message: 'Choose a staff member and valid position.' }, { status: 400 })
  const admin = await createAdminClient() as any; const { data: team } = await admin.from('rescue_units').select('organization_id').eq('id', id).single(); if (!team || (profile.role !== 'super_admin' && team.organization_id !== profile.organization_id)) return NextResponse.json({ message: 'Team not found.' }, { status: 404 })
  const { data: member } = await admin.from('user_profiles').select('id, full_name, organization_id').eq('id', body.userId).single(); if (!member || member.organization_id !== team.organization_id) return NextResponse.json({ message: 'Staff member not found.' }, { status: 404 })
  const { data, error } = await admin.from('rescue_unit_members').upsert({ unit_id: id, user_id: member.id, user_name: member.full_name, role: body.position, is_active: true, joined_at: new Date().toISOString(), left_at: null }, { onConflict: 'unit_id,user_id' }).select('*').single()
  if (error) return NextResponse.json({ message: error.message }, { status: 400 })
  await admin.from('rescue_unit_members').update({ is_active: false, left_at: new Date().toISOString() }).eq('user_id', member.id).neq('unit_id', id).eq('is_active', true)
  await admin.from('user_profiles').update({ rescue_unit_id: id }).eq('id', member.id)
  if (body.position === 'team_leader') await admin.from('rescue_units').update({ team_leader_id: member.id, team_leader_name: member.full_name }).eq('id', id)
  return NextResponse.json({ member }, { status: 201 })
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Please sign in first.' }, { status: 401 })
  const { data: profile } = await client.from('user_profiles').select('id, full_name, role, organization_id, is_active, registration_status').eq('user_id', user.id).single() as any
  if (!profile?.is_active || !['super_admin', 'admin', 'dispatcher', 'staff'].includes(profile.role) || (profile.role !== 'super_admin' && profile.registration_status !== 'approved')) return NextResponse.json({ message: 'Team management access required.' }, { status: 403 })
  const { id } = await context.params
  const body = await request.json()
  const memberId = String(body.memberId ?? '').trim()
  if (!memberId) return NextResponse.json({ message: 'Team member is required.' }, { status: 400 })
  const admin = await createAdminClient() as any
  const { data: team } = await admin.from('rescue_units').select('id, organization_id, team_leader_id').eq('id', id).single()
  if (!team || (profile.role !== 'super_admin' && team.organization_id !== profile.organization_id)) return NextResponse.json({ message: 'Team not found.' }, { status: 404 })
  const { data: membership } = await admin.from('rescue_unit_members').select('id, user_id, user_name, role').eq('id', memberId).eq('unit_id', id).eq('is_active', true).maybeSingle()
  if (!membership) return NextResponse.json({ message: 'Active team member not found.' }, { status: 404 })
  const now = new Date().toISOString()
  const { error } = await admin.from('rescue_unit_members').update({ is_active: false, left_at: now }).eq('id', membership.id)
  if (error) return NextResponse.json({ message: error.message }, { status: 500 })
  await admin.from('user_profiles').update({ rescue_unit_id: null }).eq('id', membership.user_id).eq('rescue_unit_id', id)
  if (team.team_leader_id === membership.user_id) await admin.from('rescue_units').update({ team_leader_id: null, team_leader_name: null }).eq('id', id)
  await admin.from('audit_logs').insert({ actor_id: profile.id, actor_name: profile.full_name, actor_role: profile.role, action: 'unassign', entity_type: 'rescue_unit_member', entity_id: membership.id, previous_values: { team_id: id, user_id: membership.user_id, role: membership.role }, organization_id: team.organization_id })
  return NextResponse.json({ success: true })
}
