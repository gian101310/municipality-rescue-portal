import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) {
    return NextResponse.json({ message: 'Please sign in first.' }, { status: 401 })
  }

  const { data: rawProfile } = await client
    .from('user_profiles')
    .select('organization_id, is_active')
    .eq('user_id', user.id)
    .single()
  const profile = rawProfile as null | { organization_id: string | null; is_active: boolean }
  if (!profile?.is_active || !profile.organization_id) {
    return NextResponse.json({ message: 'An active organization profile is required.' }, { status: 403 })
  }

  const admin = await createAdminClient()
  const { data: rawOrganization, error } = await admin
    .from('organizations')
    .select('name, emergency_hotline, secondary_hotline, email, map_center_lat, map_center_lng')
    .eq('id', profile.organization_id)
    .eq('is_active', true)
    .single()
  if (error || !rawOrganization) {
    return NextResponse.json({ message: 'Organization settings are unavailable.' }, { status: 404 })
  }

  const organization = rawOrganization as {
    name: string
    emergency_hotline: string
    secondary_hotline: string | null
    email: string | null
    map_center_lat: number
    map_center_lng: number
  }

  return NextResponse.json({
    settings: {
      municipalityName: organization.name,
      hotline: organization.emergency_hotline,
      secondaryHotline: organization.secondary_hotline ?? '',
      email: organization.email ?? '',
      mapCenterLat: organization.map_center_lat,
      mapCenterLng: organization.map_center_lng,
    },
  })
}
