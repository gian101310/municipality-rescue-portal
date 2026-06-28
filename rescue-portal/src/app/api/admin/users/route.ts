import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

const teamManagementRoles = ['super_admin', 'admin', 'dispatcher', 'staff']
const teamMemberAccountRoles = ['staff', 'responder', 'team_leader']

export async function GET(request: NextRequest) {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Please sign in first.' }, { status: 401 })

  const { data: profile } = await client
    .from('user_profiles')
    .select('role, organization_id, is_active, registration_status')
    .eq('user_id', user.id)
    .single() as any

  if (
    !profile?.is_active ||
    !teamManagementRoles.includes(profile.role) ||
    (profile.registration_status && profile.registration_status !== 'approved')
  ) {
    return NextResponse.json({ message: 'Team management access required.' }, { status: 403 })
  }

  if (request.nextUrl.searchParams.get('role') !== 'staff') {
    return NextResponse.json({ message: 'Unsupported user filter.' }, { status: 400 })
  }

  const admin = await createAdminClient() as any
  const { data, error } = await admin
    .from('user_profiles')
    .select('id, full_name, role')
    .eq('organization_id', profile.organization_id)
    .eq('is_active', true)
    .eq('registration_status', 'approved')
    .in('role', teamMemberAccountRoles)
    .order('full_name')

  if (error) return NextResponse.json({ message: error.message }, { status: 500 })
  return NextResponse.json({ users: data ?? [] })
}
