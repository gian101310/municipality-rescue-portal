'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  MapPin, Phone, CheckCircle2, Truck,
  Loader2, Siren, XCircle, ChevronRight,
  Radio, Lock, Flag, Navigation,
  ClipboardCheck, Users,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SeverityBadge } from '@/components/severity-badge'
import { IncidentStatusBadge } from '@/components/incident-status-badge'
import { EmergencyTypeIcon } from '@/components/emergency-type-icon'
import { RescueTrackingMap } from '@/components/rescue-tracking-map'
import type { IncidentStatus, SeverityLevel } from '@/lib/types'
import { buildStatusUpdateRequest } from '@/lib/incident-status-actions'
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
  assigned_unit_name?: string | null
  dispatched_at?: string | null
  arrived_at?: string | null
  resolved_at?: string | null
  emergency_type?: {
    name?: string
    icon?: string
    color?: string
  } | null
  forwarded_to?: string | null
  forwarded_from?: string | null
}

// Municipality directory imported from shared LGU directory
// See src/lib/lgu-directory.ts for the full registry and migration plan

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function formatTime(dateStr: string | null | undefined) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })
}

export default function DispatchPage() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [tab, setTab] = useState('pending')
  // Team dispatch selection
  const [showTeamPicker, setShowTeamPicker] = useState(false)
  const [teamPickerIncidentId, setTeamPickerIncidentId] = useState<string | null>(null)
  const [availableTeams, setAvailableTeams] = useState<Array<{ id: string; name: string; status: string; team_leader_name?: string; contact_number?: string }>>([])
  const [loadingTeams, setLoadingTeams] = useState(false)
  const [assigningTeamId, setAssigningTeamId] = useState<string | null>(null)

  const fetchIncidents = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/incidents', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      setIncidents((data.incidents ?? data ?? []) as Incident[])
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const initialFetch = setTimeout(fetchIncidents, 0)
    const interval = setInterval(fetchIncidents, 10000)
    return () => {
      clearTimeout(initialFetch)
      clearInterval(interval)
    }
  }, [fetchIncidents])

  async function updateStatus(incidentId: string, newStatus: IncidentStatus | 'false_alarm') {
    setUpdatingId(incidentId)
    try {
      const statusUpdate = buildStatusUpdateRequest(newStatus)
      const res = await fetch(`/api/admin/incidents/${incidentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(statusUpdate),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.message ?? 'Failed to update')
      toast.success(`Status → ${newStatus.replace(/_/g, ' ')}`)
      await fetchIncidents()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setUpdatingId(null)
    }
  }

  async function openTeamPicker(incidentId: string) {
    setTeamPickerIncidentId(incidentId)
    setShowTeamPicker(true)
    setLoadingTeams(true)
    try {
      const res = await fetch('/api/admin/teams')
      const data = await res.json().catch(() => ({}))
      setAvailableTeams(data.teams ?? [])
    } catch {
      toast.error('Unable to load rescue teams')
    } finally {
      setLoadingTeams(false)
    }
  }

  async function dispatchWithTeam(teamId: string) {
    if (!teamPickerIncidentId) return
    setAssigningTeamId(teamId)
    try {
      // First assign the team
      const assignRes = await fetch(`/api/admin/incidents/${teamPickerIncidentId}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rescueUnitId: teamId }),
      })
      if (!assignRes.ok) {
        const d = await assignRes.json().catch(() => ({}))
        throw new Error(d.message ?? 'Failed to assign team')
      }
      // Then update status to dispatched
      const statusRes = await fetch(`/api/admin/incidents/${teamPickerIncidentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'dispatched' }),
      })
      if (!statusRes.ok) {
        const data = await statusRes.json().catch(() => ({}))
        throw new Error(data.message ?? 'Team assigned, but dispatch status could not be confirmed')
      }
      const team = availableTeams.find(t => t.id === teamId)
      toast.success(`Dispatched ${team?.name ?? 'rescue team'}`)
      setShowTeamPicker(false)
      setTeamPickerIncidentId(null)
      await fetchIncidents()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Dispatch failed')
    } finally {
      setAssigningTeamId(null)
    }
  }

  // Categorize
  const pendingDispatch = incidents.filter(i => ['submitted', 'received', 'verified'].includes(i.status))
  const dispatched = incidents.filter(i => ['assigned', 'accepted', 'dispatched', 'on_the_way'].includes(i.status))
  const onScene = incidents.filter(i => ['arrived', 'operation_in_progress'].includes(i.status))
  const awaitingClosure = incidents.filter(i => i.status === 'resolved')
  const closed = incidents.filter(i => ['closed', 'cancelled', 'false_alert'].includes(i.status)).slice(0, 10)

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  // Detail view
  if (selectedIncident) {
    const inc = incidents.find(i => i.id === selectedIncident.id) ?? selectedIncident
    return (
      <div className="p-4 max-w-2xl mx-auto space-y-4">
        <Button variant="ghost" onClick={() => setSelectedIncident(null)} className="text-slate-400 hover:text-white text-sm -ml-2">
          ← Back
        </Button>

        <Card className="bg-slate-900 border-blue-700/50 border-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-blue-400 text-sm flex items-center gap-2">
                <Siren className="w-4 h-4" />
                Incident {inc.reference_number}
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
                {inc.assigned_unit_name && (
                  <p className="text-xs text-cyan-400">Assigned: {inc.assigned_unit_name}</p>
                )}
              </div>
              <SeverityBadge severity={inc.severity as SeverityLevel} />
            </div>

            {inc.description && (
              <div className="p-3 bg-slate-800/50 rounded-lg">
                <p className="text-sm text-slate-300">{inc.description}</p>
              </div>
            )}

            {/* Reporter */}
            {inc.reporter_name && (
              <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                <div>
                  <p className="text-xs text-slate-500 uppercase">Reporter</p>
                  <p className="text-sm text-white font-medium">{inc.reporter_name}</p>
                  <p className="text-xs text-slate-400">{inc.reporter_phone ?? 'No phone'}</p>
                </div>
                {inc.reporter_phone && (
                  <a href={`tel:${inc.reporter_phone}`} className="flex items-center justify-center w-12 h-12 bg-green-600 hover:bg-green-700 rounded-full">
                    <Phone className="w-5 h-5 text-white" />
                  </a>
                )}
              </div>
            )}

            {/* Location */}
            <div className="p-3 bg-slate-800 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-300">{inc.barangay ?? inc.municipality ?? 'Unknown'}</span>
              </div>
              {inc.latitude && inc.longitude && (
                <a href={`https://www.google.com/maps?q=${inc.latitude},${inc.longitude}`} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white mt-1">
                    <Navigation className="w-3.5 h-3.5 mr-1" /> View on Map
                  </Button>
                </a>
              )}
            </div>

            {/* Live Tracking Map — shown when dispatched */}
            {['assigned', 'accepted', 'dispatched', 'on_the_way', 'arrived', 'operation_in_progress'].includes(inc.status) && (
              <RescueTrackingMap
                incidentId={inc.id}
                variant="full"
                dark={true}
                pollInterval={10000}
              />
            )}

            {/* Timeline */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-slate-800/50 rounded">
                <p className="text-slate-500">Reported</p>
                <p className="text-white">{formatTime(inc.created_at)}</p>
              </div>
              <div className="p-2 bg-slate-800/50 rounded">
                <p className="text-slate-500">Dispatched</p>
                <p className="text-white">{formatTime(inc.dispatched_at)}</p>
              </div>
              <div className="p-2 bg-slate-800/50 rounded">
                <p className="text-slate-500">Arrived</p>
                <p className="text-white">{formatTime(inc.arrived_at)}</p>
              </div>
              <div className="p-2 bg-slate-800/50 rounded">
                <p className="text-slate-500">Resolved</p>
                <p className="text-white">{formatTime(inc.resolved_at)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dispatch Actions */}
        <div className="space-y-2">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium px-1">Dispatch Actions</p>

          {['submitted', 'received', 'verified'].includes(inc.status) && (
            <>
              <Button
                onClick={() => openTeamPicker(inc.id)}
                disabled={updatingId === inc.id}
                className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                <Users className="w-5 h-5 mr-2" />
                Select Team & Dispatch
              </Button>
            </>
          )}

          {inc.status === 'resolved' && (
            <div className="space-y-2">
              <div className="p-3 bg-green-900/20 border border-green-700/30 rounded-lg text-center">
                <CheckCircle2 className="w-6 h-6 text-green-500 mx-auto mb-1" />
                <p className="text-sm text-green-300 font-medium">Operation completed by rescue team</p>
                <p className="text-xs text-slate-400 mt-1">Review and close the case below</p>
              </div>
              <Button
                onClick={() => updateStatus(inc.id, 'closed')}
                disabled={updatingId === inc.id}
                className="w-full h-14 bg-green-600 hover:bg-green-700 text-white font-semibold"
              >
                {updatingId === inc.id ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ClipboardCheck className="w-5 h-5 mr-2" />}
                Confirm & Close Case
              </Button>
            </div>
          )}

          {inc.status === 'closed' && (
            <div className="text-center py-4">
              <Lock className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Case closed.</p>
            </div>
          )}

          {['cancelled', 'false_alert'].includes(inc.status) && (
            <div className="text-center py-4">
              <XCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-sm text-red-300">
                {inc.status === 'false_alert' ? 'Incident marked as a false alarm.' : 'Incident cancelled.'}
              </p>
            </div>
          )}

          {!['closed', 'cancelled', 'false_alert', 'resolved'].includes(inc.status) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              <Button
                onClick={() => updateStatus(inc.id, 'cancelled')}
                disabled={updatingId === inc.id}
                variant="outline"
                className="w-full min-h-11 border-red-600/50 text-red-400 hover:bg-red-900/20 hover:text-red-300 text-xs"
              >
                <XCircle className="w-3.5 h-3.5 mr-1" />
                Cancel Incident
              </Button>
              <Button
                onClick={() => updateStatus(inc.id, 'false_alarm')}
                disabled={updatingId === inc.id}
                variant="outline"
                className="w-full min-h-11 border-slate-600 text-slate-300 hover:bg-slate-800 text-xs"
              >
                <Flag className="w-3.5 h-3.5 mr-1" />
                Mark False Alarm
              </Button>
            </div>
          )}

          {['arrived', 'operation_in_progress'].includes(inc.status) && (
            <div className="p-3 bg-slate-800 rounded-lg text-center">
              <Truck className="w-6 h-6 text-blue-400 mx-auto mb-1 animate-pulse" />
              <p className="text-sm text-blue-300 font-medium">Mission in progress</p>
              <p className="text-xs text-slate-400">Waiting for rescue team updates</p>
            </div>
          )}
        </div>

        {/* Team Selection Modal (Detail View) */}
        {showTeamPicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-700 bg-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-400" />
                    <h3 className="text-white font-bold text-sm">Select Rescue Team</h3>
                  </div>
                  <button onClick={() => { setShowTeamPicker(false); setTeamPickerIncidentId(null) }} className="text-slate-400 hover:text-white text-lg">&times;</button>
                </div>
                <p className="text-xs text-slate-400 mt-1">Choose a team to dispatch for this incident</p>
              </div>
              <div className="max-h-[350px] overflow-y-auto p-2 space-y-1">
                {loadingTeams ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-slate-400">Loading rescue teams...</p>
                  </div>
                ) : availableTeams.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">No rescue teams found</p>
                    <p className="text-xs text-slate-500 mt-1">Add teams in the Rescue Teams section</p>
                  </div>
                ) : (
                  availableTeams.map(team => {
                    const isAvailable = team.status === 'available'
                    return (
                      <button
                        key={team.id}
                        onClick={() => dispatchWithTeam(team.id)}
                        disabled={assigningTeamId !== null || !isAvailable}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                          isAvailable
                            ? 'hover:bg-slate-800 cursor-pointer border border-slate-700 hover:border-blue-500'
                            : 'opacity-50 cursor-not-allowed border border-slate-800'
                        } ${assigningTeamId === team.id ? 'border-blue-500 bg-blue-900/20' : ''}`}
                      >
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isAvailable ? 'bg-green-900/30' : 'bg-slate-800'}`}>
                          <Users className={`w-4 h-4 ${isAvailable ? 'text-green-400' : 'text-slate-500'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium truncate">{team.name}</p>
                          {team.team_leader_name && (
                            <p className="text-xs text-slate-400">Leader: {team.team_leader_name}</p>
                          )}
                          {team.contact_number && (
                            <p className="text-xs text-slate-500">{team.contact_number}</p>
                          )}
                        </div>
                        <Badge className={`text-[10px] border ${
                          isAvailable
                            ? 'bg-green-900/30 text-green-400 border-green-500/30'
                            : 'bg-amber-900/30 text-amber-400 border-amber-500/30'
                        }`}>
                          {team.status}
                        </Badge>
                        {assigningTeamId === team.id && (
                          <Loader2 className="w-4 h-4 text-blue-400 animate-spin shrink-0" />
                        )}
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    )
  }

  // Main Dashboard with Tabs
  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-amber-400">{pendingDispatch.length}</p>
            <p className="text-[9px] text-slate-500 uppercase">Pending</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-blue-400">{dispatched.length}</p>
            <p className="text-[9px] text-slate-500 uppercase">Dispatched</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-red-400">{onScene.length}</p>
            <p className="text-[9px] text-slate-500 uppercase">On Scene</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-green-400">{awaitingClosure.length}</p>
            <p className="text-[9px] text-slate-500 uppercase">To Close</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full bg-slate-900 border border-slate-700">
          <TabsTrigger value="pending" className="flex-1 text-xs data-[state=active]:bg-amber-600/20 data-[state=active]:text-amber-400">
            Pending ({pendingDispatch.length})
          </TabsTrigger>
          <TabsTrigger value="active" className="flex-1 text-xs data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400">
            Active ({dispatched.length + onScene.length})
          </TabsTrigger>
          <TabsTrigger value="closing" className="flex-1 text-xs data-[state=active]:bg-green-600/20 data-[state=active]:text-green-400">
            To Close ({awaitingClosure.length})
          </TabsTrigger>
          <TabsTrigger value="closed" className="flex-1 text-xs data-[state=active]:bg-slate-600/20 data-[state=active]:text-slate-300">
            Closed
          </TabsTrigger>
        </TabsList>

        {/* Pending Dispatch */}
        <TabsContent value="pending" className="space-y-2 mt-3">
          {pendingDispatch.length === 0 ? (
            <Card className="bg-slate-900 border-slate-700">
              <CardContent className="p-8 text-center">
                <Radio className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">No incidents pending dispatch</p>
              </CardContent>
            </Card>
          ) : (
            pendingDispatch.map(inc => (
              <Card key={inc.id} className="bg-amber-900/10 border-amber-700/30 hover:border-amber-500/50 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3 cursor-pointer" onClick={() => setSelectedIncident(inc)}>
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: (inc.emergency_type?.color ?? '#f59e0b') + '20' }}
                    >
                      <EmergencyTypeIcon iconName={inc.emergency_type?.icon ?? 'AlertTriangle'} className="w-5 h-5" style={{ color: inc.emergency_type?.color ?? '#f59e0b' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-semibold text-sm truncate">{inc.emergency_type?.name ?? 'Emergency'}</p>
                        <SeverityBadge severity={inc.severity as SeverityLevel} />
                      </div>
                      <p className="text-xs text-slate-400">{inc.barangay ?? 'Unknown'} · {timeAgo(inc.created_at)}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
                  </div>
                  <Button
                    size="sm"
                    onClick={() => openTeamPicker(inc.id)}
                    disabled={updatingId === inc.id}
                    className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white text-xs h-9"
                  >
                    <Users className="w-3.5 h-3.5 mr-1" />
                    Select Team & Dispatch
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Active */}
        <TabsContent value="active" className="space-y-2 mt-3">
          {(dispatched.length + onScene.length) === 0 ? (
            <Card className="bg-slate-900 border-slate-700">
              <CardContent className="p-8 text-center">
                <Truck className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">No active missions</p>
              </CardContent>
            </Card>
          ) : (
            [...dispatched, ...onScene].map(inc => (
              <Card
                key={inc.id}
                className="bg-blue-900/10 border-blue-700/30 hover:border-blue-500/50 transition-colors cursor-pointer"
                onClick={() => setSelectedIncident(inc)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: (inc.emergency_type?.color ?? '#3b82f6') + '20' }}
                    >
                      <EmergencyTypeIcon iconName={inc.emergency_type?.icon ?? 'AlertTriangle'} className="w-5 h-5" style={{ color: inc.emergency_type?.color ?? '#3b82f6' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm truncate">{inc.emergency_type?.name ?? 'Emergency'}</p>
                      <p className="text-xs text-slate-400">{inc.barangay ?? 'Unknown'} · {inc.assigned_unit_name ?? 'Unassigned'}</p>
                    </div>
                    <IncidentStatusBadge status={inc.status as IncidentStatus} />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Awaiting Closure */}
        <TabsContent value="closing" className="space-y-2 mt-3">
          {awaitingClosure.length === 0 ? (
            <Card className="bg-slate-900 border-slate-700">
              <CardContent className="p-8 text-center">
                <ClipboardCheck className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">No cases awaiting closure</p>
              </CardContent>
            </Card>
          ) : (
            awaitingClosure.map(inc => (
              <Card key={inc.id} className="bg-green-900/10 border-green-700/30 hover:border-green-500/50 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3 cursor-pointer" onClick={() => setSelectedIncident(inc)}>
                    <CheckCircle2 className="w-8 h-8 text-green-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm truncate">{inc.emergency_type?.name ?? 'Emergency'}</p>
                      <p className="text-xs text-slate-400">{inc.barangay ?? 'Unknown'} · Resolved {timeAgo(inc.resolved_at ?? inc.updated_at ?? inc.created_at)}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
                  </div>
                  <Button
                    size="sm"
                    onClick={() => updateStatus(inc.id, 'closed')}
                    disabled={updatingId === inc.id}
                    className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white text-xs h-9"
                  >
                    {updatingId === inc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <ClipboardCheck className="w-3.5 h-3.5 mr-1" />}
                    Confirm & Close Case
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Closed */}
        <TabsContent value="closed" className="space-y-2 mt-3">
          {closed.length === 0 ? (
            <Card className="bg-slate-900 border-slate-700">
              <CardContent className="p-8 text-center">
                <Lock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">No closed cases yet</p>
              </CardContent>
            </Card>
          ) : (
            closed.map(inc => (
              <Card
                key={inc.id}
                className="bg-slate-900/50 border-slate-800 cursor-pointer hover:border-slate-600 transition-colors"
                onClick={() => setSelectedIncident(inc)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-slate-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-300 text-sm truncate">{inc.emergency_type?.name ?? 'Emergency'} — {inc.reference_number}</p>
                      <p className="text-xs text-slate-500">{inc.barangay ?? 'Unknown'} · {timeAgo(inc.created_at)}</p>
                    </div>
                    <Badge className="bg-slate-700 text-slate-400 text-[10px]">Closed</Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Team Selection Modal */}
      {showTeamPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-700 bg-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-400" />
                  <h3 className="text-white font-bold text-sm">Select Rescue Team</h3>
                </div>
                <button onClick={() => { setShowTeamPicker(false); setTeamPickerIncidentId(null) }} className="text-slate-400 hover:text-white text-lg">&times;</button>
              </div>
              <p className="text-xs text-slate-400 mt-1">Choose a team to dispatch for this incident</p>
            </div>
            <div className="max-h-[350px] overflow-y-auto p-2 space-y-1">
              {loadingTeams ? (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 text-blue-500 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-slate-400">Loading rescue teams...</p>
                </div>
              ) : availableTeams.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">No rescue teams found</p>
                  <p className="text-xs text-slate-500 mt-1">Add teams in the Rescue Teams section</p>
                </div>
              ) : (
                availableTeams.map(team => {
                  const isAvailable = team.status === 'available'
                  return (
                    <button
                      key={team.id}
                      onClick={() => dispatchWithTeam(team.id)}
                      disabled={assigningTeamId !== null || !isAvailable}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                        isAvailable
                          ? 'hover:bg-slate-800 cursor-pointer border border-slate-700 hover:border-blue-500'
                          : 'opacity-50 cursor-not-allowed border border-slate-800'
                      } ${assigningTeamId === team.id ? 'border-blue-500 bg-blue-900/20' : ''}`}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isAvailable ? 'bg-green-900/30' : 'bg-slate-800'}`}>
                        <Users className={`w-4 h-4 ${isAvailable ? 'text-green-400' : 'text-slate-500'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate">{team.name}</p>
                        {team.team_leader_name && (
                          <p className="text-xs text-slate-400">Leader: {team.team_leader_name}</p>
                        )}
                        {team.contact_number && (
                          <p className="text-xs text-slate-500">{team.contact_number}</p>
                        )}
                      </div>
                      <Badge className={`text-[10px] border ${
                        isAvailable
                          ? 'bg-green-900/30 text-green-400 border-green-500/30'
                          : 'bg-amber-900/30 text-amber-400 border-amber-500/30'
                      }`}>
                        {team.status}
                      </Badge>
                      {assigningTeamId === team.id && (
                        <Loader2 className="w-4 h-4 text-blue-400 animate-spin shrink-0" />
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
