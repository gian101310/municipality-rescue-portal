import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { isStrongPassword, isValidEmail, requiresBarangay } from '@/lib/auth-validation'
import { PH_LOCALITIES } from '@/lib/philippines-geography'
import { getCoverageLookupCandidates } from '@/lib/registration-organization'
import { rateLimitRegistration, getClientIp } from '@/lib/server-rate-limiter'
import { sanitizeText } from '@/lib/sanitize'

export const dynamic = 'force-dynamic'

type QueryResult<T> = {
  data: T | null
  error: { message?: string } | null
}

type SupabaseQueryBuilder = PromiseLike<QueryResult<unknown>> & {
  select(columns: string): SupabaseQueryBuilder
  eq(column: string, value: unknown): SupabaseQueryBuilder
  neq(column: string, value: unknown): SupabaseQueryBuilder
  order(column: string, options?: { ascending?: boolean }): SupabaseQueryBuilder
  limit(count: number): SupabaseQueryBuilder
  insert(values: Record<string, unknown> | Record<string, unknown>[]): SupabaseQueryBuilder
  upsert(values: Record<string, unknown>, options: { onConflict: string }): SupabaseQueryBuilder
  maybeSingle<T = Record<string, unknown>>(): Promise<QueryResult<T>>
  single<T = Record<string, unknown>>(): Promise<QueryResult<T>>
}

type SupabaseDataClient = {
  from(table: string): SupabaseQueryBuilder
}

type OrganizationRow = {
  id: string
  name: string
  slug: string
  is_active: boolean
}

type MunicipalityRow = {
  id: string
  organization_id: string
  name: string
  province: string
  region: string
}

type GeoScopeRow = {
  organization_id: string
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message ?? fallback)
  }
  return fallback
}

function clean(value: unknown) {
  return sanitizeText(String(value ?? ''))
}

function makeReferenceNumber() {
  return `REG-${Date.now().toString(36).toUpperCase()}`
}

async function findOrganization(
  admin: SupabaseDataClient,
  municipalityCode: string
): Promise<OrganizationRow> {
  if (municipalityCode) {
    const locality = PH_LOCALITIES.find((item) => item.code === municipalityCode)

    for (const candidate of getCoverageLookupCandidates(municipalityCode, locality)) {
      const { data: scope, error: scopeError } = await admin
        .from('organization_geo_scopes')
        .select('organization_id')
        .eq(candidate.column, candidate.value)
        .limit(1)
        .maybeSingle<GeoScopeRow>()

      if (scopeError) throw new Error(scopeError.message ?? 'Unable to check coverage lock.')
      if (!scope?.organization_id) continue

      const { data: scopedOrg, error: scopedOrgError } = await admin
        .from('organizations')
        .select('id, name, slug, is_active')
        .eq('id', scope.organization_id)
        .eq('is_active', true)
        .maybeSingle<OrganizationRow>()

      if (scopedOrgError) throw new Error(scopedOrgError.message ?? 'Unable to load selected municipality.')
      if (scopedOrg) return scopedOrg
    }
  }

  const { data: ownerOrg, error: ownerError } = await admin
    .from('organizations')
    .select('id, name, slug, is_active')
    .eq('slug', 'rescue-portal-owner')
    .eq('is_active', true)
    .maybeSingle<OrganizationRow>()

  if (ownerError) throw new Error(ownerError.message ?? 'Unable to load default organization.')
  if (ownerOrg) return ownerOrg

  const { data: orgs, error: orgError } = await admin
    .from('organizations')
    .select('id, name, slug, is_active')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1) as QueryResult<OrganizationRow[]>

  if (orgError) throw new Error(orgError.message ?? 'Unable to load organization.')
  const firstOrg = orgs?.[0]
  if (!firstOrg) throw new Error('No active organization is available for registrations.')

  return firstOrg
}

async function findMunicipality(
  admin: SupabaseDataClient,
  organizationId: string,
  municipalityName: string
) {
  if (municipalityName) {
    const { data: matchedMunicipality, error: matchError } = await admin
      .from('municipalities')
      .select('id, organization_id, name, province, region')
      .eq('organization_id', organizationId)
      .eq('name', municipalityName)
      .maybeSingle<MunicipalityRow>()

    if (matchError) throw new Error(matchError.message ?? 'Unable to load municipality.')
    if (matchedMunicipality) return matchedMunicipality
  }

  const { data: municipalities, error } = await admin
    .from('municipalities')
    .select('id, organization_id, name, province, region')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: true })
    .limit(1) as QueryResult<MunicipalityRow[]>

  if (error) throw new Error(error.message ?? 'Unable to load municipality.')
  return municipalities?.[0] ?? null
}

