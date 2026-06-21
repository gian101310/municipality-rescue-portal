import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

async function profile() {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return null
  const { data } = await client.from('user_profiles').select('role, organization_id, is_active').eq('user_id', user.id).single() as any
  return data
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const staff = await profile()
  if (!staff?.is_active || !['admin', 'super_admin'].includes(staff.role)) {
    return NextResponse.json({ message: 'Admin access required.' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (body.name !== undefined) {
    const name = String(body.name).trim()
    if (!name) return NextResponse.json({ message: 'Barangay name is required.' }, { status: 400 })
    updates.name = name
  }
  if (body.captain_name !== undefined) updates.captain_name = String(body.captain_name).trim() || null
  if (body.captain_phone !== undefined) updates.captain_phone = String(body.captain_phone).trim() || null
  if (body.is_active !== undefined) updates.is_active = Boolean(body.is_active)

  const admin = await createAdminClient() as any
  const { data, error } = await admin
    .from('barangays')
    .update(updates)
    .eq('id', id)
    .eq('organization_id', staff.organization_id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ message: error.message }, { status: 400 })
  return NextResponse.json({ barangay: data })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const staff = await profile()
  if (!staff?.is_active || !['admin', 'super_admin'].includes(staff.role)) {
    return NextResponse.json({ message: 'Admin access required.' }, { status: 403 })
  }

  const { id } = await params
  const admin = await createAdminClient() as any
  const { error } = await admin
    .from('barangays')
    .delete()
    .eq('id', id)
    .eq('organization_id', staff.organization_id)

  if (error) return NextResponse.json({ message: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
