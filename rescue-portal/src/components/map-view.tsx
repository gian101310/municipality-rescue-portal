'use client'

import { useEffect, useRef, useState } from 'react'
import type { SeverityLevel } from '@/lib/types'
import { getSeverityHexColor } from '@/lib/utils'

export interface MapMarker {
  id: string
  lat: number
  lng: number
  label?: string
  severity?: SeverityLevel
  color?: string
  pulse?: boolean
}

interface MapViewProps {
  center: { lat: number; lng: number }
  zoom?: number
  markers?: MapMarker[]
  selectedMarkerId?: string | null
  onMarkerClick?: (id: string) => void
  className?: string
  height?: string
}

export function MapView({
  center,
  zoom = 13,
  markers = [],
  selectedMarkerId,
  onMarkerClick,
  className = '',
  height = '400px',
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.CircleMarker[]>([])
  const [leafletLoaded, setLeafletLoaded] = useState(false)
  const LRef = useRef<typeof import('leaflet') | null>(null)

  // Dynamically import Leaflet (SSR-safe)
  useEffect(() => {
    let cancelled = false
    async function loadLeaflet() {
      const L = await import('leaflet')
      if (!cancelled) {
        LRef.current = L
        setLeafletLoaded(true)
      }
    }
    loadLeaflet()
    return () => { cancelled = true }
  }, [])

  // Initialize map
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current || mapRef.current) return
    const L = LRef.current!

    const map = L.map(mapContainerRef.current, {
      center: [center.lat, center.lng],
      zoom,
      zoomControl: true,
      attributionControl: true,
    })

    // Dark tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map)

    mapRef.current = map

    // Fix Leaflet icon issue in Next.js
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leafletLoaded])

  // Update center/zoom
  useEffect(() => {
    if (!mapRef.current) return
    mapRef.current.setView([center.lat, center.lng], zoom, { animate: true })
  }, [center.lat, center.lng, zoom])

  // Update markers
  useEffect(() => {
    if (!mapRef.current || !LRef.current) return
    const L = LRef.current
    const map = mapRef.current

    // Clear existing markers
    markersRef.current.forEach((m) => map.removeLayer(m))
    markersRef.current = []

    markers.forEach((marker) => {
      const color = marker.color || (marker.severity ? getSeverityHexColor(marker.severity) : '#3b82f6')
      const isSelected = marker.id === selectedMarkerId
      const radius = isSelected ? 12 : 9

      // Pulse ring for selected/critical
      if (isSelected || marker.severity === 'critical') {
        const pulseRing = L.circleMarker([marker.lat, marker.lng], {
          radius: radius + 8,
          color: color,
          fillColor: color,
          fillOpacity: 0.15,
          weight: 2,
          opacity: 0.4,
          className: 'pulse-marker',
        }).addTo(map)
        markersRef.current.push(pulseRing)
      }

      // Main marker
      const circleMarker = L.circleMarker([marker.lat, marker.lng], {
        radius,
        color: isSelected ? '#ffffff' : color,
        fillColor: color,
        fillOpacity: 0.9,
        weight: isSelected ? 3 : 2,
        opacity: 1,
      }).addTo(map)

      // Popup
      if (marker.label) {
        const severityLabel = marker.severity
          ? `<span style="color:${color};font-weight:600;text-transform:uppercase;">${marker.severity}</span>`
          : ''
        circleMarker.bindPopup(
          `<div style="font-family:system-ui;min-width:140px;">
            <div style="font-weight:700;font-size:13px;margin-bottom:4px;">${marker.label}</div>
            ${severityLabel}
            <div style="font-size:11px;color:#94a3b8;margin-top:2px;">
              ${marker.lat.toFixed(4)}, ${marker.lng.toFixed(4)}
            </div>
          </div>`,
          {
            className: 'dark-popup',
            closeButton: true,
          }
        )
      }

      // Tooltip (always visible for selected)
      if (marker.label) {
        circleMarker.bindTooltip(marker.label, {
          permanent: isSelected,
          direction: 'top',
          offset: [0, -radius - 4],
          className: 'dark-tooltip',
        })
      }

      circleMarker.on('click', () => {
        onMarkerClick?.(marker.id)
      })

      markersRef.current.push(circleMarker)
    })
  }, [markers, selectedMarkerId, onMarkerClick])

  // Pan to selected marker
  useEffect(() => {
    if (!mapRef.current || !selectedMarkerId) return
    const marker = markers.find((m) => m.id === selectedMarkerId)
    if (marker) {
      mapRef.current.panTo([marker.lat, marker.lng], { animate: true })
    }
  }, [selectedMarkerId, markers])

  return (
    <div className={`relative rounded-lg overflow-hidden border border-slate-700 ${className}`} style={{ height }}>
      {/* Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"
        crossOrigin=""
      />
      <style>{`
        .dark-popup .leaflet-popup-content-wrapper {
          background: #1e293b;
          color: #e2e8f0;
          border-radius: 8px;
          border: 1px solid #334155;
          box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        }
        .dark-popup .leaflet-popup-tip {
          background: #1e293b;
          border: 1px solid #334155;
        }
        .dark-popup .leaflet-popup-close-button {
          color: #94a3b8 !important;
        }
        .dark-tooltip {
          background: #0f172a !important;
          color: #e2e8f0 !important;
          border: 1px solid #334155 !important;
          border-radius: 4px !important;
          font-size: 11px !important;
          font-weight: 600 !important;
          padding: 2px 6px !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4) !important;
        }
        .dark-tooltip::before {
          border-top-color: #334155 !important;
        }
        .pulse-marker {
          animation: pulse-ring 2s ease-out infinite;
        }
        @keyframes pulse-ring {
          0% { opacity: 0.6; }
          50% { opacity: 0.2; }
          100% { opacity: 0.6; }
        }
        .leaflet-control-zoom a {
          background: #1e293b !important;
          color: #e2e8f0 !important;
          border-color: #334155 !important;
        }
        .leaflet-control-zoom a:hover {
          background: #334155 !important;
        }
        .leaflet-control-attribution {
          background: rgba(15,23,42,0.8) !important;
          color: #64748b !important;
          font-size: 10px !important;
        }
        .leaflet-control-attribution a {
          color: #94a3b8 !important;
        }
      `}</style>

      {/* Map container */}
      <div ref={mapContainerRef} className="w-full h-full" style={{ background: '#0f172a' }} />

      {/* Loading state */}
      {!leafletLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            <span className="text-xs text-slate-400">Loading map...</span>
          </div>
        </div>
      )}

      {/* Live badge */}
      <div className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur rounded px-2 py-1 text-xs text-green-400 flex items-center gap-1.5 z-[1000]">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        LIVE
      </div>
    </div>
  )
}
