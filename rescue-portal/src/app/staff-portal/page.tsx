'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  AlertTriangle, Loader2, Eye, Shield, BarChart3,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SeverityBadge } from '@/components/severity-badge'
import { IncidentStatusBadge } from '@/components/incident-status-badge'
import { EmergencyTypeIcon } from '@/components/emergency-type-icon'
import type { IncidentStatus, SeverityLevel } from '@/lib/types'

type Incident = {
  id: string
  reference_number?: string
  status: string
  severity: string
  description?: string
  reporter_name?: string
  barangay?: string
  created_at: string
  emergency_type?: {
    name?: string
    icon?: string
    color?: string
  } | null
  assigned_unit_name?: string | null
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function StaffPortalPage() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

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
    const initialFetch = window.setTimeout(() => { void fetchIncidents() }, 0)
    const interval = setInterval(fetchIncidents, 30000)
    return () => {
      window.clearTimeout(initialFetch)
      clearInterval(interval)
    }
  }, [fetchIncidents])

  const active = incidents.filter(i => !['closed', 'cancelled', 'false_alert', 'invalid', 'duplicate'].includes(i.status))
  const resolved = incidents.filter(i => ['closed', 'resolved'].includes(i.status))

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-5">
      {/* Notice */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 flex items-start gap-2">
        <Eye className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
        <p className="text-xs text-slate-400">
          <strong className="text-slate-300">Read-only view.</strong> You can monitor all incidents but cannot modify statuses or dispatch missions. Contact your admin or dispatch ops for actions.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-white">{incidents.length}</p>
            <p className="text-[10px] text-slate-500 uppercase">Total</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-red-400">{active.length}</p>
            <p className="text-[10px] text-slate-500 uppercase">Active</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-green-400">{resolved.length}</p>
            <p className="text-[10px] text-slate-500 uppercase">Resolved</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Incidents */}
      <div className="space-y-2">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          Active Incidents
        </h2>
        {active.length === 0 ? (
          <Card className="bg-slate-900 border-slate-700">
            <CardContent className="p-8 text-center">
              <Shield className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-white font-semibold">All Clear</p>
              <p className="text-sm text-slate-400 mt-1">No active incidents at this time.</p>
            </CardContent>
          </Card>
        ) : (
          active.map(inc => (
            <Card
              key={inc.id}
              className="bg-slate-900 border-slate-700 hover:border-slate-500 transition-colors cursor-pointer"
              onClick={() => setExpandedId(expandedId === inc.id ? null : inc.id)}
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
                    <p className="text-xs text-slate-400">
                      {inc.barangay ?? 'Unknown'} · {timeAgo(inc.created_at)}
                    </p>
                  </div>
                  <IncidentStatusBadge status={inc.status as IncidentStatus} />
                </div>

                {/* Expanded details (read-only) */}
                {expandedId === inc.id && (
                  <div className="mt-3 pt-3 border-t border-slate-800 space-y-2 text-sm">
                    {inc.description && (
                      <p className="text-slate-300">{inc.description}</p>
                    )}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500">Ref: </span>
                        <span className="text-slate-300 font-mono">{inc.reference_number}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Reporter: </span>
                        <span className="text-slate-300">{inc.reporter_name ?? 'Anonymous'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Location: </span>
                        <span className="text-slate-300">{inc.barangay ?? 'Unknown'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Unit: </span>
                        <span className="text-slate-300">{inc.assigned_unit_name ?? 'Unassigned'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Recent Resolved */}
      {resolved.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Recently Resolved ({resolved.length})
          </h2>
          {resolved.slice(0, 5).map(inc => (
            <Card key={inc.id} className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-green-900/30 flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4 text-green-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-300 text-sm truncate">{inc.emergency_type?.name ?? 'Emergency'}</p>
                    <p className="text-xs text-slate-500">{inc.barangay ?? 'Unknown'} · {timeAgo(inc.created_at)}</p>
                  </div>
                  <Badge className="bg-green-900/30 text-green-400 border-green-700/30 text-[10px]">{inc.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
