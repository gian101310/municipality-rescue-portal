import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const client = await createClient(); const { data: { user } } = await client.auth.getUser(); if (!user) return NextResponse.json({ message: 'Please sign in first.' }, { status: 401 })
  const { data: profile } = await client.from('user_profiles').select('id, role, full_name, organization_id, is_active, registration_status').eq('user_id', user.id).single() as any
  if (!profile?.is_active || !['super_admin','admin','dispatcher','verifier','staff'].includes(profile.role)) return NextResponse.json({ message: 'Incident update access required.' }, { status: 403 })
  const { id } = await context.params; const { reason } = await request.json(); if (!String(reason ?? '').trim()) return NextResponse.json({ message: 'Escalation reason is required.' }, { status: 400 })
  const admin = await createAdminClient() as any; const { data: incident } = await admin.from('incidents').select('*').eq('id', id).single(); if (!incident || (profile.role !== 'super_admin' && incident.organization_id !== profile.organization_id)) return NextResponse.json({ message: 'Incident not found.' }, { status: 404 })
  const now = new Date().toISOString(); const { data, error } = await admin.from('incidents').update({ severity: 'critical', updated_at: now }).eq('id', id).select('*').single(); if (error) return NextResponse.json({ message: error.message }, { status: 500 })
  await admin.from('incident_status_history').insert({ incident_id: id, previous_status: incident.status, new_status: incident.status, changed_by: profile.id, changed_by_name: profile.full_name, changed_by_role: profile.role, reason: `Escalated to critical: ${String(reason).trim()}`, created_at: now })
  return NextResponse.json({ incident: data })
}