export async function POST(request: Request) {
  // Server-side rate limiting
  const ip = getClientIp(request.headers)
  const rl = await rateLimitRegistration(ip)
  if (!rl.success) {
    return NextResponse.json(
      { message: `Too many registration attempts. Try again in ${Math.ceil(rl.resetInSeconds / 60)} minutes.` },
      { status: 429, headers: { 'Retry-After': String(rl.resetInSeconds) } }
    )
  }

  let createdAuthUserId: string | null = null
  let adminClient: Awaited<ReturnType<typeof createAdminClient>> | null = null

  try {
    const body = await request.json()
    const fullName = clean(body?.full_name)
    const phone = clean(body?.phone)
    const email = clean(body?.email).toLowerCase()
    const password = String(body?.password ?? '')
    const confirmPassword = String(body?.confirmPassword ?? '')
    const municipalityCode = clean(body?.municipalityCode)
    const municipalityName = clean(body?.municipality)
    const qrOrganizationId = clean(body?.organizationId) // from QR scan handoff

    if (!fullName) throw new Error('Enter your full name.')
    if (!phone) throw new Error('Enter your phone number.')
    if (!isValidEmail(email)) throw new Error('Enter a valid email address.')
    if (password !== confirmPassword) throw new Error('Passwords do not match.')
    if (!isStrongPassword(password)) {
      throw new Error('Password must be at least 8 characters and include uppercase, lowercase, number, and special character.')
    }
    if (!clean(body?.regionCode)) throw new Error('Choose your region.')
    if (!municipalityCode || !municipalityName) throw new Error('Choose your city or municipality.')
    if (requiresBarangay(municipalityCode) && !clean(body?.barangay)) throw new Error('Choose your barangay.')
    if (!clean(body?.address)) throw new Error('Enter your complete address.')
    if (!clean(body?.id_type) || !clean(body?.id_number)) throw new Error('Enter your government ID details.')
    if (!clean(body?.ec_name) || !clean(body?.ec_phone) || !clean(body?.ec_relationship)) {
      throw new Error('Complete your emergency contact details.')
    }
    if (body?.privacy_agree !== true || body?.false_alert_agree !== true) {
      throw new Error('Please accept the privacy and false alert agreements.')
    }

    adminClient = await createAdminClient()
    const admin = adminClient as unknown as SupabaseDataClient

    // If QR scan provided an organization ID, verify it and use it directly
    let organization: OrganizationRow
    if (qrOrganizationId) {
      const { data: qrOrg, error: qrOrgError } = await admin
        .from('organizations')
        .select('id, name, slug, is_active')
        .eq('id', qrOrganizationId)
        .eq('is_active', true)
        .maybeSingle<OrganizationRow>()
      if (qrOrgError) throw new Error(qrOrgError.message ?? 'Unable to verify municipality.')
      if (!qrOrg) throw new Error('The municipality from the QR code is no longer active.')
      organization = qrOrg
    } else {
      organization = await findOrganization(admin, municipalityCode)
    }
    const municipality = await findMunicipality(admin, organization.id, municipalityName)
    const referenceNumber = makeReferenceNumber()

    const { data: existingProfile, error: existingProfileError } = await admin
      .from('user_profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle<{ id: string }>()

    if (existingProfileError) throw new Error(existingProfileError.message ?? 'Unable to check existing account.')
    if (existingProfile?.id) throw new Error('An account already exists for this email address.')

    const { data: authUserData, error: authUserError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: 'resident',
        registration_status: 'submitted',
        organization_id: organization.id,
      },
    })

    if (authUserError || !authUserData.user?.id) {
      throw new Error(authUserError?.message ?? 'Unable to create resident login.')
    }

    createdAuthUserId = authUserData.user.id

    const now = new Date().toISOString()
    const profilePayload: Record<string, unknown> = {
      user_id: authUserData.user.id,
      role: 'resident',
      full_name: fullName,
      email,
      phone,
      organization_id: organization.id,
      municipality_id: municipality?.id ?? null,
      is_active: true,
      date_of_birth: clean(body?.date_of_birth) || null,
      address: clean(body?.address),
      barangay: clean(body?.barangay),
      municipality: municipality?.name ?? municipalityName,
      province: clean(body?.province) || municipality?.province || '',
      id_type: clean(body?.id_type),
      id_number: clean(body?.id_number),
      emergency_contact_name: clean(body?.ec_name),
      emergency_contact_phone: clean(body?.ec_phone),
      emergency_contact_relationship: clean(body?.ec_relationship),
      registration_status: 'submitted',
      created_at: now,
      updated_at: now,
    }

    // Use upsert because the handle_new_auth_user trigger may have already
    // inserted a row for this user_id with default values.
    const { data: profile, error: profileError } = await admin
      .from('user_profiles')
      .upsert(profilePayload, { onConflict: 'user_id' })
      .select('id')
      .single<{ id: string }>()

    if (profileError || !profile?.id) {
      throw new Error(profileError?.message ?? 'Unable to save resident profile.')
    }

    const { error: verificationError } = await admin
      .from('resident_verifications')
      .insert({
        resident_id: profile.id,
        status: 'submitted',
        submitted_at: now,
        notes: `Reference ${referenceNumber}`,
        created_at: now,
        updated_at: now,
      }) as QueryResult<unknown>

    if (verificationError) throw new Error(verificationError.message ?? 'Unable to start verification.')

    return NextResponse.json(
      {
        referenceNumber,
        status: 'submitted',
        message: 'Registration submitted. You can log in after an administrator approves your account.',
      },
      { status: 201 }
    )
  } catch (error) {
    if (createdAuthUserId && adminClient) {
      await adminClient.auth.admin.deleteUser(createdAuthUserId).catch(() => null)
    }

    return NextResponse.json(
      { message: getErrorMessage(error, 'Unable to submit registration.') },
      { status: 400 }
    )
  }
}
