import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import type { UserRole, RegistrationStatus } from '@/lib/types'

export const dynamic = 'force-dynamic'

type QueryResult<T> = {
  data: T | null
  error: { message?: string } | null
}

type SupabaseQueryBuilder = PromiseLike<QueryResult<unknown>> & {
  select(columns: string): SupabaseQueryBuilder
  eq(column: string, value: unknown): SupabaseQueryBuilder
  in(column: string, values: string[]): SupabaseQueryBuilder
  order(column: string, options?: { ascending?: boolean }): SupabaseQueryBuilder
  insert(values: Record<string, unknown> | Record<string, unknown>[]): SupabaseQueryBuilder
  upsert(values: Record<string, unknown>, options: { onConflict: string }): SupabaseQueryBuilder
  single<T = Record<string, unknown>>(): Promise<QueryResult<T>>
  maybeSingle<T = Record<string, unknown>>(): Promise<QueryResult<T>>
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

type ResidentInput = {
  full_name: string
  phone: string
  email?: string
  password?: string
  barangay?: string
  address?: string
  registration_status?: RegistrationStatus
}

const residentReadRoles: UserRole[] = ['super_admin', 'admin', 'dispatcher', 'verifier']
const residentWriteRoles: UserRole[] = ['super_admin', 'admin']

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

function clean(v: unknown) { return String(v ?? '').trim() }

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%'
  let pw = ''
  for (let i = 0; i < 14; i++) pw += chars[Math.floor(Math.random() * chars.length)]
  return pw
}

export async function GET() {
  const auth = await requireResidentReader()
  if ('error' in auth) return auth.error

  try {
    const adminClient = await createAdminClient()

    // Build query - for non-super_admin, filter by their org
    const orgFilter = auth.profile.role !== 'super_admin' ? auth.profile.organization_id : null

    let query = adminClient
      .from('user_profiles')
      .select('*')
      .eq('role', 'resident')

    if (orgFilter) {
      query = query.eq('organization_id', orgFilter)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { message: error.message ?? 'Unable to load residents.', residents: [] },
        { status: 500 }
      )
    }

    return NextResponse.json({
      residents: data ?? [],
      _v: 3,
    })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to load residents.', residents: [] },
      { status: 500 }
    )
  }
}

/**
 * POST — Admin creates residents manually (single or bulk).
 * Body: { residents: ResidentInput[] }
 * Each resident gets an auth user + profile row, auto-approved if status is 'approved'.
 */
export async function POST(request: Request) {
  const auth = await requireResidentReader()
  if ('error' in auth) return auth.error

  if (!residentWriteRoles.includes(auth.profile.role)) {
    return NextResponse.json({ message: 'Only admins can register residents.' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const inputs: ResidentInput[] = Array.isArray(body?.residents) ? body.residents : [body]
    if (inputs.length === 0) {
      return NextResponse.json({ message: 'Provide at least one resident.' }, { status: 400 })
    }
    if (inputs.length > 200) {
      return NextResponse.json({ message: 'Maximum 200 residents per batch.' }, { status: 400 })
    }

    const adminClient = await createAdminClient()
    const admin = adminClient as unknown as SupabaseDataClient
    const orgId = auth.profile.organization_id
    const now = new Date().toISOString()

    // Get municipality for this org
    const { data: municipality } = await admin
      .from('municipalities')
      .select('id, name, province, region')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: true })
      .single<{ id: string; name: string; province: string; region: string }>()

    const created: Record<string, unknown>[] = []
    const errors: { index: number; name: string; error: string }[] = []

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i]
      const fullName = clean(input.full_name)
      const phone = clean(input.phone)
      const rawEmail = clean(input.email)
      const barangay = clean(input.barangay)
      const address = clean(input.address)
      const status: RegistrationStatus = input.registration_status === 'approved' ? 'approved' : 'submitted'

      if (!fullName) { errors.push({ index: i, name: '(empty)', error: 'Name is required' }); continue }
      if (!phone) { errors.push({ index: i, name: fullName, error: 'Phone is required' }); continue }

      // Generate email if not provided
      const email = rawEmail || `${fullName.toLowerCase().replace(/[^a-z0-9]+/g, '.')}.${Date.now().toString(36)}@manual.local`
      // Use admin-provided password or generate one
      const password = clean(input.password) || generatePassword()

      try {
        // Check if email already exists
        const { data: existing } = await admin
          .from('user_profiles')
          .select('id')
          .eq('email', email)
          .maybeSingle<{ id: string }>()

        if (existing?.id) {
          errors.push({ index: i, name: fullName, error: 'Email already registered' })
          continue
        }

        // Create auth user
        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: fullName,
            role: 'resident',
            registration_status: status,
            organization_id: orgId,
          },
        })

        if (authError || !authData.user?.id) {
          errors.push({ index: i, name: fullName, error: authError?.message ?? 'Auth creation failed' })
          continue
        }

        // Create/update profile
        const profilePayload: Record<string, unknown> = {
          user_id: authData.user.id,
          role: 'resident',
          full_name: fullName,
          email,
          phone,
          organization_id: orgId,
          municipality_id: municipality?.id ?? null,
          is_active: true,
          barangay: barangay || null,
          address: address || null,
          municipality: municipality?.name ?? null,
          province: municipality?.province ?? null,
          registration_status: status,
          created_at: now,
          updated_at: now,
        }

        if (status === 'approved') {
          profilePayload.verified_at = now
          profilePayload.verified_by = auth.profile.user_id
        }

        const { data: profile, error: profileError } = await admin
          .from('user_profiles')
          .upsert(profilePayload, { onConflict: 'user_id' })
          .select('*')
          .single<Record<string, unknown>>()

        if (profileError || !profile) {
          errors.push({ index: i, name: fullName, error: profileError?.message ?? 'Profile creation failed' })
          continue
        }

        // Create verification record
        await admin
          .from('resident_verifications')
          .insert({
            resident_id: profile.id,
            status,
            submitted_at: now,
            verifier_id: status === 'approved' ? auth.profile.user_id : null,
            reviewed_at: status === 'approved' ? now : null,
            notes: 'Registered by admin',
            created_at: now,
            updated_at: now,
          }) as QueryResult<unknown>

        created.push(profile)
      } catch (err) {
        errors.push({ index: i, name: fullName, error: err instanceof Error ? err.message : 'Unknown error' })
      }
    }

    return NextResponse.json({
      created: created.length,
      failed: errors.length,
      residents: created,
      errors: errors.length > 0 ? errors : undefined,
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to register residents.' },
      { status: 500 }
    )
  }
}

