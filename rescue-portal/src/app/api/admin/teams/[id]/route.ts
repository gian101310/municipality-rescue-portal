import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const client = await createClient(); const { data: { user } } = await client.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Please sign in first.' }, { status: 401 })
  const { data: profile } = await client.from('user_profiles').select('role, organization_id, is_active, registration_status').eq('user_id', user.id).single() as any
  if (!profile?.is_active || !['super_admin', 'admin', 'dispatcher', 'staff'].includes(profile.role) || (profile.registration_status && profile.registration_status !== 'approved')) return NextResponse.json({ message: 'Team management access required.' }, { status: 403 })
  const { id } = await context.params; const body = await request.json(); const admin = await createAdminClient() as any
  const { data: existing } = await admin.from('rescue_units').select('organization_id').eq('id', id).single()
  if (!existing || (profile.role !== 'super_admin' && existing.organization_id !== profile.organization_id)) return NextResponse.json({ message: 'Team not found.' }, { status: 404 })
  const allowed = ['name', 'code', 'contact_number', 'status', 'vehicle_info', 'equipment', 'specializations', 'is_active']
  const updates = Object.fromEntries(Object.entries(body).filter(([key]) => allowed.includes(key)))
  const { data, error } = await admin.from('rescue_units').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select('*').single()
  if (error) return NextResponse.json({ message: error.message }, { status: 400 })
  return NextResponse.json({ team: data })
}
