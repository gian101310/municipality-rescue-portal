import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { generateMasterKey, hashMasterKey } from '@/lib/master-key'
import {
  PH_LOCALITIES,
  PH_PROVINCES,
  PH_REGIONS,
  PSGC_VERSION_LABEL,
  getFallbackMapCenter,
  getLocalityLabel,
  getScopeLocationDetails,
  makeTenantScope,
} from '@/lib/philippines-geography'

export const dynamic = 'force-dynamic'

type TenantPlan = 'starter' | 'professional' | 'enterprise' | 'one_time'
type TenantStatus = 'trial' | 'active' | 'suspended' | 'cancelled'

type OrganizationRow = {
  id: string
  name: string
  slug: string
  province: string
  region: string
  email: string | null
  emergency_hotline: string
  branding: Record<string, unknown> | null
  is_active: boolean
  subscription_tier: string
  created_at: string
}

type MunicipalityRow = {
  id: string
  organization_id: string
  name: string
  province: string
  region: string
}

type QueryResult<T> = {
  data: T | null
  error: { message?: string } | null
}

type SupabaseQueryBuilder = PromiseLike<QueryResult<unknown>> & {
  select(columns: string): SupabaseQueryBuilder
  eq(column: string, value: unknown): SupabaseQueryBuilder
  neq(column: string, value: unknown): SupabaseQueryBuilder
  order(column: string, options: { ascending: boolean }): SupabaseQueryBuilder
  insert(values: Record<string, unknown> | Record<string, unknown>[]): SupabaseQueryBuilder
  upsert(values: Record<string, unknown>, options: { onConflict: string }): SupabaseQueryBuilder
  delete(): SupabaseQueryBuilder
  maybeSingle<T = Record<string, unknown>>(): Promise<QueryResult<T>>
  single<T = Record<string, unknown>>(): Promise<QueryResult<T>>
}

type SupabaseDataClient = {
  from(table: string): SupabaseQueryBuilder
}

const validPlans: TenantPlan[] = ['starter', 'professional', 'enterprise', 'one_time']
const validStatuses: TenantStatus[] = ['trial', 'active', 'suspended', 'cancelled']

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message ?? fallback)
  }
  return fallback
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function isStrongPassword(value: string) {
  return value.length >= 8
    && /[A-Z]/.test(value)
    && /[a-z]/.test(value)
    && /\d/.test(value)
    && /[^A-Za-z0-9]/.test(value)
}

function planToTier(plan: TenantPlan) {
  if (plan === 'starter') return 'basic'
  if (plan === 'professional') return 'pro'
  return 'enterprise'
}

function rowToTenant(org: OrganizationRow, municipality?: MunicipalityRow) {
  const branding = org.branding ?? {}
  const plan = validPlans.includes(branding.tenant_plan as TenantPlan)
    ? branding.tenant_plan as TenantPlan
    : org.subscription_tier === 'basic'
      ? 'starter'
      : org.subscription_tier === 'pro'
        ? 'professional'
        : org.subscription_tier === 'enterprise'
          ? 'enterprise'
          : 'starter'
  const status = validStatuses.includes(branding.tenant_status as TenantStatus)
    ? branding.tenant_status as TenantStatus
    : org.is_active
      ? 'active'
      : 'suspended'

  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    province: municipality?.province ?? org.province,
    region: municipality?.region ?? org.region,
    municipality: municipality?.name ?? String(branding.municipality_name ?? ''),
    plan,
    status,
    contact_email: org.email ?? '',
    created_at: org.created_at,
  }
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

