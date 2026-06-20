import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  // Auth check - must be admin/super_admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single() as { data: { role: string } | null; error: unknown }

  if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
    return NextResponse.json({ message: 'Admin access required' }, { status: 403 })
  }

  const { email, password } = await request.json()
  if (!email || !password) {
    return NextResponse.json({ message: 'Email and password required' }, { status: 400 })
  }

  const adminClient = await createAdminClient()

  // Find user by email
  const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers()
  if (listError) return NextResponse.json({ message: listError.message }, { status: 500 })

  const target = users.find((u: { email?: string }) => u.email === email)
  if (!target) return NextResponse.json({ message: `User ${email} not found` }, { status: 404 })

  const { error: updateError } = await adminClient.auth.admin.updateUserById(target.id, { password })
  if (updateError) return NextResponse.json({ message: updateError.message }, { status: 500 })

  return NextResponse.json({ success: true, email })
}
