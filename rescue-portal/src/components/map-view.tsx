'use client'

import { useEffect, useRef } from 'react'
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

function latLngToCanvas(
  lat: number,
  lng: number,
  centerLat: number,
  centerLng: number,
  zoom: number,
  width: number,
  height: number
): { x: number; y: number } {
  const scale = Math.pow(2, zoom) * 80
  const x = (lng - centerLng) * scale + width / 2
  const y = -(lat - centerLat) * scale + height / 2
  return { x, y }
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  centerLat: number,
  centerLng: number,
  zoom: number
) {
  ctx.strokeStyle = 'rgba(51, 65, 85, 0.6)'
  ctx.lineWidth = 0.5

  const step = 0.005
  const latRange = 0.08
  const lngRange = 0.12

  for (let lat = centerLat - latRange; lat <= centerLat + latRange; lat += step) {
    const start = latLngToCanvas(lat, centerLng - lngRange, centerLat, centerLng, zoom, width, height)
    const end = latLngToCanvas(lat, centerLng + lngRange, centerLat, centerLng, zoom, width, height)
    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    ctx.lineTo(end.x, end.y)
    ctx.stroke()
  }
  for (let lng = centerLng - lngRange; lng <= centerLng + lngRange; lng += step) {
    const start = latLngToCanvas(centerLat - latRange, lng, centerLat, centerLng, zoom, width, height)
    const end = latLngToCanvas(centerLat + latRange, lng, centerLat, centerLng, zoom, width, height)
    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    ctx.lineTo(end.x, end.y)
    ctx.stroke()
  }
}

function drawRoads(
  ctx: CanvasRenderingContext2D,
  centerLat: number,
  centerLng: number,
  zoom: number,
  width: number,
  height: number
) {
  const roads = [
    [[14.170, 121.236], [14.158, 121.248]],
    [[14.165, 121.240], [14.160, 121.246]],
    [[14.163, 121.241], [14.163, 121.249]],
    [[14.168, 121.238], [14.155, 121.238]],
  ]

  ctx.strokeStyle = 'rgba(71, 85, 105, 0.8)'
  ctx.lineWidth = 1.5

  for (const road of roads) {
    ctx.beginPath()
    road.forEach(([lat, lng], i) => {
      const { x, y } = latLngToCanvas(lat, lng, centerLat, centerLng, zoom, width, height)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()
  }
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
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const pulseRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    const W = rect.width
    const H = rect.height

    function draw(tick: number) {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, W, H)

      // Background
      ctx.fillStyle = '#0f172a'
      ctx.fillRect(0, 0, W, H)

      drawGrid(ctx, W, H, center.lat, center.lng, zoom)
      drawRoads(ctx, center.lat, center.lng, zoom, W, H)

      // Center cross
      const c = latLngToCanvas(center.lat, center.lng, center.lat, center.lng, zoom, W, H)
      ctx.strokeStyle = 'rgba(148,163,184,0.3)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(c.x - 8, c.y)
      ctx.lineTo(c.x + 8, c.y)
      ctx.moveTo(c.x, c.y - 8)
      ctx.lineTo(c.x, c.y + 8)
      ctx.stroke()

      // Markers
      for (const marker of markers) {
        const { x, y } = latLngToCanvas(marker.lat, marker.lng, center.lat, center.lng, zoom, W, H)
        if (x < -20 || x > W + 20 || y < -20 || y > H + 20) continue

        const color = marker.color || (marker.severity ? getSeverityHexColor(marker.severity) : '#3b82f6')
        const isSelected = marker.id === selectedMarkerId

        // Pulse ring for active/critical
        if (marker.pulse || isSelected) {
          const pulse = (Math.sin(tick * 0.04) + 1) / 2
          const radius = 12 + pulse * 10
          ctx.beginPath()
          ctx.arc(x, y, radius, 0, Math.PI * 2)
          ctx.fillStyle = color + '30'
          ctx.fill()
        }

        // Outer ring
        ctx.beginPath()
        ctx.arc(x, y, isSelected ? 12 : 10, 0, Math.PI * 2)
        ctx.fillStyle = color + '40'
        ctx.fill()

        // Main dot
        ctx.beginPath()
        ctx.arc(x, y, isSelected ? 8 : 7, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()

        // White center
        ctx.beginPath()
        ctx.arc(x, y, 3, 0, Math.PI * 2)
        ctx.fillStyle = 'white'
        ctx.fill()

        // Label
        if (marker.label && (isSelected || zoom > 12)) {
          ctx.font = '10px Inter, sans-serif'
          ctx.fillStyle = 'white'
          ctx.textAlign = 'center'
          const textX = x
          const textY = y - 14
          const textWidth = ctx.measureText(marker.label).width
          ctx.fillStyle = 'rgba(0,0,0,0.7)'
          ctx.fillRect(textX - textWidth / 2 - 3, textY - 10, textWidth + 6, 14)
          ctx.fillStyle = 'white'
          ctx.fillText(marker.label, textX, textY)
        }
      }

      pulseRef.current = tick + 1
      animFrameRef.current = requestAnimationFrame(() => draw(pulseRef.current))
    }

    draw(0)

    function handleClick(e: MouseEvent) {
      if (!onMarkerClick || !canvas) return
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const W2 = rect.width
      const H2 = rect.height

      for (const marker of markers) {
        const { x, y } = latLngToCanvas(marker.lat, marker.lng, center.lat, center.lng, zoom, W2, H2)
        const dist = Math.hypot(mx - x, my - y)
        if (dist < 14) {
          onMarkerClick(marker.id)
          break
        }
      }
    }

    canvas.addEventListener('click', handleClick)

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      canvas.removeEventListener('click', handleClick)
    }
  }, [center, zoom, markers, selectedMarkerId, onMarkerClick])

  return (
    <div
      className={`relative rounded-lg overflow-hidden border border-slate-700 ${className}`}
      style={{ height }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        style={{ display: 'block' }}
      />
      <div className="absolute top-2 right-2 bg-slate-900/80 rounded px-2 py-1 text-xs text-slate-400">
        Demo Map
      </div>
      <div className="absolute bottom-2 left-2 flex flex-col gap-1">
        {markers.filter((m) => m.label).slice(0, 3).map((m) => (
          <div
            key={m.id}
            className="flex items-center gap-1.5 bg-slate-900/80 rounded px-1.5 py-0.5 cursor-pointer hover:bg-slate-800"
            onClick={() => onMarkerClick?.(m.id)}
          >
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: m.color || '#3b82f6' }}
            />
            <span className="text-xs text-slate-300">{m.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
