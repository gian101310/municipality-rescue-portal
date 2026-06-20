import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type QueryResult<T> = {
  data: T | null
  error: { message?: string } | null
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single() as QueryResult<{ role: string }>

  if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
    return NextResponse.json({ message: 'Admin access required' }, { status: 403 })
  }

  const { email, password } = await request.json()
  if (!email || !password) {
    return NextResponse.json({ message: 'Email and password required' }, { status: 400 })
  }

  const adminClient = await createAdminClient()

  // Look up user_id from user_profiles by email
  const { data: targetProfile } = await (adminClient as unknown as { from(t: string): { select(c: string): { eq(c: string, v: string): { maybeSingle(): Promise<QueryResult<{ user_id: string }>> } } } })
    .from('user_profiles')
    .select('user_id')
    .eq('email', email)
    .maybeSingle()

  if (!targetProfile?.user_id) {
    return NextResponse.json({ message: 'User not found' }, { status: 404 })
  }

  const { error: updateError } = await adminClient.auth.admin.updateUserById(
    targetProfile.user_id,
    { password }
  )

  if (updateError) {
    return NextResponse.json({ message: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, email })
}
