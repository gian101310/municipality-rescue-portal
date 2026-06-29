import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

async function notificationProfile() {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return null
  const { data } = await client.from('user_profiles').select('id, is_active').eq('user_id', user.id).single()
  return data as null | { id: string; is_active: boolean }
}

export async function GET() {
  const profile = await notificationProfile()
  if (!profile?.is_active) return NextResponse.json({ message: 'Please sign in first.' }, { status: 401 })

  const admin = await createAdminClient()
  const { data, error } = await admin
    .from('notifications')
    .select('*')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) return NextResponse.json({ message: error.message }, { status: 500 })
  return NextResponse.json({ notifications: data ?? [] })
}

export async function PATCH(request: Request) {
  const profile = await notificationProfile()
  if (!profile?.is_active) return NextResponse.json({ message: 'Please sign in first.' }, { status: 401 })

  const body = await request.json() as { id?: unknown; all?: unknown }
  const admin = await createAdminClient()
  let query = admin.from('notifications').update({ is_read: true, read_at: new Date().toISOString() } as never).eq('user_id', profile.id)
  if (body.all !== true) {
    const id = String(body.id ?? '').trim()
    if (!id) return NextResponse.json({ message: 'Notification ID is required.' }, { status: 400 })
    query = query.eq('id', id)
  }
  const { error } = await query
  if (error) return NextResponse.json({ message: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
