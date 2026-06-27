import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

/**
 * POST /api/responder/location
 * Responder sends their current GPS position while on a mission.
 * Body: { latitude, longitude, accuracy?, heading?, speed?, incident_id? }
 */
export async function POST(request: Request) {
  try {
    const client = await createClient()
    const { data: { user } } = await client.auth.getUser()
    if (!user) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { latitude, longitude, accuracy, heading, speed, incident_id } = body

    const lat = Number(latitude)
    const lng = Number(longitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json({ message: 'Valid latitude and longitude are required' }, { status: 400 })
    }

    // Supabase's generated table map is intentionally sparse in this project.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = await createAdminClient() as any

    // Get user's profile to find their rescue unit
    const { data: profile } = await admin
      .from('user_profiles')
      .select('id, role, organization_id, rescue_unit_id, is_active, registration_status')
      .eq('user_id', user.id)
      .single()

    if (!profile?.is_active || !['responder', 'team_leader'].includes(profile.role) || (profile.registration_status && profile.registration_status !== 'approved')) {
      return NextResponse.json({ message: 'Not a responder' }, { status: 403 })
    }

    const { data: memberships } = await admin
      .from('rescue_unit_members')
      .select('unit_id')
      .eq('user_id', profile.id)
      .eq('is_active', true)
    const unitIds = Array.from(new Set([
      ...(profile.rescue_unit_id ? [profile.rescue_unit_id] : []),
      ...(memberships ?? []).map((membership: { unit_id: string }) => membership.unit_id),
    ]))

    if (unitIds.length === 0) {
      return NextResponse.json({ message: 'Responder is not assigned to a rescue unit' }, { status: 403 })
    }

    // Find the active incident for this responder (or use provided incident_id)
    let activeIncidentId = incident_id
    let rescueUnitId: string | null = null

    if (!activeIncidentId) {
      // Find incident assigned to a rescue unit that this user is a member of
      const { data: activeIncident } = await admin
        .from('incidents')
        .select('id, assigned_unit_id')
        .in('assigned_unit_id', unitIds)
        .in('status', ['assigned', 'accepted', 'dispatched', 'on_the_way', 'arrived', 'operation_in_progress'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (activeIncident) {
        activeIncidentId = activeIncident.id
        rescueUnitId = activeIncident.assigned_unit_id
      }
    }

    if (!activeIncidentId) {
      return NextResponse.json({ message: 'No active incident found' }, { status: 404 })
    }

    // If we don't have rescue unit id yet, get it from the incident
    if (!rescueUnitId) {
      const { data: inc } = await admin
        .from('incidents')
        .select('assigned_unit_id, organization_id, status')
        .eq('id', activeIncidentId)
        .single()
      if (!inc || inc.organization_id !== profile.organization_id || !unitIds.includes(inc.assigned_unit_id) || !['assigned', 'accepted', 'dispatched', 'on_the_way', 'arrived', 'operation_in_progress'].includes(inc.status)) {
        return NextResponse.json({ message: 'Mission is not assigned to this responder' }, { status: 403 })
      }
      rescueUnitId = inc.assigned_unit_id
    }

    if (!rescueUnitId) {
      return NextResponse.json({ message: 'No rescue unit assigned' }, { status: 400 })
    }

    // Insert location record
    const { error } = await admin.from('responder_locations').insert({
      incident_id: activeIncidentId,
      rescue_unit_id: rescueUnitId,
      user_id: user.id,
      latitude: lat,
      longitude: lng,
      accuracy: accuracy ?? null,
      heading: heading ?? null,
      speed: speed ?? null,
    })

    if (error) {
      console.error('Failed to save responder location:', error)
      return NextResponse.json({ message: 'Failed to save location' }, { status: 500 })
    }

    await admin.from('rescue_units').update({
      current_lat: lat,
      current_lng: lng,
      last_location_update: new Date().toISOString(),
    }).eq('id', rescueUnitId)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Responder location error:', err)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}
