'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Navigation, Clock, Truck, Loader2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatGpsAge } from '@/lib/tracking-estimate'

export interface TrackingData {
  responder_assigned: boolean
  unit_name: string | null
  responder_location: {
    latitude: number
    longitude: number
    heading: number | null
    speed: number | null
  } | null
  incident_location: {
    latitude: number
    longitude: number
  } | null
  distance_meters: number | null
  distance_display: string | null
  eta_minutes: number | null
  last_updated: string | null
  is_stale: boolean
  gps_age_seconds: number | null
  estimate_source: 'road_route' | 'approximate' | null
  estimate_note: string | null
}

interface RescueTrackingMapProps {
  incidentId: string
  /** Polling interval in ms (default 10000) */
  pollInterval?: number
  /** Show full map or compact card */
  variant?: 'full' | 'compact'
  className?: string
  /** Dark mode for dispatch page */
  dark?: boolean
}

function escapeMapText(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] ?? character)
}

export function RescueTrackingMap({
  incidentId,
  pollInterval = 10000,
  variant = 'full',
  className,
  dark = false,
}: RescueTrackingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const responderMarkerRef = useRef<L.Marker | null>(null)
  const routeLineRef = useRef<L.Polyline | null>(null)
  const [tracking, setTracking] = useState<TrackingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchTracking = useCallback(async () => {
    try {
      const res = await fetch(`/api/incidents/${incidentId}/tracking`, { cache: 'no-store' })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setTracking(data.tracking ?? null)
      setError(false)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [incidentId])

  // Poll for tracking data
  useEffect(() => {
    const initialFetch = setTimeout(fetchTracking, 0)
    const interval = setInterval(fetchTracking, pollInterval)
    return () => {
      clearTimeout(initialFetch)
      clearInterval(interval)
    }
  }, [fetchTracking, pollInterval])

  // Render/update map
  useEffect(() => {
    if (!mapRef.current || typeof window === 'undefined' || !tracking) return
    if (!tracking.incident_location) return

    import('leaflet').then((L) => {
      const incLat = tracking.incident_location!.latitude
      const incLng = tracking.incident_location!.longitude

      if (!mapInstance.current) {
        // Initialize map
        const map = L.map(mapRef.current!, {
          scrollWheelZoom: false,
          zoomControl: true,
          dragging: true,
        })
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap',
          maxZoom: 19,
        }).addTo(map)

        // SOS pin (red, pulsing)
        const sosIcon = L.divIcon({
          html: `<div style="position:relative">
            <div style="position:absolute;inset:-8px;border-radius:50%;background:rgba(239,68,68,0.25);animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite"></div>
            <div style="background:#dc2626;width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3" fill="#dc2626"/></svg>
            </div>
          </div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
          className: '',
        })
        L.marker([incLat, incLng], { icon: sosIcon })
          .addTo(map)
          .bindPopup('<b class="text-red-600">SOS Location</b><br>Emergency reported here')

        map.setView([incLat, incLng], 15)
        mapInstance.current = map
      }

      const map = mapInstance.current

      // Update or create responder marker
      if (tracking.responder_location) {
        const respLat = tracking.responder_location.latitude
        const respLng = tracking.responder_location.longitude
        const heading = tracking.responder_location.heading ?? 0
        const safeUnitName = escapeMapText(tracking.unit_name ?? 'Rescue Team')

        const rescueIcon = L.divIcon({
          html: `<div style="background:#2563eb;width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;transform:rotate(${heading}deg)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L19 21l-7-4-7 4z"/></svg>
          </div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
          className: '',
        })

        if (responderMarkerRef.current) {
          responderMarkerRef.current.setLatLng([respLat, respLng])
          responderMarkerRef.current.setIcon(rescueIcon)
        } else {
          responderMarkerRef.current = L.marker([respLat, respLng], { icon: rescueIcon })
            .addTo(map)
            .bindPopup(`<b class="text-blue-600">${safeUnitName}</b><br>${tracking.is_stale ? 'Last known position — GPS delayed' : 'En route to scene'}`)
        }

        // Route line (dashed)
        if (routeLineRef.current) {
          routeLineRef.current.setLatLngs([[respLat, respLng], [incLat, incLng]])
        } else {
          routeLineRef.current = L.polyline(
            [[respLat, respLng], [incLat, incLng]],
            { color: '#3b82f6', weight: 3, dashArray: '8 6', opacity: 0.7 }
          ).addTo(map)
        }

        // Fit bounds to show both markers
        const bounds = L.latLngBounds(
          [respLat, respLng],
          [incLat, incLng]
        )
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 })
      }
    })

    return () => {
      // Don't destroy map on every re-render, only on unmount
    }
  }, [tracking])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
        responderMarkerRef.current = null
        routeLineRef.current = null
      }
    }
  }, [])

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center py-6', className)}>
        <Loader2 className={cn('w-5 h-5 animate-spin', dark ? 'text-blue-400' : 'text-blue-500')} />
        <span className={cn('text-sm ml-2', dark ? 'text-slate-400' : 'text-slate-500')}>Loading tracking...</span>
      </div>
    )
  }

  if (error || !tracking) return null

  if (!tracking.responder_assigned) return null

  // Compact variant — just distance + ETA card (for resident page)
  if (variant === 'compact') {
    return (
      <div className={cn('rounded-xl overflow-hidden border-2', className,
        tracking.is_stale && tracking.responder_location ? 'border-amber-400/60 bg-amber-50' : tracking.responder_location ? 'border-blue-400/50 bg-blue-50' : 'border-slate-200 bg-slate-50'
      )}>
        {/* Leaflet CSS */}
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
        <style>{`@keyframes ping{75%,100%{transform:scale(2);opacity:0}}`}</style>
        {/* Mini map */}
        {tracking.responder_location && (
          <div ref={mapRef} className="h-40 w-full" />
        )}

        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className={cn('w-2.5 h-2.5 rounded-full', tracking.is_stale ? 'bg-amber-500' : 'bg-blue-500 animate-pulse')} />
            <span className={cn('text-sm font-semibold', tracking.is_stale ? 'text-amber-800' : 'text-blue-700')}>
              {tracking.unit_name ?? 'Rescue Team'} {tracking.is_stale ? '— GPS signal delayed' : 'is responding'}
            </span>
          </div>

          {tracking.responder_location ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-blue-200">
                <Navigation className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-xs text-slate-500">Distance</p>
                  <p className="text-lg font-bold text-slate-900">{tracking.distance_display ?? '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-blue-200">
                <Clock className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="text-xs text-slate-500">ETA</p>
                  <p className="text-lg font-bold text-slate-900">
                    {tracking.eta_minutes != null ? `~${tracking.eta_minutes} min` : '—'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-slate-200">
              <Truck className="w-5 h-5 text-blue-500 animate-pulse" />
              <p className="text-sm text-slate-600">Rescue team is preparing to depart...</p>
            </div>
          )}

          {tracking.is_stale && tracking.responder_location && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-100 p-3 text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-xs">GPS signal delayed. This is the last known position; ETA will resume after a new update.</p>
            </div>
          )}

          {tracking.estimate_note && <p className="text-[10px] text-slate-500 text-center">{tracking.estimate_note}</p>}

          {tracking.last_updated && (
            <p className="text-[10px] text-slate-400 text-center">
              GPS updated {formatGpsAge(tracking.gps_age_seconds)}
            </p>
          )}
        </div>
      </div>
    )
  }

  // Full variant — map + info bar (for dispatch page)
  return (
    <div className={cn('rounded-lg overflow-hidden border', className,
      dark ? 'border-slate-700' : 'border-slate-200'
    )}>
      {/* Leaflet CSS */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
      <style>{`@keyframes ping{75%,100%{transform:scale(2);opacity:0}}`}</style>
      {/* Map */}
      <div ref={mapRef} className="h-52 w-full" />

      {/* Info bar */}
      <div className={cn('px-3 py-2.5 flex flex-wrap items-center gap-3 text-xs',
        dark ? 'bg-slate-800' : 'bg-slate-50'
      )}>
        {/* Legend */}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-600 border-2 border-white shadow-sm" />
          <span className={dark ? 'text-slate-400' : 'text-slate-500'}>SOS</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow-sm" />
          <span className={dark ? 'text-slate-400' : 'text-slate-500'}>
            {tracking.unit_name ?? 'Rescuer'}
          </span>
        </div>

        {/* Distance & ETA */}
        <div className="ml-auto flex items-center gap-3">
          {tracking.is_stale && tracking.responder_location && (
            <span className={cn('inline-flex items-center gap-1 font-medium', dark ? 'text-amber-400' : 'text-amber-700')}>
              <AlertTriangle className="h-3.5 w-3.5" /> GPS delayed ({formatGpsAge(tracking.gps_age_seconds)})
            </span>
          )}
          {tracking.distance_display && (
            <span className={cn('font-semibold', dark ? 'text-blue-400' : 'text-blue-600')}>
              {tracking.distance_display}
            </span>
          )}
          {tracking.eta_minutes != null && (
            <span className={cn(
              'px-2 py-0.5 rounded-full font-bold',
              dark ? 'bg-amber-900/40 text-amber-400' : 'bg-amber-100 text-amber-700'
            )}>
              ETA ~{tracking.eta_minutes} min
            </span>
          )}
          {!tracking.responder_location && (
            <span className={dark ? 'text-slate-500' : 'text-slate-400'}>
              Awaiting GPS signal...
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
