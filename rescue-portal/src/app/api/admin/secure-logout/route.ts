import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { writeAuditLog, auditRequestMeta } from '@/lib/audit-logger'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 })
    }

    const body = await request.json()
    const password = String(body?.password ?? '')

    if (!password) {
      return NextResponse.json({ message: 'Password is required to logout.' }, { status: 400 })
    }

    // Verify password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password,
    })

    if (signInError) {
      // Log failed logout attempt
      const meta = auditRequestMeta(request.headers)
      writeAuditLog({
        actorId: user.id,
        actorName: user.email ?? 'unknown',
        actorRole: 'unknown',
        action: 'logout',
        entityType: 'session',
        newValues: { success: false, reason: 'incorrect_password' },
        ...meta,
      })
      return NextResponse.json({ message: 'Incorrect password. Logout cancelled.' }, { status: 403 })
    }

    // Log successful logout
    const meta = auditRequestMeta(request.headers)
    writeAuditLog({
      actorId: user.id,
      actorName: user.email ?? 'unknown',
      actorRole: 'unknown',
      action: 'logout',
      entityType: 'session',
      newValues: { success: true },
      ...meta,
    })

    // Sign out
    await supabase.auth.signOut()

    return NextResponse.json({ message: 'Logged out successfully.' })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to logout.' },
      { status: 500 }
    )
  }
}
