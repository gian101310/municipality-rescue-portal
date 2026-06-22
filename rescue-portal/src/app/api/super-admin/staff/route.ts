import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const MAX_STAFF_PER_TENANT = 10

async function requireSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, role, organization_id')
    .eq('user_id', user.id)
    .single() as any
  if (profile?.role !== 'super_admin') return null
  return profile
}

/** GET /api/super-admin/staff?tenantId=... — list admin staff for a tenant */
export async function GET(request: NextRequest) {
  const profile = await requireSuperAdmin()
  if (!profile) return NextResponse.json({ message: 'Unauthorized' }, { status: 403 })

  const tenantId = request.nextUrl.searchParams.get('tenantId')
  if (!tenantId) return NextResponse.json({ message: 'tenantId required' }, { status: 400 })

  const admin = await createAdminClient() as any
  const { data: staff, error } = await admin
    .from('user_profiles')
    .select('id, user_id, full_name, role, is_active, created_at')
    .eq('organization_id', tenantId)
    .in('role', ['admin', 'dispatcher', 'staff', 'responder', 'team_leader'])
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ message: error.message }, { status: 500 })

  // Get email for each staff via auth admin
  const staffWithEmail = await Promise.all(
    (staff ?? []).map(async (s: any) => {
      if (!s.user_id) return { ...s, email: null }
      const { data: { user } } = await admin.auth.admin.getUserById(s.user_id)
      return { ...s, email: user?.email ?? null }
    })
  )

  return NextResponse.json({ staff: staffWithEmail, max: MAX_STAFF_PER_TENANT })
}

/** POST /api/super-admin/staff — create staff login for a tenant */
export async function POST(request: Request) {
  const profile = await requireSuperAdmin()
  if (!profile) return NextResponse.json({ message: 'Unauthorized' }, { status: 403 })

  const body = await request.json()
  const { tenantId, email, fullName, role, password } = body

  if (!tenantId || !email || !password) {
    return NextResponse.json({ message: 'tenantId, email, and password are required.' }, { status: 400 })
  }

  const staffRole = ['admin', 'dispatcher', 'staff', 'responder', 'team_leader'].includes(role) ? role : 'staff'

  const admin = await createAdminClient() as any

  // Check staff count
  const { count } = await admin
    .from('user_profiles')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', tenantId)
    .in('role', ['admin', 'dispatcher', 'staff', 'responder', 'team_leader'])

  if ((count ?? 0) >= MAX_STAFF_PER_TENANT) {
    return NextResponse.json({ message: `Maximum ${MAX_STAFF_PER_TENANT} staff accounts per tenant.` }, { status: 400 })
  }

  try {
    // Create auth user
    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (authError) throw new Error(authError.message)

    // Create profile
    const { error: profileError } = await admin.from('user_profiles').insert({
      user_id: authUser.user.id,
      organization_id: tenantId,
      full_name: fullName || email.split('@')[0],
      role: staffRole,
      is_active: true,
    })
    if (profileError) throw new Error(profileError.message)

    return NextResponse.json({ message: 'Staff account created.' }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to create staff account.' },
      { status: 500 }
    )
  }
}

/** PATCH /api/super-admin/staff — update staff password or toggle active */
export async function PATCH(request: Request) {
  const profile = await requireSuperAdmin()
  if (!profile) return NextResponse.json({ message: 'Unauthorized' }, { status: 403 })

  const body = await request.json()
  const { staffId, action, password } = body

  const admin = await createAdminClient() as any
  const { data: staff } = await admin
    .from('user_profiles')
    .select('id, user_id, is_active')
    .eq('id', staffId)
    .single()

  if (!staff) return NextResponse.json({ message: 'Staff not found.' }, { status: 404 })

  if (action === 'change_password' && staff.user_id && password) {
    const { error } = await admin.auth.admin.updateUserById(staff.user_id, { password })
    if (error) return NextResponse.json({ message: error.message }, { status: 500 })
    return NextResponse.json({ message: 'Password updated.' })
  }

  if (action === 'toggle_active') {
    const { error } = await admin
      .from('user_profiles')
      .update({ is_active: !staff.is_active })
      .eq('id', staffId)
    if (error) return NextResponse.json({ message: error.message }, { status: 500 })
    return NextResponse.json({ message: staff.is_active ? 'Staff deactivated.' : 'Staff activated.' })
  }

  if (action === 'delete' && staff.user_id) {
    await admin.from('user_profiles').delete().eq('id', staffId)
    await admin.auth.admin.deleteUser(staff.user_id)
    return NextResponse.json({ message: 'Staff deleted.' })
  }

  return NextResponse.json({ message: 'Invalid action.' }, { status: 400 })
}
