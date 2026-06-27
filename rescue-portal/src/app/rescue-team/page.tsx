'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  AlertTriangle, MapPin, Phone, Navigation, CheckCircle2,
  Truck, XCircle, Loader2, Radio, Clock, Siren,
  ShieldCheck, Flag, ChevronRight, Bell,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SeverityBadge } from '@/components/severity-badge'
import { IncidentStatusBadge } from '@/components/incident-status-badge'
import { EmergencyTypeIcon } from '@/components/emergency-type-icon'
import { RescueTrackingMap } from '@/components/rescue-tracking-map'
import type { IncidentStatus, SeverityLevel } from '@/lib/types'
import { toast } from 'sonner'

type Incident = {
  id: string
  reference_number?: string
  status: string
  severity: string
  description?: string
  reporter_name?: string
  reporter_phone?: string
  barangay?: string
  municipality?: string
  latitude?: number
  longitude?: number
  created_at: string
  updated_at?: string
  emergency_type?: {
    name?: string
    icon?: string
    color?: string
  } | null
  assigned_unit_name?: string | null
}

const ACTIVE_STATUSES = ['assigned', 'accepted', 'dispatched', 'on_the_way', 'arrived', 'operation_in_progress']
const INCOMING_STATUSES = ['assigned']

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function RescueTeamPage() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [prevIncomingCount, setPrevIncomingCount] = useState(0)
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'sharing' | 'denied' | 'unsupported'>('idle')
  const [unitConfigured, setUnitConfigured] = useState<boolean | null>(null)
  const gpsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchIncidents = useCallback(async () => {
    try {
      const res = await fetch('/api/responder/incidents', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      const list = (data.incidents ?? data ?? []) as Incident[]
      setIncidents(list)
      setUnitConfigured(data.unitConfigured !== false)

      // Notify on new incoming SOS
      const incomingCount = list.filter(i => INCOMING_STATUSES.includes(i.status)).length
      if (incomingCount > prevIncomingCount && prevIncomingCount > 0) {
        toast.warning('🚨 New SOS Alert incoming!', { duration: 8000 })
        // Try to play notification sound
        try {
          const audio = new Audio('/sounds/alert.mp3')
          audio.volume = 0.5
          audio.play().catch(() => {})
        } catch {}
      }
      setPrevIncomingCount(incomingCount)
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [prevIncomingCount])

  useEffect(() => {
    const initialFetch = setTimeout(fetchIncidents, 0)
    const interval = setInterval(fetchIncidents, 10000) // Poll every 10s
    return () => {
      clearTimeout(initialFetch)
      clearInterval(interval)
    }
  }, [fetchIncidents])

  const activeIncident = incidents.find((incident) => ACTIVE_STATUSES.includes(incident.status))
  const activeIncidentId = activeIncident?.id

  useEffect(() => {
    if (!activeIncidentId) return
    if (!navigator.geolocation) {
      const unsupportedTimer = setTimeout(() => setGpsStatus('unsupported'), 0)
      return () => clearTimeout(unsupportedTimer)
    }

    let stopped = false
    const sendLocation = () => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          if (stopped) return
          try {
            const response = await fetch('/api/responder/location', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                heading: position.coords.heading,
                speed: position.coords.speed,
                incident_id: activeIncidentId,
              }),
            })
            if (!response.ok) throw new Error('Location update failed')
            setGpsStatus('sharing')
          } catch {
            if (!stopped) setGpsStatus('idle')
          }
        },
        (error) => {
          if (!stopped) setGpsStatus(error.code === error.PERMISSION_DENIED ? 'denied' : 'idle')
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
      )
    }

    sendLocation()
    gpsIntervalRef.current = setInterval(sendLocation, 10000)
    return () => {
      stopped = true
      if (gpsIntervalRef.current) clearInterval(gpsIntervalRef.current)
      gpsIntervalRef.current = null
    }
  }, [activeIncidentId])

  async function updateStatus(incidentId: string, newStatus: string) {
    setUpdatingId(incidentId)
    try {
      const res = await fetch(`/api/admin/incidents/${incidentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Failed to update')
      toast.success(`Status → ${newStatus.replace(/_/g, ' ')}`)
      await fetchIncidents()
      if (selectedIncident?.id === incidentId) {
        setSelectedIncident(prev => prev ? { ...prev, status: newStatus } : null)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setUpdatingId(null)
    }
  }

  // Categorize incidents
  const myActive = incidents.filter(i => ACTIVE_STATUSES.includes(i.status))
  const incomingSOS = incidents.filter(i => INCOMING_STATUSES.includes(i.status))
  const recentResolved = incidents
    .filter(i => ['resolved', 'closed'].includes(i.status))
    .slice(0, 5)

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
          <span className="text-sm text-slate-400">Loading dashboard...</span>
        </div>
      </div>
    )
  }

  // Detail view for selected incident
  if (selectedIncident) {
    const inc = incidents.find(i => i.id === selectedIncident.id) ?? selectedIncident
    return (
      <div className="p-4 max-w-lg mx-auto space-y-4">
        <Button
          variant="ghost"
          onClick={() => setSelectedIncident(null)}
          className="text-slate-400 hover:text-white text-sm -ml-2"
        >
          ← Back to Dashboard
        </Button>

        {/* Incident Detail Card */}
        <Card className="bg-slate-900 border-red-700/50 border-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-red-400 text-sm flex items-center gap-2">
                <Siren className="w-4 h-4" />
                Incident Detail
              </CardTitle>
              <IncidentStatusBadge status={inc.status as IncidentStatus} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Type & Severity */}
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ background: (inc.emergency_type?.color ?? '#ef4444') + '25' }}
              >
                <EmergencyTypeIcon
                  iconName={inc.emergency_type?.icon ?? 'AlertTriangle'}
                  className="w-6 h-6"
                  style={{ color: inc.emergency_type?.color ?? '#ef4444' }}
                />
              </div>
              <div className="flex-1">
                <p className="text-white font-bold text-lg">{inc.emergency_type?.name ?? 'Emergency'}</p>
                <p className="text-xs text-slate-400 font-mono">{inc.reference_number}</p>
              </div>
              <SeverityBadge severity={inc.severity as SeverityLevel} />
            </div>

            {/* Description */}
            {inc.description && (
              <div className="p-3 bg-slate-800/50 rounded-lg">
                <p className="text-sm text-slate-300">{inc.description}</p>
              </div>
            )}

            {/* Reporter */}
            {inc.reporter_name && (
              <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Reporter</p>
                  <p className="text-sm text-white font-medium">{inc.reporter_name}</p>
                  <p className="text-xs text-slate-400">{inc.reporter_phone ?? 'No phone'}</p>
                </div>
                {inc.reporter_phone && (
                  <a
                    href={`tel:${inc.reporter_phone}`}
                    className="flex items-center justify-center w-12 h-12 bg-green-600 hover:bg-green-700 rounded-full transition-colors"
                  >
                    <Phone className="w-5 h-5 text-white" />
                  </a>
                )}
              </div>
            )}

            {/* Location */}
            <div className="p-3 bg-slate-800 rounded-lg space-y-2">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Location</p>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-sm text-slate-300 flex-1">
                  {inc.barangay ?? inc.municipality ?? 'Unknown location'}
                </span>
              </div>
              {inc.latitude && inc.longitude && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${inc.latitude},${inc.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-2">
                    <Navigation className="w-4 h-4 mr-2" />
                    Navigate to Location
                  </Button>
                </a>
              )}
            </div>

            {ACTIVE_STATUSES.includes(inc.status) && (
              <RescueTrackingMap incidentId={inc.id} variant="full" dark pollInterval={10000} />
            )}

            {/* Time */}
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Clock className="w-3.5 h-3.5" />
              <span>Reported {timeAgo(inc.created_at)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons — Read-only except status updates */}
        <div className="space-y-2">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium px-1">Actions</p>

          {inc.status === 'assigned' && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => updateStatus(inc.id, 'accepted')}
                disabled={updatingId === inc.id}
                className="h-14 bg-green-600 hover:bg-green-700 text-white font-semibold"
              >
                {updatingId === inc.id ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                Approve
              </Button>
              <Button
                onClick={() => updateStatus(inc.id, 'cancelled')}
                disabled={updatingId === inc.id}
                variant="destructive"
                className="h-14 font-semibold"
              >
                {updatingId === inc.id ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <XCircle className="w-5 h-5 mr-2" />}
                Reject
              </Button>
            </div>
          )}

          {['accepted', 'dispatched'].includes(inc.status) && (
            <Button
              onClick={() => updateStatus(inc.id, 'on_the_way')}
              disabled={updatingId === inc.id}
              className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              {updatingId === inc.id ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Truck className="w-5 h-5 mr-2" />}
              En Route (On the Way)
            </Button>
          )}

          {inc.status === 'on_the_way' && (
            <Button
              onClick={() => updateStatus(inc.id, 'arrived')}
              disabled={updatingId === inc.id}
              className="w-full h-14 bg-amber-600 hover:bg-amber-700 text-white font-semibold"
            >
              {updatingId === inc.id ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Flag className="w-5 h-5 mr-2" />}
              Arrived on Scene
            </Button>
          )}

          {['arrived', 'operation_in_progress'].includes(inc.status) && (
            <Button
              onClick={() => updateStatus(inc.id, 'resolved')}
              disabled={updatingId === inc.id}
              className="w-full h-14 bg-green-600 hover:bg-green-700 text-white font-semibold"
            >
              {updatingId === inc.id ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
              Operation Complete
            </Button>
          )}

          {['resolved', 'closed', 'cancelled'].includes(inc.status) && (
            <div className="text-center py-4">
              <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-slate-400">This incident has been {inc.status}.</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Main Dashboard
  return (
    <div className="p-4 max-w-lg mx-auto space-y-5">
      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-red-400">{myActive.length}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Active</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-amber-400">{incomingSOS.length}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Incoming</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-green-400">{recentResolved.length}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Resolved</p>
          </CardContent>
        </Card>
      </div>

      {activeIncident && (
        <div className={`rounded-lg border px-3 py-2 text-xs flex items-center gap-2 ${
          gpsStatus === 'sharing'
            ? 'border-green-700/40 bg-green-900/20 text-green-300'
            : 'border-amber-700/40 bg-amber-900/20 text-amber-300'
        }`}>
          <Navigation className="w-4 h-4 shrink-0" />
          {gpsStatus === 'sharing' && 'Live GPS is sharing with dispatch and the resident.'}
          {gpsStatus === 'denied' && 'Location permission is blocked. Enable GPS permission to share live distance and ETA.'}
          {gpsStatus === 'unsupported' && 'This device does not support browser GPS tracking.'}
          {gpsStatus === 'idle' && 'Connecting live GPS for this mission...'}
        </div>
      )}

      {unitConfigured === false && (
        <Card className="bg-amber-950/30 border-amber-600/50">
          <CardContent className="p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-300">Rescue unit setup required</p>
              <p className="text-xs text-amber-100/70 mt-1">
                This responder account is not linked to a rescue unit. Ask an administrator to add it under Admin → Teams before missions can be received.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Incoming SOS Alerts */}
      {incomingSOS.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-400 animate-pulse" />
            <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider">
              Incoming SOS — Prepare for Dispatch
            </h2>
          </div>
          {incomingSOS.map(inc => (
            <Card
              key={inc.id}
              className="bg-amber-900/10 border-amber-700/40 cursor-pointer hover:border-amber-500/60 transition-colors"
              onClick={() => setSelectedIncident(inc)}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: (inc.emergency_type?.color ?? '#f59e0b') + '20' }}
                  >
                    <EmergencyTypeIcon
                      iconName={inc.emergency_type?.icon ?? 'AlertTriangle'}
                      className="w-5 h-5"
                      style={{ color: inc.emergency_type?.color ?? '#f59e0b' }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-semibold text-sm truncate">{inc.emergency_type?.name ?? 'Emergency'}</p>
                      <SeverityBadge severity={inc.severity as SeverityLevel} />
                    </div>
                    <p className="text-xs text-slate-400 truncate">
                      {inc.barangay ?? 'Unknown'} · {timeAgo(inc.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <IncidentStatusBadge status={inc.status as IncidentStatus} />
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Active Missions */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Siren className="w-4 h-4 text-red-400" />
          <h2 className="text-sm font-bold text-red-400 uppercase tracking-wider">
            Active Missions
          </h2>
        </div>
        {myActive.length === 0 ? (
          <Card className="bg-slate-900 border-slate-700">
            <CardContent className="p-8 text-center">
              <Radio className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-white font-semibold">No Active Missions</p>
              <p className="text-sm text-slate-400 mt-1">Standby — you will be notified when dispatched.</p>
            </CardContent>
          </Card>
        ) : (
          myActive.map(inc => (
            <Card
              key={inc.id}
              className="bg-red-900/10 border-red-700/40 cursor-pointer hover:border-red-500/60 transition-colors"
              onClick={() => setSelectedIncident(inc)}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: (inc.emergency_type?.color ?? '#ef4444') + '20' }}
                  >
                    <EmergencyTypeIcon
                      iconName={inc.emergency_type?.icon ?? 'AlertTriangle'}
                      className="w-5 h-5"
                      style={{ color: inc.emergency_type?.color ?? '#ef4444' }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-semibold text-sm truncate">{inc.emergency_type?.name ?? 'Emergency'}</p>
                      <SeverityBadge severity={inc.severity as SeverityLevel} />
                    </div>
                    <p className="text-xs text-slate-400 truncate">
                      {inc.barangay ?? 'Unknown'} · {timeAgo(inc.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <IncidentStatusBadge status={inc.status as IncidentStatus} />
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </div>
                </div>

                {/* Quick action buttons inline */}
                <div className="flex gap-2 mt-3">
                  {inc.status === 'assigned' && (
                    <>
                      <Button
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); updateStatus(inc.id, 'accepted') }}
                        disabled={updatingId === inc.id}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs h-9"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); updateStatus(inc.id, 'cancelled') }}
                        disabled={updatingId === inc.id}
                        variant="destructive"
                        className="flex-1 text-xs h-9"
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                      </Button>
                    </>
                  )}
                  {['accepted', 'dispatched'].includes(inc.status) && (
                    <Button
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); updateStatus(inc.id, 'on_the_way') }}
                      disabled={updatingId === inc.id}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs h-9"
                    >
                      <Truck className="w-3.5 h-3.5 mr-1" /> On the Way
                    </Button>
                  )}
                  {inc.status === 'on_the_way' && (
                    <Button
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); updateStatus(inc.id, 'arrived') }}
                      disabled={updatingId === inc.id}
                      className="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-xs h-9"
                    >
                      <Flag className="w-3.5 h-3.5 mr-1" /> Arrived
                    </Button>
                  )}
                  {['arrived', 'operation_in_progress'].includes(inc.status) && (
                    <Button
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); updateStatus(inc.id, 'resolved') }}
                      disabled={updatingId === inc.id}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs h-9"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Complete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Recently Resolved */}
      {recentResolved.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-green-400" />
            <h2 className="text-sm font-bold text-green-400 uppercase tracking-wider">
              Recently Resolved
            </h2>
          </div>
          {recentResolved.map(inc => (
            <Card
              key={inc.id}
              className="bg-slate-900/50 border-slate-800 cursor-pointer hover:border-slate-600 transition-colors"
              onClick={() => setSelectedIncident(inc)}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-900/30 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-300 text-sm truncate">{inc.emergency_type?.name ?? 'Emergency'}</p>
                    <p className="text-xs text-slate-500">{inc.barangay ?? 'Unknown'} · {timeAgo(inc.created_at)}</p>
                  </div>
                  <Badge className="bg-green-900/30 text-green-400 border-green-700/30 text-[10px]">
                    {inc.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
