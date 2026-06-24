'use client'

import { useEffect, useRef } from 'react'
import { MapPin, Navigation } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DualLocationMapProps {
  /** Original GPS when SOS was created (red pin) */
  originalLat: number
  originalLng: number
  /** Latest GPS when SOS was sent/synced (blue pin) — may be same as original */
  sentLat?: number | null
  sentLng?: number | null
  /** Distance between the two in meters */
  distanceMeters?: number | null
  /** Time difference between creation and sync */
  delayMinutes?: number | null
  className?: string
}

export function DualLocationMap({
  originalLat,
  originalLng,
  sentLat,
  sentLng,
  distanceMeters,
  delayMinutes,
  className,
}: DualLocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)

  const hasDualLocation = sentLat != null && sentLng != null &&
    (Math.abs(sentLat - originalLat) > 0.00001 || Math.abs(sentLng - originalLng) > 0.00001)

  useEffect(() => {
    if (!mapRef.current || typeof window === 'undefined') return

    // Dynamic import of Leaflet
    import('leaflet').then((L) => {
      if (mapInstance.current) {
        mapInstance.current.remove()
      }

      const map = L.map(mapRef.current!, {
        scrollWheelZoom: false,
        zoomControl: true,
        dragging: true,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map)

      // Red pin — original location
      const redIcon = L.divIcon({
        html: `<div style="background:#dc2626;width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        className: '',
      })
      L.marker([originalLat, originalLng], { icon: redIcon })
        .addTo(map)
        .bindPopup('<b>Original Location</b><br>Where SOS was created')

      if (hasDualLocation) {
        // Blue pin — sent location
        const blueIcon = L.divIcon({
          html: `<div style="background:#2563eb;width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
          className: '',
        })
        L.marker([sentLat!, sentLng!], { icon: blueIcon })
          .addTo(map)
          .bindPopup('<b>Sent Location</b><br>Where SOS was synced')

        // Dashed line between points
        L.polyline(
          [[originalLat, originalLng], [sentLat!, sentLng!]],
          { color: '#6366f1', weight: 2, dashArray: '6 4', opacity: 0.7 }
        ).addTo(map)

        // Fit bounds to show both pins
        const bounds = L.latLngBounds(
          [originalLat, originalLng],
          [sentLat!, sentLng!]
        )
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 })
      } else {
        map.setView([originalLat, originalLng], 16)
      }

      mapInstance.current = map
    })

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
      }
    }
  }, [originalLat, originalLng, sentLat, sentLng, hasDualLocation])

  return (
    <div className={cn('rounded-lg overflow-hidden border border-slate-200', className)}>
      {/* Map */}
      <div ref={mapRef} className="h-48 w-full" />

      {/* Legend */}
      <div className="bg-slate-50 px-3 py-2 flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-red-600" />
          <span className="text-slate-600">Original</span>
        </div>
        {hasDualLocation && (
          <>
            <div className="flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-slate-600">Sent</span>
            </div>
            {distanceMeters != null && (
              <span className="text-slate-400 ml-auto">
                {distanceMeters >= 1000
                  ? `${(distanceMeters / 1000).toFixed(1)} km moved`
                  : `${Math.round(distanceMeters)} m moved`}
                {delayMinutes != null && delayMinutes > 0 && (
                  <> in {Math.round(delayMinutes)} min</>
                )}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  )
}
