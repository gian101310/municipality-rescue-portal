import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Public endpoint: given a municipality (organization) ID via ?id=...,
 * returns the organization name, hotline, branding, and geo scope
 * so the registration page can lock fields and show local info.
 */
export async function GET(request: NextRequest) {
  const orgId = request.nextUrl.searchParams.get('id')?.trim()
  if (!orgId) {
    return NextResponse.json({ message: 'Municipality ID is required.' }, { status: 400 })
  }

  try {
    const admin = await createAdminClient() as any

    const { data: org, error: orgError } = await admin
      .from('organizations')
      .select('id, name, slug, emergency_hotline, secondary_hotline, branding, is_active')
      .eq('id', orgId)
      .eq('is_active', true)
      .maybeSingle()

    if (orgError) throw new Error(orgError.message)
    if (!org) {
      return NextResponse.json({ message: 'Municipality not found or inactive.' }, { status: 404 })
    }

    // Fetch geo scope for this org so registration can lock region/province/municipality
    const { data: geoScopes } = await admin
      .from('organization_geo_scopes')
      .select('scope_level, region_code, province_code, municipality_code')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(1)

    const geoScope = geoScopes?.[0] ?? null

    // Fetch barangays for this org so registration can show them in dropdown
    const { data: barangays } = await admin
      .from('barangays')
      .select('id, name')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('name')

    return NextResponse.json({
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        hotline: org.emergency_hotline ?? null,
        secondaryHotline: org.secondary_hotline ?? null,
        description: (org.branding as any)?.localDescription ?? null,
        dialect: (org.branding as any)?.dialect ?? null,
      },
      geoScope,
      barangays: barangays ?? [],
    })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to load municipality info.' },
      { status: 500 }
    )
  }
}
