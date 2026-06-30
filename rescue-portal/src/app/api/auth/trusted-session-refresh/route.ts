import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createTrustedToken, hashTrustedToken, trustedSessionExpiry } from '@/lib/trusted-session-server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const token = String(body.token ?? '')
    if (token.length < 32 || token.length > 200) return NextResponse.json({ message: 'Invalid or expired session.' }, { status: 401 })

    const tokenHash = hashTrustedToken(token)
    // The generated schema intentionally keeps legacy tables as Record<string, unknown>.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = await createAdminClient() as any
    const { data: session, error: sessionError } = await admin.from('trusted_sessions')
      .select('id, user_id, expires_at, is_revoked')
      .eq('token_hash', tokenHash).eq('is_revoked', false).single()
    if (sessionError || !session || new Date(session.expires_at) <= new Date()) {
      return NextResponse.json({ message: 'Invalid or expired session.' }, { status: 401 })
    }

    const { data: profile } = await admin.from('user_profiles')
      .select('role, is_active, registration_status').eq('user_id', session.user_id).single()
    if (!profile || profile.role !== 'resident' || !profile.is_active || profile.registration_status !== 'approved') {
      await admin.from('trusted_sessions').update({ is_revoked: true, revoked_reason: 'account_ineligible' }).eq('id', session.id)
      return NextResponse.json({ message: 'Account is not eligible for session recovery.' }, { status: 403 })
    }

    const { data: { user: authUser }, error: userError } = await admin.auth.admin.getUserById(session.user_id)
    if (userError || !authUser?.email) return NextResponse.json({ message: 'Unable to recover session.' }, { status: 500 })
    const { data: link, error: genError } = await admin.auth.admin.generateLink({ type: 'magiclink', email: authUser.email })
    if (genError || !link?.properties?.hashed_token) return NextResponse.json({ message: 'Unable to generate session recovery.' }, { status: 500 })

    const rotatedToken = createTrustedToken()
    const expiresAt = trustedSessionExpiry()
    const { data: rotated, error: rotateError } = await admin.from('trusted_sessions').update({
      token_hash: hashTrustedToken(rotatedToken),
      session_token: null,
      last_refreshed_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    }).eq('id', session.id).eq('token_hash', tokenHash).select('id').maybeSingle()
    if (rotateError || !rotated) return NextResponse.json({ message: 'Session was already refreshed. Please sign in again.' }, { status: 409 })

    return NextResponse.json({
      token_hash: link.properties.hashed_token,
      type: 'magiclink',
      trusted_token: rotatedToken,
      expires_at: expiresAt.toISOString(),
      user_id: session.user_id,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ message: 'Session refresh failed.' }, { status: 500 })
  }
}
