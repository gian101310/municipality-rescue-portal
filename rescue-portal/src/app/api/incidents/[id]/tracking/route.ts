import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getGpsFreshness } from '@/lib/tracking-estimate'

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

async function getDrivingEstimate(from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 2500)
  try {
    const coordinates = `${from.longitude},${from.latitude};${to.longitude},${to.latitude}`
    const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=false&steps=false`, {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'rescue-portal.ph/1.0' },
      cache: 'no-store',
    })
    if (!response.ok) return null
    const payload = await response.json() as { routes?: Array<{ distance?: number; duration?: number }> }
    const route = payload.routes?.[0]
    if (!Number.isFinite(route?.distance) || !Number.isFinite(route?.duration)) return null
    return { distanceMeters: Math.round(route!.distance!), etaMinutes: Math.max(1, Math.ceil(route!.duration! / 60)) }
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
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
      const hasIncidentCoordinates = Number.isFinite(incident.latitude) && Number.isFinite(incident.longitude)
      return NextResponse.json({
        tracking: {
          responder_assigned: true,
          unit_name: incident.assigned_unit_name ?? null,
          responder_location: null,
          incident_location: hasIncidentCoordinates ? {
            latitude: incident.latitude,
            longitude: incident.longitude,
          } : null,
          distance_meters: null,
          distance_display: null,
          eta_minutes: null,
          last_updated: null,
          is_stale: true,
          gps_age_seconds: null,
          estimate_source: null,
          estimate_note: 'Waiting for the rescue team to share live GPS.',
        },
      })
    }

    // Prefer a road route for fresh GPS. Never present an ETA from delayed GPS as current.
    const hasIncidentCoordinates = Number.isFinite(incident.latitude) && Number.isFinite(incident.longitude)
    const directDistance = hasIncidentCoordinates
      ? haversineDistance(
          latestLocation.latitude, latestLocation.longitude,
          incident.latitude, incident.longitude
        )
      : null
    const freshness = getGpsFreshness(latestLocation.created_at)
    const roadEstimate = !freshness.isStale && hasIncidentCoordinates
      ? await getDrivingEstimate(
          { latitude: latestLocation.latitude, longitude: latestLocation.longitude },
          { latitude: incident.latitude, longitude: incident.longitude }
        )
      : null
    const distanceMeters = roadEstimate?.distanceMeters ?? (directDistance != null ? Math.round(directDistance * 1.25) : null)
    const etaMinutes = freshness.isStale
      ? null
      : roadEstimate?.etaMinutes ?? (distanceMeters != null ? estimateETA(distanceMeters, latestLocation.speed) : null)
    const estimateSource = roadEstimate ? 'road_route' : distanceMeters != null ? 'approximate' : null

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
        incident_location: hasIncidentCoordinates ? {
          latitude: incident.latitude,
          longitude: incident.longitude,
        } : null,
        distance_meters: distanceMeters != null ? Math.round(distanceMeters) : null,
        distance_display: distanceDisplay,
        eta_minutes: etaMinutes,
        last_updated: latestLocation.created_at,
        is_stale: freshness.isStale,
        gps_age_seconds: freshness.ageSeconds,
        estimate_source: estimateSource,
        estimate_note: freshness.isStale
          ? 'GPS signal delayed. Distance uses the last known position and ETA is paused.'
          : roadEstimate
          ? 'Distance and ETA follow the current road route.'
          : distanceMeters != null
          ? 'Approximate distance and ETA while road routing is unavailable.'
          : 'Incident coordinates are unavailable.',
      },
    })
  } catch (err) {
    console.error('Tracking error:', err)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}
