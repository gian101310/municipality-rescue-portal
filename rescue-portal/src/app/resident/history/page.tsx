'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ChevronDown, ChevronUp, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { IncidentStatusBadge } from '@/components/incident-status-badge'
import { SeverityBadge } from '@/components/severity-badge'
import { EmergencyTypeIcon } from '@/components/emergency-type-icon'
import { formatDateTime, formatRelativeTime } from '@/lib/utils'
import { isOwnerTestMode, withOwnerTestMode } from '@/lib/owner-test-mode'
import type { DemoIncident } from '@/lib/types'
import { toast } from 'sonner'

export default function HistoryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <HistoryPageContent />
    </Suspense>
  )
}

function HistoryPageContent() {
  const searchParams = useSearchParams()
  const ownerTestMode = isOwnerTestMode(searchParams)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [myIncidents, setMyIncidents] = useState<DemoIncident[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(withOwnerTestMode('/api/resident/incidents', ownerTestMode), { cache: 'no-store' })
        const payload = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(payload?.message ?? 'Unable to load reports.')
        }

        setMyIncidents((payload?.incidents ?? []) as DemoIncident[])
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Unable to load reports.')
        setMyIncidents([])
      } finally {
        setLoading(false)
      }
    }, 0)

    return () => window.clearTimeout(timer)
  }, [ownerTestMode])

  return (
    <div className="px-4 py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Reports</h1>
        <p className="text-slate-500 text-sm">{myIncidents.length} incident{myIncidents.length !== 1 ? 's' : ''} reported</p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">
          <Clock className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Loading reports...</p>
        </div>
      ) : myIncidents.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Clock className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No past emergency reports</p>
        </div>
      ) : (
        <div className="space-y-3">
          {myIncidents.map((inc) => {
            const isExpanded = expanded === inc.id
            return (
              <Card key={inc.id} className="border-slate-200">
                <CardContent className="p-0">
                  <button
                    className="w-full text-left p-4"
                    onClick={() => setExpanded(isExpanded ? null : inc.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: inc.emergency_type.color + '20' }}
                        >
                          <EmergencyTypeIcon
                            iconName={inc.emergency_type.icon}
                            className="w-4.5 h-4.5"
                            style={{ color: inc.emergency_type.color }}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 text-sm">{inc.emergency_type.name}</p>
                          <p className="text-xs text-slate-500 font-mono">{inc.reference_number}</p>
                          <p className="text-xs text-slate-400">{formatRelativeTime(inc.created_at)}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <IncidentStatusBadge status={inc.status} />
                        <SeverityBadge severity={inc.severity} />
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400 mt-1" /> : <ChevronDown className="w-4 h-4 text-slate-400 mt-1" />}
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
                      <p className="text-sm text-slate-700">{inc.description}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><p className="text-slate-400">Location</p><p className="text-slate-700">{inc.address || inc.barangay || '—'}</p></div>
                        <div><p className="text-slate-400">Assigned Unit</p><p className="text-slate-700">{inc.assigned_unit_name || '—'}</p></div>
                        <div><p className="text-slate-400">Submitted</p><p className="text-slate-700">{formatDateTime(inc.created_at)}</p></div>
                        {inc.resolved_at && <div><p className="text-slate-400">Resolved</p><p className="text-slate-700">{formatDateTime(inc.resolved_at)}</p></div>}
                      </div>

                      {/* Mini Timeline */}
                      {inc.timeline && inc.timeline.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-slate-600 mb-2">Status Timeline</p>
                          <div className="space-y-1.5">
                            {inc.timeline.map((t) => (
                              <div key={t.id} className="flex items-center gap-2 text-xs">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                                <span className="text-slate-700">{t.label}</span>
                                <span className="text-slate-400 ml-auto">{formatRelativeTime(t.created_at)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {inc.resolution_notes && (
                        <div className="bg-green-50 rounded-lg p-3">
                          <p className="text-xs font-semibold text-green-700 mb-1">Resolution Notes</p>
                          <p className="text-xs text-green-600">{inc.resolution_notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
