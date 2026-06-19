import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/types'

export const dynamic = 'force-dynamic'

type QueryResult<T> = {
  data: T | null
  error: { message?: string } | null
}

type SupabaseQueryBuilder = PromiseLike<QueryResult<unknown>> & {
  select(columns: string): SupabaseQueryBuilder
  eq(column: string, value: unknown): SupabaseQueryBuilder
  order(column: string, options?: { ascending?: boolean }): SupabaseQueryBuilder
}

type SupabaseDataClient = {
  from(table: string): SupabaseQueryBuilder
}

type StaffProfile = {
  id: string
  user_id: string
  role: UserRole
  organization_id: string
  is_active: boolean
  registration_status: string | null
}

const residentReadRoles: UserRole[] = ['super_admin', 'admin', 'dispatcher', 'verifier']

async function requireResidentReader() {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: NextResponse.json({ message: 'Please sign in first.' }, { status: 401 }) }
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, user_id, role, organization_id, is_active, registration_status')
    .eq('user_id', user.id)
    .single() as QueryResult<StaffProfile>

  if (
    profileError ||
    !profile ||
    !profile.is_active ||
    !residentReadRoles.includes(profile.role) ||
    (profile.registration_status && profile.registration_status !== 'approved')
  ) {
    return { error: NextResponse.json({ message: 'Resident management access required.' }, { status: 403 }) }
  }

  return { profile }
}

export async function GET() {
  const auth = await requireResidentReader()
  if ('error' in auth) return auth.error

  try {
    const admin = await createAdminClient() as unknown as SupabaseDataClient
    let query = admin
      .from('user_profiles')
      .select('*')
      .eq('role', 'resident')
      .order('created_at', { ascending: false })

    if (auth.profile.role !== 'super_admin') {
      query = query.eq('organization_id', auth.profile.organization_id)
    }

    const { data, error } = await query as QueryResult<Record<string, unknown>[]>

    if (error) throw new Error(error.message ?? 'Unable to load residents.')

    return NextResponse.json({ residents: data ?? [] })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to load residents.' },
      { status: 500 }
    )
  }
}

