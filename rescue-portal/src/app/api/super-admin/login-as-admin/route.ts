import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { getCanonicalAppUrl } from '@/lib/app-url'

export const dynamic = 'force-dynamic'

type QueryResult<T> = {
  data: T | null
  error: { message?: string } | null
}

type AdminProfileRow = {
  user_id: string
  email: string
  role: string
}

type SupabaseQueryBuilder = PromiseLike<QueryResult<unknown>> & {
  select(columns: string): SupabaseQueryBuilder
  eq(column: string, value: unknown): SupabaseQueryBuilder
  limit(count: number): SupabaseQueryBuilder
  single<T = Record<string, unknown>>(): Promise<QueryResult<T>>
}

type SupabaseDataClient = {
  from(table: string): SupabaseQueryBuilder
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message ?? fallback)
  }
  return fallback
}

async function requireSuperAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: NextResponse.json({ message: 'Please sign in first.' }, { status: 401 }) }
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single() as QueryResult<{ role: string; is_active: boolean }>

  if (profileError || !profile || profile.role !== 'super_admin' || !profile.is_active) {
    return { error: NextResponse.json({ message: 'Super admin access required.' }, { status: 403 }) }
  }

  return { user }
}

export async function POST(request: Request) {
  const auth = await requireSuperAdmin()
  if ('error' in auth) return auth.error

  try {
    const body = await request.json()
    const tenantId = String(body?.tenantId ?? '').trim()

    if (!tenantId) {
      return NextResponse.json({ message: 'Tenant ID required.' }, { status: 400 })
    }

    const adminClient = await createAdminClient()
    const dataAdmin = adminClient as unknown as SupabaseDataClient

    const { data: adminProfile, error: adminError } = await dataAdmin
      .from('user_profiles')
      .select('user_id, email, role')
      .eq('organization_id', tenantId)
      .eq('role', 'admin')
      .limit(1)
      .single<AdminProfileRow>()

    if (adminError || !adminProfile) {
      return NextResponse.json({ message: 'No admin account found for this tenant.' }, { status: 404 })
    }

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: adminProfile.email,
      options: {
        redirectTo: `${getCanonicalAppUrl()}/admin`,
      },
    })

    if (linkError || !linkData) {
      throw new Error(linkError?.message ?? 'Unable to generate admin login link.')
    }

    const tokenHash = linkData.properties?.hashed_token
    if (!tokenHash) throw new Error('Unable to generate a one-time admin access token.')

    return NextResponse.json({
      loginUrl: `${getCanonicalAppUrl()}/auth/admin-access?token_hash=${encodeURIComponent(tokenHash)}`,
      adminEmail: adminProfile.email,
    })
  } catch (error) {
    return NextResponse.json(
      { message: getErrorMessage(error, 'Unable to generate login link.') },
      { status: 500 }
    )
  }
}
