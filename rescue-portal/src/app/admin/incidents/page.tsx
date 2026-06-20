'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, Filter, Eye, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { IncidentStatusBadge } from '@/components/incident-status-badge'
import { SeverityBadge } from '@/components/severity-badge'
import { EmergencyTypeIcon } from '@/components/emergency-type-icon'
import { formatRelativeTime } from '@/lib/utils'
import type { DemoIncident, EmergencyType, IncidentStatus, SeverityLevel } from '@/lib/types'
import { toast } from 'sonner'

const PAGE_SIZE = 8
type IncidentEmergencyType = Pick<EmergencyType, 'id' | 'name' | 'icon' | 'color'>

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

const ACTIVE_STATUSES: IncidentStatus[] = ['submitted', 'received', 'verification_pending', 'verified', 'assigned', 'dispatched', 'on_the_way', 'arrived', 'operation_in_progress']
const RESOLVED_STATUSES: IncidentStatus[] = ['resolved', 'false_alert', 'unable_to_contact', 'duplicate', 'invalid', 'transferred', 'cancelled']
const CLOSED_STATUSES: IncidentStatus[] = ['closed']

export default function IncidentsPage() {
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [severityFilter, setSeverityFilter] = useState<SeverityLevel | 'all'>('all')
  const [page, setPage] = useState(1)
  const [incidents, setIncidents] = useState<DemoIncident[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/admin/incidents', { cache: 'no-store' })
        const payload = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(payload?.message ?? 'Unable to load incidents.')
        }

        setIncidents((payload?.incidents ?? []) as DemoIncident[])
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Unable to load incidents.')
        setIncidents([])
      } finally {
        setLoading(false)
      }
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  const filtered = useMemo(() => {
    return incidents.filter((inc) => {
      if (tab === 'active' && !ACTIVE_STATUSES.includes(inc.status)) return false
      if (tab === 'resolved' && !RESOLVED_STATUSES.includes(inc.status)) return false
      if (tab === 'closed' && !CLOSED_STATUSES.includes(inc.status)) return false
      if (typeFilter !== 'all' && inc.emergency_type_id !== typeFilter) return false
      if (severityFilter !== 'all' && inc.severity !== severityFilter) return false
      if (search) {
        const q = search.toLowerCase()
        if (!inc.reference_number.toLowerCase().includes(q) &&
            !inc.reporter_name?.toLowerCase().includes(q) &&
            !inc.barangay?.toLowerCase().includes(q) &&
            !inc.emergency_type.name.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [incidents, tab, search, typeFilter, severityFilter])

  // Extract unique emergency types from loaded incidents
  const uniqueTypes = useMemo(() => {
    const seen = new Map<string, IncidentEmergencyType>()
    for (const inc of incidents) {
      if (inc.emergency_type?.id && !seen.has(inc.emergency_type.id)) {
        seen.set(inc.emergency_type.id, inc.emergency_type)
      }
    }
    return Array.from(seen.values())
  }, [incidents])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-screen-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Incidents</h1>
          <p className="text-slate-400 text-sm">{filtered.length} incident{filtered.length !== 1 ? 's' : ''} found</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-slate-900 border-slate-700">
        <CardContent className="p-4 space-y-3">
          <Tabs value={tab} onValueChange={(v) => { setTab(v); setPage(1) }}>
            <TabsList className="bg-slate-800 border border-slate-700">
              {STATUS_TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value} className="data-[active]:bg-slate-700 data-[active]:text-white text-slate-400 text-sm">
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                placeholder="Search reference, reporter, location..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="pl-9 bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
              />
            </div>
            <Select value={typeFilter} onValueChange={(v) => { if (v) { setTypeFilter(v); setPage(1) } }}>
              <SelectTrigger className="w-48 bg-slate-800 border-slate-600 text-white">
                <Filter className="w-4 h-4 mr-1 text-slate-400" />
                <SelectValue placeholder="Emergency Type" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="all" className="text-white">All Types</SelectItem>
                {uniqueTypes.map((t) => (
                  <SelectItem key={t.id} value={t.id} className="text-white">{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={(v) => { if (v) { setSeverityFilter(v as SeverityLevel | 'all'); setPage(1) } }}>
              <SelectTrigger className="w-36 bg-slate-800 border-slate-600 text-white">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="all" className="text-white">All Severity</SelectItem>
                {(['critical', 'high', 'medium', 'low', 'info'] as SeverityLevel[]).map((s) => (
                  <SelectItem key={s} value={s} className="text-white capitalize">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-slate-900 border-slate-700">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  {['Reference', 'Type', 'Severity', 'Reporter', 'Location', 'Status', 'Unit', 'Time', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-slate-500">Loading incidents...</td>
                  </tr>
                ) : paged.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-slate-500">No incidents found</td>
                  </tr>
                ) : paged.map((inc) => (
                  <tr key={inc.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link href={`/admin/incidents/${inc.id}`} className="font-mono text-xs text-blue-400 hover:text-blue-300">
                          {inc.reference_number}
                        </Link>
                        {inc.is_drill && (
                          <Badge className="border-amber-500/40 bg-amber-500/15 text-[10px] text-amber-300">
                            TEST DRILL
                          </Badge>
                        )}
                        {inc.intake_state === 'incoming' && (
                          <Badge className="border-red-500/40 bg-red-500/15 text-[10px] text-red-300 animate-pulse">
                            INCOMING SOS
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded flex items-center justify-center shrink-0" style={{ background: inc.emergency_type.color + '25' }}>
                          <EmergencyTypeIcon iconName={inc.emergency_type.icon} className="w-3 h-3" style={{ color: inc.emergency_type.color }} />
                        </span>
                        <span className="text-xs text-slate-300 whitespace-nowrap">{inc.emergency_type.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><SeverityBadge severity={inc.severity} /></td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-300">{inc.reporter_name || '—'}</span>
                      {inc.is_anonymous && <span className="text-xs text-slate-600 ml-1">(anon)</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs">
                        <p className="text-slate-300">{inc.barangay}</p>
                        {inc.address && <p className="text-slate-500 truncate max-w-[120px]">{inc.address}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <IncidentStatusBadge status={inc.status} />
                      {inc.intake_state === 'incoming' && <p className="mt-1 text-[10px] text-red-300">Details pending</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-400">{inc.assigned_unit_name || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-500 whitespace-nowrap">{formatRelativeTime(inc.created_at)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-white" render={<Link href={`/admin/incidents/${inc.id}`} />}>
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
              <span className="text-xs text-slate-500">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="h-7 w-7 p-0 text-slate-400 hover:text-white">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs text-slate-400 px-2">{page} / {totalPages}</span>
                <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="h-7 w-7 p-0 text-slate-400 hover:text-white">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
