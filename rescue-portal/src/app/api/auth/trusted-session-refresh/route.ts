import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/trusted-session-refresh
 *
 * When a resident returns with an expired Supabase session but a valid
 * trusted_sessions token, this endpoint validates the token server-side
 * and generates a magic link (or custom token) so the client can re-auth
 * without the user entering credentials.
 *
 * Body: { token: string }
 * Returns: { token_hash, email, type } on success
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const token = String(body?.token ?? '')

    if (!token) {
      return NextResponse.json({ message: 'Token is required.' }, { status: 400 })
    }

    const admin = await createAdminClient()

    // Validate the trusted session token
    const { data: session, error: sessionError } = await (admin.from('trusted_sessions') as any)
      .select('id, user_id, expires_at, is_revoked')
      .eq('session_token', token)
      .eq('is_revoked', false)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ message: 'Invalid or expired session.' }, { status: 401 })
    }

    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ message: 'Trusted session has expired.' }, { status: 401 })
    }

    // Verify user exists and is an active approved resident
    const { data: profile } = await (admin.from('user_profiles') as any)
      .select('role, is_active, registration_status')
      .eq('user_id', session.user_id)
      .single()

    if (!profile || profile.role !== 'resident' || !profile.is_active || profile.registration_status !== 'approved') {
      return NextResponse.json({ message: 'Account is not eligible for session recovery.' }, { status: 403 })
    }

    // Get the user's email for magic link generation
    const { data: { user: authUser }, error: userError } = await (admin as any).auth.admin.getUserById(session.user_id)
    if (userError || !authUser?.email) {
      return NextResponse.json({ message: 'Unable to recover session.' }, { status: 500 })
    }

    // Generate a magic link token — the client will call verifyOtp to establish a session
    const { data: link, error: genError } = await (admin as any).auth.admin.generateLink({
      type: 'magiclink',
      email: authUser.email,
    })

    if (genError || !link?.properties?.hashed_token) {
      return NextResponse.json({ message: 'Unable to generate session recovery.' }, { status: 500 })
    }

    // Sliding window refresh
    const newExpiry = new Date()
    newExpiry.setDate(newExpiry.getDate() + 90)

    await (admin.from('trusted_sessions') as any)
      .update({
        last_refreshed_at: new Date().toISOString(),
        expires_at: newExpiry.toISOString(),
      })
      .eq('id', session.id)

    // Return the verification token and type for the client to call verifyOtp
    return NextResponse.json({
      token_hash: link.properties.hashed_token,
      email: authUser.email,
      type: 'magiclink',
    })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Session refresh failed.' },
      { status: 500 }
    )
  }
}
