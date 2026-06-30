import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { createTrustedToken, hashTrustedToken, trustedSessionExpiry } from '@/lib/trusted-session-server'

export const dynamic = 'force-dynamic'

type ResidentProfile = {
  id: string
  full_name: string
  role: string
  organization_id: string
  is_active: boolean
  registration_status: string | null
}

async function approvedResident() {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return null
  const { data } = await client
    .from('user_profiles')
    .select('id, full_name, role, organization_id, is_active, registration_status')
    .eq('user_id', user.id)
    .single()
  const profile = data as ResidentProfile | null
  if (!profile?.is_active || profile.role !== 'resident' || profile.registration_status !== 'approved') return null
  return { user, profile }
}

export async function POST(request: Request) {
  const resident = await approvedResident()
  if (!resident) return NextResponse.json({ message: 'Approved resident access required.' }, { status: 403 })
  const body = await request.json().catch(() => ({}))
  const token = createTrustedToken()
  const expiresAt = trustedSessionExpiry()
  // The generated schema intentionally keeps legacy tables as Record<string, unknown>.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = await createAdminClient() as any

  await admin.from('trusted_sessions').update({ is_revoked: true, revoked_reason: 'expired' })
    .eq('user_id', resident.user.id).eq('is_revoked', false).lte('expires_at', new Date().toISOString())

  const { data: active } = await admin.from('trusted_sessions')
    .select('id').eq('user_id', resident.user.id).eq('is_revoked', false)
    .gt('expires_at', new Date().toISOString()).order('created_at', { ascending: true })
  if ((active?.length ?? 0) >= 10) {
    await admin.from('trusted_sessions').update({ is_revoked: true, revoked_reason: 'device_limit' }).eq('id', active[0].id)
  }

  const forwarded = request.headers.get('x-forwarded-for')
  const { error } = await admin.from('trusted_sessions').insert({
    user_id: resident.user.id,
    session_token: null,
    token_hash: hashTrustedToken(token),
    device_name: String(body.deviceName ?? 'Web Browser').slice(0, 100),
    platform: String(body.platform ?? 'web').slice(0, 30),
    ip_address: forwarded?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip'),
    user_agent: request.headers.get('user-agent')?.slice(0, 500) ?? null,
    expires_at: expiresAt.toISOString(),
    last_refreshed_at: new Date().toISOString(),
  })
  if (error) return NextResponse.json({ message: 'Unable to trust this device.' }, { status: 500 })

  return NextResponse.json({ token, userId: resident.user.id, expiresAt: expiresAt.toISOString() }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}

export async function GET() {
  const resident = await approvedResident()
  if (!resident) return NextResponse.json({ message: 'Approved resident access required.' }, { status: 403 })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = await createAdminClient() as any
  const { data, error } = await admin.from('trusted_sessions')
    .select('id, device_name, platform, last_refreshed_at, expires_at, created_at')
    .eq('user_id', resident.user.id).eq('is_revoked', false)
    .gt('expires_at', new Date().toISOString()).order('last_refreshed_at', { ascending: false })
  if (error) return NextResponse.json({ message: 'Unable to load trusted devices.' }, { status: 500 })
  return NextResponse.json({ sessions: data ?? [] })
}

export async function DELETE(request: Request) {
  const resident = await approvedResident()
  if (!resident) return NextResponse.json({ message: 'Approved resident access required.' }, { status: 403 })
  const body = await request.json().catch(() => ({}))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = await createAdminClient() as any
  let query = admin.from('trusted_sessions').update({ is_revoked: true, revoked_reason: body.all ? 'revoke_all' : 'user_revoked' })
    .eq('user_id', resident.user.id).eq('is_revoked', false)
  if (!body.all) {
    const sessionId = String(body.sessionId ?? '')
    if (!sessionId) return NextResponse.json({ message: 'Session id is required.' }, { status: 400 })
    query = query.eq('id', sessionId)
  }
  const { error } = await query
  if (error) return NextResponse.json({ message: 'Unable to revoke trusted device.' }, { status: 500 })
  return NextResponse.json({ success: true })
}