export async function GET() {
  const auth = await requireSuperAdmin()
  if ('error' in auth) return auth.error

  try {
    const admin = await createAdminClient() as unknown as SupabaseDataClient
    const { data: orgs, error: orgError } = await admin
      .from('organizations')
      .select('id, name, slug, province, region, email, emergency_hotline, branding, is_active, subscription_tier, created_at')
      .neq('slug', 'rescue-portal-owner')
      .order('created_at', { ascending: false }) as QueryResult<OrganizationRow[]>

    if (orgError) throw new Error(orgError.message)

    const { data: municipalities, error: municipalityError } = await admin
      .from('municipalities')
      .select('id, organization_id, name, province, region') as QueryResult<MunicipalityRow[]>

    if (municipalityError) throw new Error(municipalityError.message)

    const municipalityByOrg = new Map(
      (municipalities ?? []).map((item) => [item.organization_id, item])
    )

    return NextResponse.json({
      tenants: (orgs ?? []).map((org) => rowToTenant(org, municipalityByOrg.get(org.id))),
    })
  } catch (error) {
    return NextResponse.json(
      { message: getErrorMessage(error, 'Unable to load tenants.') },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const auth = await requireSuperAdmin()
  if ('error' in auth) return auth.error

  let adminClient: Awaited<ReturnType<typeof createAdminClient>> | null = null
  let dataAdmin: SupabaseDataClient | null = null
  let createdOrganizationId: string | null = null
  let createdAuthUserId: string | null = null

  try {
    const body = await request.json()
    const municipalityCode = String(body?.municipalityCode ?? '')
    const locality = PH_LOCALITIES.find((item) => item.code === municipalityCode)
    if (!locality) throw new Error('Choose a valid city or municipality.')

    const province = locality.provinceCode
      ? PH_PROVINCES.find((item) => item.code === locality.provinceCode)
      : null
    const region = PH_REGIONS.find((item) => item.code === locality.regionCode)
    if (!region) throw new Error('Selected municipality has no valid region.')

    const scope = makeTenantScope('municipality', locality.code)
    const details = getScopeLocationDetails(scope)
    const fallbackMap = getFallbackMapCenter(scope)
    const plan = validPlans.includes(body?.plan) ? body.plan as TenantPlan : 'starter'
    const status = validStatuses.includes(body?.status) ? body.status as TenantStatus : 'trial'
    const organizationName = String(body?.name ?? '').trim() || `${details.organizationName} Emergency Rescue Portal`
    const baseSlug = slugify(String(body?.slug ?? '').trim() || `${locality.name}-${province?.name ?? region.name}`)
    if (!baseSlug) throw new Error('Tenant slug could not be generated.')

    const emergencyHotline = String(body?.emergencyHotline ?? '').trim() || '911'
    const adminEmail = String(body?.adminEmail ?? '').trim().toLowerCase()
    const adminPassword = String(body?.adminPassword ?? '')
    const adminFullName = String(body?.adminFullName ?? '').trim() || `${details.organizationName} Admin`
    const contactEmail = String(body?.contactEmail ?? '').trim() || adminEmail

    if (!isValidEmail(adminEmail)) {
      throw new Error('Enter a valid municipality admin email address.')
    }

    if (!isStrongPassword(adminPassword)) {
      throw new Error('Admin password must be at least 8 characters and include uppercase, lowercase, number, and special character.')
    }

    adminClient = await createAdminClient()
    dataAdmin = adminClient as unknown as SupabaseDataClient
    const { data: existing } = await dataAdmin
      .from('organizations')
      .select('id')
      .eq('slug', baseSlug)
      .maybeSingle() as QueryResult<{ id: string }>

    if (existing?.id) throw new Error(`The slug "${baseSlug}" is already used.`)

    // Generate a unique master key for this tenant
    const masterKeyPlaintext = generateMasterKey()
    const masterKeyHash = hashMasterKey(masterKeyPlaintext)

    const organizationPayload: Record<string, unknown> = {
      name: organizationName,
      slug: baseSlug,
      province: province?.name ?? '',
      region: region.name,
      emergency_hotline: emergencyHotline,
      email: contactEmail,
      address: [getLocalityLabel(locality), province?.name, region.name, 'Philippines'].filter(Boolean).join(', '),
      map_center_lat: fallbackMap.center.lat,
      map_center_lng: fallbackMap.center.lng,
      map_zoom: fallbackMap.zoom,
      subscription_tier: planToTier(plan),
      is_active: status !== 'suspended' && status !== 'cancelled',
      master_key_hash: masterKeyHash,
      branding: {
        tenant_plan: plan,
        tenant_status: status,
        locality_code: locality.code,
        province_code: locality.provinceCode,
        region_code: locality.regionCode,
        municipality_name: locality.name,
      },
    }

    const { data: organization, error: orgError } = await dataAdmin
      .from('organizations')
      .insert(organizationPayload)
      .select('id, name, slug, province, region, email, emergency_hotline, branding, is_active, subscription_tier, created_at')
      .single() as QueryResult<OrganizationRow>

    if (orgError || !organization) throw new Error(orgError?.message ?? 'Unable to create organization.')
    createdOrganizationId = organization.id

    const municipalityPayload: Record<string, unknown> = {
      organization_id: organization.id,
      name: locality.name,
      province: province?.name ?? '',
      region: region.name,
      map_center_lat: fallbackMap.center.lat,
      map_center_lng: fallbackMap.center.lng,
      map_zoom: fallbackMap.zoom,
      is_active: true,
    }

    const { data: municipality, error: municipalityError } = await dataAdmin
      .from('municipalities')
      .insert(municipalityPayload)
      .select('id, organization_id, name, province, region')
      .single() as QueryResult<MunicipalityRow>

    if (municipalityError || !municipality) throw new Error(municipalityError?.message ?? 'Unable to create municipality.')

    const scopePayload: Record<string, unknown> = {
      organization_id: organization.id,
      scope_level: 'municipality',
      region_code: locality.regionCode,
      province_code: locality.provinceCode,
      municipality_code: locality.code,
      psgc_version: PSGC_VERSION_LABEL,
    }

    const { error: scopeError } = await dataAdmin
      .from('organization_geo_scopes')
      .upsert(
        scopePayload,
        { onConflict: 'organization_id' }
      ) as QueryResult<unknown>

    if (scopeError) throw new Error(scopeError.message)

    const { data: authUserData, error: authUserError } = await adminClient.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        full_name: adminFullName,
        role: 'admin',
        organization_id: organization.id,
      },
    })

    if (authUserError || !authUserData.user?.id) {
      throw new Error(authUserError?.message ?? 'Unable to create municipality admin login.')
    }

    createdAuthUserId = authUserData.user.id

    const adminProfilePayload: Record<string, unknown> = {
      user_id: authUserData.user.id,
      role: 'admin',
      full_name: adminFullName,
      email: adminEmail,
      organization_id: organization.id,
      municipality_id: municipality.id,
      is_active: true,
      department: 'Emergency Response',
      position: 'Municipality Admin',
      municipality: locality.name,
      province: province?.name ?? '',
      registration_status: 'approved',
      verified_at: new Date().toISOString(),
    }

    const { error: profileError } = await dataAdmin
      .from('user_profiles')
      .insert(adminProfilePayload) as QueryResult<unknown>

    if (profileError) throw new Error(profileError.message ?? 'Unable to create municipality admin profile.')

    return NextResponse.json(
      {
        tenant: rowToTenant(organization, municipality),
        admin: {
          email: adminEmail,
          full_name: adminFullName,
        },
        master_key: masterKeyPlaintext,
      },
      { status: 201 }
    )
  } catch (error) {
    if (createdAuthUserId && adminClient) {
      await adminClient.auth.admin.deleteUser(createdAuthUserId).catch(() => null)
    }

    if (createdOrganizationId && dataAdmin) {
      try {
        await dataAdmin
          .from('organizations')
          .delete()
          .eq('id', createdOrganizationId)
      } catch {
        // Best-effort rollback only; return the original creation error below.
      }
    }

    return NextResponse.json(
      { message: getErrorMessage(error, 'Unable to create tenant.') },
      { status: 400 }
    )
  }
}
