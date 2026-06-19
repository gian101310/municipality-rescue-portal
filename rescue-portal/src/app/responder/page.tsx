'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  MapPin, Phone, Navigation, CheckCircle2, Truck,
  AlertTriangle, Radio, Loader2, Eye,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { SeverityBadge } from '@/components/severity-badge'
import { IncidentStatusBadge } from '@/components/incident-status-badge'
import type { IncidentStatus, SeverityLevel } from '@/lib/types'
import { EmergencyTypeIcon } from '@/components/emergency-type-icon'
import { toast } from 'sonner'

const RESPONDER_STATUSES = ['assigned', 'accepted', 'dispatched', 'on_the_way', 'arrived', 'operation_in_progress']

type Incident = {
  id: string
  reference_number?: string
  status: string
  severity: string
  description?: string
  reporter_name?: string
  reporter_phone?: string
  barangay?: string
  latitude?: number
  longitude?: number
  created_at: string
  emergency_type?: {
    name?: string
    icon?: string
    color?: string
  } | null
}

export default function ResponderPage() {
  const [onMission, setOnMission] = useState(false)
  const [gpsTracking, setGpsTracking] = useState(false)
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const gpsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchIncidents = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/incidents', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      const list = (data.incidents ?? data ?? []) as Incident[]
      setIncidents(list)
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchIncidents()
    const interval = setInterval(fetchIncidents, 15000)
    return () => clearInterval(interval)
  }, [fetchIncidents])

  // Find the active assigned incident
  const activeIncident = incidents.find(i => RESPONDER_STATUSES.includes(i.status))

  async function updateStatus(newStatus: string) {
    if (!activeIncident) return
    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/admin/incidents/${activeIncident.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Failed to update status')
      toast.success(`Status updated to: ${newStatus.replace(/_/g, ' ')}`)
      await fetchIncidents()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setUpdatingStatus(false)
    }
  }

  // GPS tracking
  useEffect(() => {
    if (gpsTracking) {
      function sendLocation() {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            // In production: POST to /api/responder/location
            console.log('GPS update:', pos.coords.latitude, pos.coords.longitude)
          },
          () => { /* silent */ },
          { enableHighAccuracy: true }
        )
      }
      sendLocation()
      gpsIntervalRef.current = setInterval(sendLocation, 30000)
    }
    return () => {
      if (gpsIntervalRef.current) clearInterval(gpsIntervalRef.current)
    }
  }, [gpsTracking])

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="text-sm text-slate-400">Loading assignments...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto pb-20">
      {/* Status Toggle */}
      <Card className="bg-slate-900 border-slate-700">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${onMission ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`} />
              <div>
                <p className="font-semibold text-white text-sm">{onMission ? 'On Mission' : 'Available'}</p>
                <p className="text-xs text-slate-400">{onMission ? 'Responding to incident' : 'Ready for dispatch'}</p>
              </div>
            </div>
            <Switch
              checked={onMission}
              onCheckedChange={setOnMission}
            />
          </div>
        </CardContent>
      </Card>

      {/* GPS Tracking */}
      <Card className="bg-slate-900 border-slate-700">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Navigation className="w-5 h-5 text-blue-400" />
              <div>
                <p className="font-semibold text-white text-sm">GPS Tracking</p>
                <p className="text-xs text-slate-400">{gpsTracking ? 'Broadcasting location every 30s' : 'Enable to share your location'}</p>
              </div>
            </div>
            <Switch
              checked={gpsTracking}
              onCheckedChange={setGpsTracking}
            />
          </div>
        </CardContent>
      </Card>

      {/* Active Incident */}
      {activeIncident ? (
        <>
          <Card className="bg-slate-900 border-red-700/50 border-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-red-400 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Active Assignment
                </CardTitle>
                <IncidentStatusBadge status={activeIncident.status as IncidentStatus} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Type & Severity */}
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: (activeIncident.emergency_type?.color ?? '#ef4444') + '25' }}
                >
                  <EmergencyTypeIcon
                    iconName={activeIncident.emergency_type?.icon ?? 'AlertTriangle'}
                    className="w-5 h-5"
                    style={{ color: activeIncident.emergency_type?.color ?? '#ef4444' }}
                  />
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold">{activeIncident.emergency_type?.name ?? 'Emergency'}</p>
                  <p className="text-xs text-slate-400 font-mono">{activeIncident.reference_number}</p>
                </div>
                <SeverityBadge severity={activeIncident.severity as SeverityLevel} />
              </div>

              {/* Reporter */}
              {activeIncident.reporter_name && (
                <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  <div>
                    <p className="text-sm text-white">{activeIncident.reporter_name}</p>
                    <p className="text-xs text-slate-400">{activeIncident.reporter_phone ?? 'No phone'}</p>
                  </div>
                  {activeIncident.reporter_phone && (
                    <a
                      href={`tel:${activeIncident.reporter_phone}`}
                      className="flex items-center justify-center w-12 h-12 bg-green-600 hover:bg-green-700 rounded-full transition-colors"
                    >
                      <Phone className="w-5 h-5 text-white" />
                    </a>
                  )}
                </div>
              )}

              {/* Description */}
              {activeIncident.description && (
                <p className="text-sm text-slate-300 line-clamp-3">{activeIncident.description}</p>
              )}

              {/* Location + Navigate */}
              {activeIncident.latitude && activeIncident.longitude && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-xs text-slate-400 flex-1">
                    {activeIncident.barangay ?? `${activeIncident.latitude.toFixed(4)}, ${activeIncident.longitude.toFixed(4)}`}
                  </span>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${activeIncident.latitude},${activeIncident.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex"
                  >
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white h-10 px-4">
                      <Navigation className="w-4 h-4 mr-1.5" />
                      Navigate
                    </Button>
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Update Buttons */}
          <div className="space-y-2">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Update Status</p>
            {activeIncident.status === 'assigned' && (
              <Button
                onClick={() => updateStatus('accepted')}
                disabled={updatingStatus}
                className="w-full h-14 bg-green-600 hover:bg-green-700 text-white text-base font-semibold"
              >
                {updatingStatus ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                Accept Mission
              </Button>
            )}
            {['accepted', 'dispatched'].includes(activeIncident.status) && (
              <Button
                onClick={() => updateStatus('on_the_way')}
                disabled={updatingStatus}
                className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold"
              >
                {updatingStatus ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Truck className="w-5 h-5 mr-2" />}
                On the Way
              </Button>
            )}
            {activeIncident.status === 'on_the_way' && (
              <Button
                onClick={() => updateStatus('arrived')}
                disabled={updatingStatus}
                className="w-full h-14 bg-amber-600 hover:bg-amber-700 text-white text-base font-semibold"
              >
                {updatingStatus ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Eye className="w-5 h-5 mr-2" />}
                Arrived on Scene
              </Button>
            )}
            {['arrived', 'operation_in_progress'].includes(activeIncident.status) && (
              <Button
                onClick={() => updateStatus('resolved')}
                disabled={updatingStatus}
                className="w-full h-14 bg-green-600 hover:bg-green-700 text-white text-base font-semibold"
              >
                {updatingStatus ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                Operation Complete
              </Button>
            )}
          </div>
        </>
      ) : (
        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-8 text-center">
            <Radio className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-white font-semibold">No Active Assignment</p>
            <p className="text-sm text-slate-400 mt-1">Standby — you will be notified when dispatched.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
