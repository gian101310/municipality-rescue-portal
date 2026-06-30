import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

type StaffProfile = {
  id: string
  full_name: string
  role: string
  organization_id: string
  is_active: boolean
}

async function staff(): Promise<StaffProfile | null> {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return null
  const { data } = await client
    .from('user_profiles')
    .select('id, full_name, role, organization_id, is_active')
    .eq('user_id', user.id)
    .single()
  return data as StaffProfile | null
}

export async function GET() {
  const profile = await staff()
  if (!profile?.is_active) return NextResponse.json({ message: 'Sign in required.' }, { status: 401 })

  // The generated schema intentionally keeps legacy tables as Record<string, unknown>.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = await createAdminClient() as any
  const { data, error } = await admin
    .from('organizations')
    .select('name, province, region, logo_url, emergency_hotline, secondary_hotline, email, map_center_lat, map_center_lng, branding')
    .eq('id', profile.organization_id)
    .single()
  if (error) return NextResponse.json({ message: error.message }, { status: 500 })
  return NextResponse.json({ settings: data })
}

export async function PUT(request: Request) {
  const profile = await staff()
  if (!profile?.is_active || !['admin', 'super_admin'].includes(profile.role)) {
    return NextResponse.json({ message: 'Admin access required.' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const name = String(body.name ?? '').trim()
  const emergencyHotline = String(body.emergency_hotline ?? '').trim()
  const secondaryHotline = String(body.secondary_hotline ?? '').trim()
  const email = String(body.email ?? '').trim()
  const mapCenterLat = Number(body.map_center_lat)
  const mapCenterLng = Number(body.map_center_lng)
  if (!name || !emergencyHotline) {
    return NextResponse.json({ message: 'Organization name and emergency hotline are required.' }, { status: 400 })
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ message: 'Enter a valid contact email.' }, { status: 400 })
  }
  if (!Number.isFinite(mapCenterLat) || mapCenterLat < -90 || mapCenterLat > 90 || !Number.isFinite(mapCenterLng) || mapCenterLng < -180 || mapCenterLng > 180) {
    return NextResponse.json({ message: 'Map coordinates are invalid.' }, { status: 400 })
  }

  // The generated schema intentionally keeps legacy tables as Record<string, unknown>.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = await createAdminClient() as any
  const { data: current, error: currentError } = await admin
    .from('organizations')
    .select('name, emergency_hotline, secondary_hotline, email, map_center_lat, map_center_lng, branding')
    .eq('id', profile.organization_id)
    .single()
  if (currentError || !current) return NextResponse.json({ message: 'Organization settings are unavailable.' }, { status: 404 })

  const branding = {
    ...(current.branding ?? {}),
    localDescription: String(body.localDescription ?? '').trim(),
    dialect: String(body.dialect ?? '').trim(),
  }
  const updates = {
    name,
    emergency_hotline: emergencyHotline,
    secondary_hotline: secondaryHotline || null,
    email: email || null,
    map_center_lat: mapCenterLat,
    map_center_lng: mapCenterLng,
    branding,
    updated_at: new Date().toISOString(),
  }
  const { data, error } = await admin
    .from('organizations')
    .update(updates)
    .eq('id', profile.organization_id)
    .select('*')
    .single()
  if (error) return NextResponse.json({ message: error.message }, { status: 400 })

  await admin.from('audit_logs').insert({
    actor_id: profile.id,
    actor_name: profile.full_name,
    actor_role: profile.role,
    action: 'update',
    entity_type: 'organization_settings',
    entity_id: profile.organization_id,
    previous_values: current,
    new_values: updates,
    organization_id: profile.organization_id,
  })
  return NextResponse.json({ settings: data })
}
