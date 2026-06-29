import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

const AUDIT_ROLES = new Set(['super_admin', 'admin', 'dispatcher', 'verifier', 'staff'])

export async function GET(request: NextRequest) {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Please sign in first.' }, { status: 401 })

  const { data: rawProfile } = await client
    .from('user_profiles')
    .select('role, organization_id, is_active, registration_status')
    .eq('user_id', user.id)
    .single()
  const profile = rawProfile as null | { role: string; organization_id: string | null; is_active: boolean; registration_status: string }
  if (!profile?.is_active || !profile.organization_id || !AUDIT_ROLES.has(profile.role)
      || (profile.role !== 'super_admin' && profile.registration_status !== 'approved')) {
    return NextResponse.json({ message: 'Audit access required.' }, { status: 403 })
  }

  const requestedLimit = Number(request.nextUrl.searchParams.get('limit') ?? 250)
  const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? requestedLimit : 250, 1), 500)
  const admin = await createAdminClient()
  const { data, error } = await admin
    .from('audit_logs')
    .select('*')
    .eq('organization_id', profile.organization_id)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) return NextResponse.json({ message: error.message }, { status: 500 })

  return NextResponse.json({ logs: data ?? [], role: profile.role })
}
