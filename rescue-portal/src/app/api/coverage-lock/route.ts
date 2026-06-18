import { NextResponse } from 'next/server'
import { DEMO_ORGANIZATION } from '@/lib/demo-data'
import {
  DEMO_TENANT_GEO_SCOPE,
  PH_LOCALITIES,
  PH_PROVINCES,
  PH_REGIONS,
  PSGC_VERSION_LABEL,
} from '@/lib/philippines-geography'
import type { GeoScopeLevel, TenantGeographyScope } from '@/lib/philippines-geography'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const scopeLevels: GeoScopeLevel[] = ['country', 'region', 'province', 'municipality']

type CoverageLockRow = {
  scope_level?: GeoScopeLevel
  region_code?: string | null
  province_code?: string | null
  municipality_code?: string | null
}

type QueryResult<T> = {
  data: T | null
  error: Error | null
}

type SupabaseQueryBuilder = {
  select(columns: string): SupabaseQueryBuilder
  eq(column: string, value: unknown): SupabaseQueryBuilder
  order(column: string, options: { ascending: boolean }): SupabaseQueryBuilder
  limit(count: number): SupabaseQueryBuilder
  upsert(values: Record<string, unknown>, options: { onConflict: string }): SupabaseQueryBuilder
  maybeSingle<T = Record<string, unknown>>(): Promise<QueryResult<T>>
  single<T = Record<string, unknown>>(): Promise<QueryResult<T>>
}

type SupabaseDataClient = {
  from(table: string): SupabaseQueryBuilder
}

async function createDataClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase URL or service role key is missing.')
  }

  if (/placeholder|your-|example|changeme/i.test(supabaseUrl) || /placeholder|your-|example|changeme/i.test(serviceRoleKey)) {
    throw new Error('Supabase coverage storage is not configured yet.')
  }

  return await createAdminClient() as unknown as SupabaseDataClient
}

function rowToScope(row: CoverageLockRow | null): TenantGeographyScope {
  if (!row?.scope_level) return DEMO_TENANT_GEO_SCOPE

  return {
    level: row.scope_level,
    regionCode: row.region_code ?? undefined,
    provinceCode: row.province_code ?? undefined,
    municipalityCode: row.municipality_code ?? undefined,
  }
}

function normalizeScope(input: unknown): TenantGeographyScope {
  const candidate = (input ?? {}) as Partial<TenantGeographyScope>
  const level = scopeLevels.includes(candidate.level as GeoScopeLevel)
    ? candidate.level as GeoScopeLevel
    : null

  if (!level) throw new Error('Choose a valid buyer coverage level.')
  if (level === 'country') return { level: 'country' }

  if (level === 'region') {
    const region = PH_REGIONS.find((item) => item.code === candidate.regionCode)
    if (!region) throw new Error('Choose a valid region.')
    return { level, regionCode: region.code }
  }

  if (level === 'province') {
    const province = PH_PROVINCES.find((item) => item.code === candidate.provinceCode)
    if (!province) throw new Error('Choose a valid province.')
    return { level, regionCode: province.regionCode, provinceCode: province.code }
  }

  const locality = PH_LOCALITIES.find((item) => item.code === candidate.municipalityCode)
  if (!locality) throw new Error('Choose a valid city or municipality.')

  return {
    level,
    regionCode: locality.regionCode,
    provinceCode: locality.provinceCode ?? undefined,
    municipalityCode: locality.code,
  }
}

async function getDefaultOrganizationId() {
  const supabase = await createDataClient()

  const bySlug = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', DEMO_ORGANIZATION.slug)
    .maybeSingle()

  if (bySlug.error) throw bySlug.error
  const bySlugData = bySlug.data as { id?: string } | null
  if (bySlugData?.id) return String(bySlugData.id)

  const fallback = await supabase
    .from('organizations')
    .select('id')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (fallback.error) throw fallback.error
  const fallbackData = fallback.data as { id?: string } | null
  if (fallbackData?.id) return String(fallbackData.id)

  throw new Error('No active organization found for this deployment.')
}

function serviceUnavailable(error: unknown) {
  const message = getErrorMessage(error, 'Coverage lock storage is not available.')

  return NextResponse.json(
    {
      scope: DEMO_TENANT_GEO_SCOPE,
      persistence: 'demo',
      message,
    },
    { status: 503 }
  )
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message ?? fallback)
  }
  return fallback
}

export async function GET() {
  try {
    const supabase = await createDataClient()
    const organizationId = await getDefaultOrganizationId()

    const { data, error } = await supabase
      .from('organization_geo_scopes')
      .select('scope_level, region_code, province_code, municipality_code')
      .eq('organization_id', organizationId)
      .maybeSingle()

    if (error) throw error

    return NextResponse.json({
      scope: rowToScope(data as CoverageLockRow | null),
      persistence: 'supabase',
      psgcVersion: PSGC_VERSION_LABEL,
    })
  } catch (error) {
    return serviceUnavailable(error)
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const scope = normalizeScope(body?.scope)
    const supabase = await createDataClient()
    const organizationId = await getDefaultOrganizationId()

    const { data, error } = await supabase
      .from('organization_geo_scopes')
      .upsert(
        {
          organization_id: organizationId,
          scope_level: scope.level,
          region_code: scope.regionCode ?? null,
          province_code: scope.provinceCode ?? null,
          municipality_code: scope.municipalityCode ?? null,
          psgc_version: PSGC_VERSION_LABEL,
        },
        { onConflict: 'organization_id' }
      )
      .select('scope_level, region_code, province_code, municipality_code')
      .single()

    if (error) throw error

    return NextResponse.json({
      scope: rowToScope(data as CoverageLockRow),
      persistence: 'supabase',
      psgcVersion: PSGC_VERSION_LABEL,
    })
  } catch (error) {
    const message = getErrorMessage(error, 'Unable to save coverage lock.')
    return NextResponse.json({ message }, { status: 400 })
  }
}
