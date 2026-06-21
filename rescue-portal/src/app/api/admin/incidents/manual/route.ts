import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Sign in required.' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, role, organization_id, is_active, full_name')
    .eq('user_id', user.id)
    .single() as any

  if (!profile?.is_active || !['admin', 'super_admin', 'dispatcher'].includes(profile.role)) {
    return NextResponse.json({ message: 'Admin or dispatcher access required.' }, { status: 403 })
  }

  const body = await request.json()
  const { emergency_type_id, description, reporter_name, reporter_phone, barangay, severity } = body

  if (!emergency_type_id || !description?.trim()) {
    return NextResponse.json({ message: 'Emergency type and description are required.' }, { status: 400 })
  }

  try {
    const admin = await createAdminClient() as any

    // Get org info for default coordinates
    const { data: org } = await admin
      .from('organizations')
      .select('name, branding')
      .eq('id', profile.organization_id)
      .single()

    const branding = org?.branding ?? {}
    const defaultLat = branding.mapCenterLat ?? 14.5995
    const defaultLng = branding.mapCenterLng ?? 120.9842

    // Generate reference number
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
    const rand = Math.random().toString(36).slice(2, 8).toUpperCase()
    const referenceNumber = `MAN-${dateStr}-${rand}`

    const { data: incident, error } = await admin
      .from('incidents')
      .insert({
        organization_id: profile.organization_id,
        emergency_type_id,
        description: description.trim(),
        reporter_name: reporter_name || 'Walk-in / Call-in',
        reporter_phone: reporter_phone || null,
        barangay: barangay || null,
        severity: severity || 'moderate',
        status: 'received',
        intake_state: 'complete',
        reference_number: referenceNumber,
        latitude: defaultLat,
        longitude: defaultLng,
        gps_accuracy: null,
        source: 'admin_manual',
        created_by: profile.id,
        affected_count: 1,
        has_unconscious: false,
        has_fire: false,
        has_flooding: false,
      })
      .select('id, reference_number')
      .single()

    if (error) throw new Error(error.message)

    // Add timeline entry
    await admin.from('incident_timeline').insert({
      incident_id: incident.id,
      status: 'received',
      label: 'Manual alert created',
      actor_id: profile.id,
      actor_name: profile.full_name,
      actor_role: profile.role,
      note: `Created manually by ${profile.full_name} via command center`,
    })

    return NextResponse.json({
      id: incident.id,
      reference_number: incident.reference_number,
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to create manual alert.' },
      { status: 500 }
    )
  }
}
