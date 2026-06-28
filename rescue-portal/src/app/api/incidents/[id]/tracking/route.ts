import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

/**
 * Haversine distance between two coordinates in meters
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000 // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Estimate ETA in minutes based on distance.
 * Uses average urban rescue vehicle speed (~30 km/h in Philippine municipal roads).
 * If responder speed is available, uses that instead.
 */
function estimateETA(distanceMeters: number, speedMps?: number | null): number {
  const avgSpeedMps = speedMps && speedMps > 1 ? speedMps : (30 * 1000 / 3600) // 30 km/h default
  return Math.max(1, Math.round((distanceMeters / avgSpeedMps) / 60))
}

/**
 * GET /api/incidents/[id]/tracking
 * Returns the latest responder location, distance to SOS, and ETA.
 * Accessible by admins, dispatchers, and the resident who filed the incident.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const client = await createClient()
    const { data: { user } } = await client.auth.getUser()
    if (!user) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    }

    // Supabase's generated table map is intentionally sparse in this project.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = await createAdminClient() as any

    // Get the incident
    const { data: incident, error: incError } = await admin
      .from('incidents')
      .select('id, latitude, longitude, assigned_unit_id, assigned_unit_name, status, reporter_id, organization_id')
      .eq('id', id)
      .single()

    if (incError || !incident) {
      return NextResponse.json({ message: 'Incident not found' }, { status: 404 })
    }

    // Auth check: user must be the reporter, or an admin/dispatcher in the same org
    const { data: profile } = await admin
      .from('user_profiles')
      .select('id, role, organization_id, rescue_unit_id')
      .eq('user_id', user.id)
      .single()

    const isReporter = profile && incident.reporter_id === user.id
    const isPrivilegedStaff = profile && ['admin', 'dispatcher', 'staff', 'verifier'].includes(profile.role) && incident.organization_id === profile.organization_id
    const isSuperAdmin = profile?.role === 'super_admin'
    let isAssignedResponder = false
    if (profile && ['responder', 'team_leader'].includes(profile.role) && incident.assigned_unit_id) {
      const { data: memberships } = await admin
        .from('rescue_unit_members')
        .select('unit_id')
        .eq('user_id', profile.id)
        .eq('is_active', true)
      const unitIds = [
        ...(profile.rescue_unit_id ? [profile.rescue_unit_id] : []),
        ...(memberships ?? []).map((membership: { unit_id: string }) => membership.unit_id),
      ]
      isAssignedResponder = unitIds.includes(incident.assigned_unit_id)
    }

    if (!isReporter && !isPrivilegedStaff && !isSuperAdmin && !isAssignedResponder) {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 })
    }

    // No rescue unit assigned yet
    if (!incident.assigned_unit_id) {
      return NextResponse.json({
        tracking: null,
        message: 'No rescue unit assigned yet',
      })
    }

    // Get latest responder location for this incident
    const { data: latestLocation } = await admin
      .from('responder_locations')
      .select('*')
      .eq('incident_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!latestLocation) {
      return NextResponse.json({
        tracking: {
          responder_assigned: true,
          unit_name: incident.assigned_unit_name ?? null,
          responder_location: null,
          incident_location: {
            latitude: incident.latitude,
            longitude: incident.longitude,
          },
          distance_meters: null,
          distance_display: null,
          eta_minutes: null,
          last_updated: null,
        },
      })
    }

    // Calculate distance and ETA
    const hasIncidentCoordinates = Number.isFinite(incident.latitude) && Number.isFinite(incident.longitude)
    const distanceMeters = hasIncidentCoordinates
      ? haversineDistance(
          latestLocation.latitude, latestLocation.longitude,
          incident.latitude, incident.longitude
        )
      : null

    const etaMinutes = distanceMeters != null
      ? estimateETA(distanceMeters, latestLocation.speed)
      : null

    let distanceDisplay: string | null = null
    if (distanceMeters != null) {
      distanceDisplay = distanceMeters >= 1000
        ? `${(distanceMeters / 1000).toFixed(1)} km`
        : `${Math.round(distanceMeters)} m`
    }

    return NextResponse.json({
      tracking: {
        responder_assigned: true,
        unit_name: incident.assigned_unit_name ?? null,
        responder_location: {
          latitude: latestLocation.latitude,
          longitude: latestLocation.longitude,
          heading: latestLocation.heading,
          speed: latestLocation.speed,
        },
        incident_location: {
          latitude: incident.latitude,
          longitude: incident.longitude,
        },
        distance_meters: distanceMeters != null ? Math.round(distanceMeters) : null,
        distance_display: distanceDisplay,
        eta_minutes: etaMinutes,
        last_updated: latestLocation.created_at,
      },
    })
  } catch (err) {
    console.error('Tracking error:', err)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}
