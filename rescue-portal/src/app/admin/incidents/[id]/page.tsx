'use client'

import { useEffect, useState } from 'react'
import { use } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Phone, Copy, MapPin, User, Shield, Users,
  ExternalLink, Clock, CheckCircle2, AlertTriangle, MessageSquare, Send
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { IncidentStatusBadge } from '@/components/incident-status-badge'
import { SeverityBadge } from '@/components/severity-badge'
import { EmergencyTypeIcon } from '@/components/emergency-type-icon'
import { MapView } from '@/components/map-view'
// Real data fetched from API — no demo imports
import { formatDateTime, formatRelativeTime, getStatusLabel } from '@/lib/utils'
import { toast } from 'sonner'
import type { DemoIncident, IncidentStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

const ALL_STATUSES: IncidentStatus[] = [
  'received', 'verification_pending', 'verified', 'assigned', 'dispatched',
  'on_the_way', 'arrived', 'operation_in_progress', 'transporting', 'resolved', 'closed',
  'false_alert', 'cancelled', 'unable_to_contact'
]

export default function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [incident, setIncident] = useState<DemoIncident | null>(null)
  const [loadingIncident, setLoadingIncident] = useState(true)
  const [note, setNote] = useState('')
  const [newStatus, setNewStatus] = useState<IncidentStatus | ''>('')
  const [statusReason, setStatusReason] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const response = await fetch('/api/admin/incidents', { cache: 'no-store' })
        const payload = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(payload?.message ?? 'Unable to load incident.')
        }

        const realIncident = ((payload?.incidents ?? []) as DemoIncident[]).find((item) => item.id === id)
        if (!cancelled) setIncident(realIncident ?? null)
      } catch {
        if (!cancelled) setIncident(null)
      } finally {
        if (!cancelled) setLoadingIncident(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id])

  if (loadingIncident) {
    return (
      <div className="p-8 text-center">
        <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3 animate-pulse" />
        <h2 className="text-white font-semibold mb-2">Loading Incident</h2>
      </div>
    )
  }

  if (!incident) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <h2 className="text-white font-semibold mb-2">Incident Not Found</h2>
        <Button variant="outline" className="border-slate-600 text-slate-300" render={<Link href="/admin/incidents" />}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
      </div>
    )
  }

  // Reporter info comes from the incident itself (reporter_name, reporter_phone)
  // Assigned unit info will be loaded from real data when teams feature is built
  const assignedUnit = null

  const mapMarker = [{
    id: incident.id,
    lat: incident.latitude,
    lng: incident.longitude,
    label: incident.reference_number.slice(-6),
    color: incident.emergency_type.color,
    pulse: ['submitted', 'on_the_way', 'arrived'].includes(incident.status),
  }]

  async function handleStatusUpdate() {
    if (!newStatus) return
    if (!incident) return

    try {
      const response = await fetch(`/api/admin/incidents/${incident.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, reason: statusReason }),
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload?.message ?? 'Unable to update incident.')
      }

      setIncident(payload?.incident as DemoIncident)
      toast.success(`Status updated to ${getStatusLabel(newStatus)}`)
      setNewStatus('')
      setStatusReason('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update incident.')
    }
  }

  function handleAddNote() {
    if (!note.trim()) return
    toast.success('Note added')
    setNote('')
  }

  function copyPhone() {
    if (incident?.reporter_phone) {
      navigator.clipboard.writeText(incident.reporter_phone)
      toast.success('Phone number copied')
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-screen-xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white shrink-0" render={<Link href="/admin/incidents" />}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="font-mono text-lg font-bold text-white">{incident.reference_number}</h1>
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="flex items-center gap-1 bg-slate-800 rounded-md px-2 py-0.5 border border-slate-700">
                <EmergencyTypeIcon iconName={incident.emergency_type.icon} className="w-3.5 h-3.5" style={{ color: incident.emergency_type.color }} />
                <span className="text-xs text-slate-300">{incident.emergency_type.name}</span>
              </div>
              <SeverityBadge severity={incident.severity} />
              <IncidentStatusBadge status={incident.status} />
            </div>
          </div>
          <p className="text-slate-400 text-sm">{incident.description.slice(0, 100)}{incident.description.length > 100 ? '…' : ''}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Reporter Info */}
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" /> Reporter Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-white">{incident.reporter_name || 'Anonymous'}</p>
                  {incident.reporter_phone && (
                    <p className="text-sm text-slate-400">{incident.reporter_phone}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className="text-xs border-0 bg-green-600/20 text-green-400">
                      Verified Resident
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  {incident.reporter_phone && (
                    <>
                      <Button size="sm" className="bg-green-700 hover:bg-green-600 text-white h-8" render={<a href={`tel:${incident.reporter_phone}`} />}>
                        <Phone className="w-3.5 h-3.5 mr-1" /> Call
                      </Button>
                      <Button size="sm" variant="outline" onClick={copyPhone} className="border-slate-600 text-slate-300 hover:bg-slate-800 h-8">
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {incident.address && (
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800">
                  <div>
                    <p className="text-xs text-slate-500">Reported Address</p>
                    <p className="text-xs text-slate-300">{incident.address || '—'}</p>
                    <p className="text-xs text-slate-400">{incident.barangay}, {incident.municipality}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Location */}
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" /> Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <MapView
                center={{ lat: incident.latitude, lng: incident.longitude }}
                zoom={14}
                markers={mapMarker}
                selectedMarkerId={incident.id}
                height="220px"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-500">Barangay</p>
                  <p className="text-sm text-slate-300">{incident.barangay || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Address</p>
                  <p className="text-sm text-slate-300">{incident.address || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Coordinates</p>
                  <p className="text-sm font-mono text-slate-300">{incident.latitude.toFixed(5)}, {incident.longitude.toFixed(5)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">GPS Accuracy</p>
                  <p className="text-sm text-slate-300">{incident.gps_accuracy ? `±${incident.gps_accuracy}m` : '—'}</p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800 w-full" render={<a href={`https://www.google.com/maps?q=${incident.latitude},${incident.longitude}`} target="_blank" rel="noopener noreferrer" />}>
                <ExternalLink className="w-3.5 h-3.5 mr-1" /> Open in Google Maps
              </Button>
            </CardContent>
          </Card>

          {/* Description */}
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm">Incident Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">Description</p>
                <p className="text-sm text-slate-300 leading-relaxed">{incident.description}</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-800 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-white">{incident.affected_count}</p>
                  <p className="text-xs text-slate-400">Affected</p>
                </div>
                <div className={cn('bg-slate-800 rounded-lg p-3 text-center', incident.has_unconscious && 'bg-red-900/30')}>
                  <p className="text-sm font-bold text-white">{incident.has_unconscious ? 'Yes' : 'No'}</p>
                  <p className="text-xs text-slate-400">Unconscious</p>
                </div>
                <div className={cn('bg-slate-800 rounded-lg p-3 text-center', incident.has_fire && 'bg-orange-900/30')}>
                  <p className="text-sm font-bold text-white">{incident.has_fire ? 'Yes' : 'No'}</p>
                  <p className="text-xs text-slate-400">Fire</p>
                </div>
                <div className={cn('bg-slate-800 rounded-lg p-3 text-center', incident.has_flooding && 'bg-blue-900/30')}>
                  <p className="text-sm font-bold text-white">{incident.has_flooding ? 'Yes' : 'No'}</p>
                  <p className="text-xs text-slate-400">Flooding</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                <span>Reported: {formatDateTime(incident.created_at)}</span>
                {incident.verified_at && <><span>·</span><span>Verified: {formatDateTime(incident.verified_at)}</span></>}
                {incident.dispatched_at && <><span>·</span><span>Dispatched: {formatDateTime(incident.dispatched_at)}</span></>}
                {incident.arrived_at && <><span>·</span><span>Arrived: {formatDateTime(incident.arrived_at)}</span></>}
                {incident.resolved_at && <><span>·</span><span>Resolved: {formatDateTime(incident.resolved_at)}</span></>}
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" /> Status Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                {(incident.timeline || []).map((entry, idx) => (
                  <div key={entry.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={cn('w-7 h-7 rounded-full flex items-center justify-center border-2 shrink-0', idx === 0 ? 'bg-blue-600 border-blue-500' : 'bg-slate-800 border-slate-600')}>
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      </div>
                      {idx < (incident.timeline || []).length - 1 && (
                        <div className="w-0.5 flex-1 bg-slate-700 my-1" />
                      )}
                    </div>
                    <div className="pb-4 flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm text-white">{entry.label}</p>
                        <span className="text-xs text-slate-500 shrink-0">{formatRelativeTime(entry.created_at)}</span>
                      </div>
                      <p className="text-xs text-slate-400">{entry.actor_name} · {entry.actor_role}</p>
                      {entry.note && <p className="text-xs text-slate-400 mt-1 bg-slate-800 rounded px-2 py-1">{entry.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-slate-400" /> Internal Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Textarea
                  placeholder="Add an internal note..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 min-h-[80px]"
                />
                <Button size="sm" onClick={handleAddNote} disabled={!note.trim()} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Send className="w-3.5 h-3.5 mr-1" /> Add Note
                </Button>
              </div>
              {incident.resolution_notes && (
                <div className="bg-slate-800 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Resolution Notes</p>
                  <p className="text-sm text-slate-300">{incident.resolution_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-5">
          {/* Status Update */}
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm">Update Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v as IncidentStatus)}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  {ALL_STATUSES.filter((s) => s !== incident.status).map((s) => (
                    <SelectItem key={s} value={s} className="text-white">{getStatusLabel(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                placeholder="Reason for status change (optional)"
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 min-h-[60px]"
              />
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={handleStatusUpdate} disabled={!newStatus}>
                Update Status
              </Button>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {incident.reporter_phone && (
                <Button size="sm" className="w-full bg-green-700 hover:bg-green-600 text-white" render={<a href={`tel:${incident.reporter_phone}`} />}>
                  <Phone className="w-3.5 h-3.5 mr-2" /> Call Reporter
                </Button>
              )}
              <Button size="sm" variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-800" onClick={() => toast.success('Demo: Verification flagged')}>
                <Shield className="w-3.5 h-3.5 mr-2" /> Verify Incident
              </Button>
              <Button size="sm" variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-800" onClick={() => toast.success('Demo: Team assigned')}>
                <Users className="w-3.5 h-3.5 mr-2" /> Assign Team
              </Button>
              <Button size="sm" className="w-full bg-amber-700 hover:bg-amber-600 text-white" onClick={() => toast.success('Demo: Team dispatched')}>
                <CheckCircle2 className="w-3.5 h-3.5 mr-2" /> Dispatch
              </Button>
              <Separator className="bg-slate-800" />
              <Button size="sm" className="w-full bg-green-700 hover:bg-green-600 text-white" onClick={() => toast.success('Demo: Incident resolved')}>
                <CheckCircle2 className="w-3.5 h-3.5 mr-2" /> Resolve Incident
              </Button>
              <Button size="sm" variant="outline" className="w-full border-red-700/50 text-red-400 hover:bg-red-900/20" onClick={() => toast.success('Demo: Marked as escalated')}>
                <AlertTriangle className="w-3.5 h-3.5 mr-2" /> Escalate
              </Button>
            </CardContent>
          </Card>

          {/* Assigned Unit */}
          {assignedUnit && (
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-400" /> Assigned Unit
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-white">{assignedUnit.name}</p>
                    <p className="text-xs text-slate-400">{assignedUnit.code}</p>
                  </div>
                  <Badge className="bg-amber-600/20 text-amber-400 border border-amber-500/30">{assignedUnit.status}</Badge>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Team Leader</p>
                  <p className="text-sm text-slate-300">{assignedUnit.team_leader_name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Members</p>
                  <div className="space-y-1">
                    {(assignedUnit.members || []).map((m) => (
                      <div key={m.id} className="flex items-center gap-2">
                        <span className={cn('w-1.5 h-1.5 rounded-full', m.role === 'team_leader' ? 'bg-amber-400' : 'bg-slate-500')} />
                        <span className="text-xs text-slate-400">{m.user_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {assignedUnit.contact_number && (
                  <Button size="sm" className="w-full bg-green-700 hover:bg-green-600 text-white" render={<a href={`tel:${assignedUnit.contact_number}`} />}>
                    <Phone className="w-3.5 h-3.5 mr-2" /> Call Team
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
