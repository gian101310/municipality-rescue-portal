'use client'

import { useEffect, useMemo, useState } from 'react'
import { Download, TrendingUp, Clock, CheckCircle2, AlertTriangle, Filter, FileJson, Loader2, Search, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'
import { IncidentStatusBadge } from '@/components/incident-status-badge'
import { SeverityBadge } from '@/components/severity-badge'
import { EmergencyTypeIcon } from '@/components/emergency-type-icon'
import { formatRelativeTime } from '@/lib/utils'
import type { IncidentStatus, SeverityLevel } from '@/lib/types'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

type Incident = {
  id: string
  reference_number?: string
  status: string
  severity: string
  description?: string
  reporter_name?: string
  reporter_phone?: string
  reporter_role?: string
  barangay?: string
  municipality?: string
  latitude?: number
  longitude?: number
  created_at: string
  updated_at?: string
  dispatched_at?: string | null
  arrived_at?: string | null
  resolved_at?: string | null
  closed_at?: string | null
  cancelled_at?: string | null
  emergency_type?: { name?: string; icon?: string; color?: string } | null
  assigned_unit_name?: string | null
}

const COLORS = ['#dc2626', '#ea580c', '#0284c7', '#ca8a04', '#7c3aed', '#be123c', '#15803d', '#92400e', '#6b7280']
const ADMIN_ROLES = new Set(['super_admin', 'admin'])

export default function ReportsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [dateRange, setDateRange] = useState('30d')
  const [userRole, setUserRole] = useState<string>('')
  const [loadedAt] = useState(() => Date.now())

  useEffect(() => {
    async function loadRole() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: profile } = await supabase.from('user_profiles').select('role').eq('user_id', user.id).single() as { data: { role: string } | null; error: unknown }
        if (profile) setUserRole(profile.role)
      } catch { /* silent */ }
    }
    loadRole()
  }, [])

  const isAdmin = ADMIN_ROLES.has(userRole)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/incidents', { cache: 'no-store' })
        if (!res.ok) throw new Error('Failed')
        const data = await res.json()
        setIncidents((data.incidents ?? data ?? []) as Incident[])
      } catch {
        toast.error('Unable to load incident data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Filter incidents by date range
  const dateFiltered = useMemo(() => {
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : 365
    const cutoff = loadedAt - days * 86400000
    return incidents.filter(i => new Date(i.created_at).getTime() >= cutoff)
  }, [incidents, dateRange, loadedAt])

  // Apply search + filters
  const filtered = useMemo(() => {
    return dateFiltered.filter(i => {
      if (statusFilter !== 'all' && i.status !== statusFilter) return false
      if (severityFilter !== 'all' && i.severity !== severityFilter) return false
      if (search) {
        const q = search.toLowerCase()
        const match = (i.reference_number?.toLowerCase().includes(q)) ||
          (i.reporter_name?.toLowerCase().includes(q)) ||
          (i.barangay?.toLowerCase().includes(q)) ||
          (i.emergency_type?.name?.toLowerCase().includes(q)) ||
          (i.description?.toLowerCase().includes(q))
        if (!match) return false
      }
      return true
    })
  }, [dateFiltered, statusFilter, severityFilter, search])

  // KPIs
  const totalIncidents = dateFiltered.length
  const resolvedCount = dateFiltered.filter(i => ['resolved', 'closed'].includes(i.status)).length
  const activeCount = dateFiltered.filter(i => !['resolved', 'closed', 'cancelled', 'false_alert', 'duplicate', 'invalid'].includes(i.status)).length
  const cancelledCount = dateFiltered.filter(i => ['cancelled', 'false_alert'].includes(i.status)).length

  // Average response time (created_at → dispatched_at)
  const avgResponseMin = useMemo(() => {
    const times = dateFiltered
      .filter(i => i.dispatched_at && i.created_at)
      .map(i => (new Date(i.dispatched_at!).getTime() - new Date(i.created_at).getTime()) / 60000)
      .filter(t => t > 0 && t < 1440) // exclude > 24h outliers
    if (times.length === 0) return '—'
    return (times.reduce((a, b) => a + b, 0) / times.length).toFixed(1)
  }, [dateFiltered])

  // Chart data: by type
  const typeData = useMemo(() => {
    const counts: Record<string, number> = {}
    dateFiltered.forEach(i => {
      const t = i.emergency_type?.name ?? 'Unknown'
      counts[t] = (counts[t] || 0) + 1
    })
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [dateFiltered])

  // Chart data: by severity
  const severityData = useMemo(() => {
    const counts: Record<string, number> = {}
    dateFiltered.forEach(i => {
      const s = i.severity || 'unknown'
      counts[s] = (counts[s] || 0) + 1
    })
    return Object.entries(counts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1), value
    }))
  }, [dateFiltered])

  // Chart data: incidents per day (last N days)
  const timelineData = useMemo(() => {
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : 365
    const result: { date: string; count: number }[] = []
    for (let i = Math.min(days, 30) - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
      const dayEnd = dayStart + 86400000
      const count = dateFiltered.filter(inc => {
        const t = new Date(inc.created_at).getTime()
        return t >= dayStart && t < dayEnd
      }).length
      result.push({ date: key, count })
    }
    return result
  }, [dateFiltered, dateRange])

  // Status breakdown
  const statusBreakdown = useMemo(() => {
    const counts: Record<string, number> = {}
    dateFiltered.forEach(i => {
      counts[i.status] = (counts[i.status] || 0) + 1
    })
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [dateFiltered])

  function exportCSV() {
    const headers = ['Reference', 'Type', 'Severity', 'Status', 'Reporter', 'Reporter Role', 'Phone', 'Barangay', 'Created At', 'Dispatched At', 'Arrived At', 'Resolved At']
    const rows = filtered.map(inc => [
      inc.reference_number ?? '',
      inc.emergency_type?.name ?? '',
      inc.severity,
      inc.status,
      inc.reporter_name ?? '',
      inc.reporter_role ?? '',
      inc.reporter_phone ?? '',
      inc.barangay ?? '',
      inc.created_at,
      inc.dispatched_at ?? '',
      inc.arrived_at ?? '',
      inc.resolved_at ?? '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rescue-portal-incidents-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${filtered.length} incidents to CSV`)
  }

  function exportJSON() {
    const data = filtered.map(inc => ({
      reference_number: inc.reference_number,
      emergency_type: inc.emergency_type?.name,
      severity: inc.severity,
      status: inc.status,
      reporter_name: inc.reporter_name,
      reporter_role: inc.reporter_role,
      reporter_phone: inc.reporter_phone,
      barangay: inc.barangay,
      latitude: inc.latitude,
      longitude: inc.longitude,
      created_at: inc.created_at,
      dispatched_at: inc.dispatched_at,
      arrived_at: inc.arrived_at,
      resolved_at: inc.resolved_at,
      closed_at: inc.closed_at,
    }))
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rescue-portal-incidents-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${filtered.length} incidents to JSON`)
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-screen-xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports & Analytics</h1>
          <p className="text-slate-400 text-sm">Live incident data — {totalIncidents} incidents in selected range</p>
        </div>
        <div className="flex gap-2">
          {isAdmin ? (
            <>
              <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-800" onClick={exportCSV}>
                <Download className="w-4 h-4 mr-1" /> CSV
              </Button>
              <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-800" onClick={exportJSON}>
                <FileJson className="w-4 h-4 mr-1" /> JSON
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Lock className="w-3.5 h-3.5" /> Admin-only export
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={dateRange} onValueChange={(v) => setDateRange(v ?? '7d')}>
          <SelectTrigger className="w-32 bg-slate-800 border-slate-600 text-white text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="365d">Last year</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'all')}>
          <SelectTrigger className="w-36 bg-slate-800 border-slate-600 text-white text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="dispatched">Dispatched</SelectItem>
            <SelectItem value="on_the_way">On the Way</SelectItem>
            <SelectItem value="arrived">Arrived</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="false_alert">False Alarm</SelectItem>
          </SelectContent>
        </Select>
        <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v ?? 'all')}>
          <SelectTrigger className="w-32 bg-slate-800 border-slate-600 text-white text-sm">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Search reference, reporter, barangay..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-800 border-slate-600 text-white text-sm"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total Incidents', value: totalIncidents, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-900/20' },
          { label: 'Active Now', value: activeCount, icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-900/20' },
          { label: 'Resolved', value: resolvedCount, icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-900/20' },
          { label: 'Cancelled', value: cancelledCount, icon: Filter, color: 'text-slate-400', bg: 'bg-slate-800' },
          { label: 'Avg Response', value: `${avgResponseMin} min`, icon: Clock, color: 'text-blue-400', bg: 'bg-blue-900/20' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="bg-slate-900 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-400 mb-1">{label}</p>
                  <p className={`text-2xl font-black ${color}`}>{value}</p>
                </div>
                <div className={`p-2 rounded-lg ${bg}`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Incidents by Type */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Incidents by Type</CardTitle>
          </CardHeader>
          <CardContent>
            {typeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={typeData} margin={{ top: 5, right: 10, left: -20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} angle={-45} textAnchor="end" interval={0} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }} />
                  <Bar dataKey="value" name="Incidents" radius={[4, 4, 0, 0]}>
                    {typeData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-500 text-sm text-center py-10">No incidents in this range</p>
            )}
          </CardContent>
        </Card>

        {/* Incidents by Severity */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Incidents by Severity</CardTitle>
          </CardHeader>
          <CardContent>
            {severityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={severityData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" nameKey="name" label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''}: ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={{ stroke: '#475569' }}>
                    {severityData.map((_, idx) => (
                      <Cell key={idx} fill={['#dc2626', '#f97316', '#eab308', '#3b82f6', '#6b7280'][idx] || '#6b7280'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-500 text-sm text-center py-10">No data</p>
            )}
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card className="bg-slate-900 border-slate-700 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Incidents Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={timelineData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }} />
                <Line type="monotone" dataKey="count" name="Incidents" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-sm">Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {statusBreakdown.map(([status, count]) => (
              <div key={status} className="bg-slate-800 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-white">{count}</p>
                <p className="text-xs text-slate-400 mt-1 capitalize">{status.replace(/_/g, ' ')}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Incident Log Table */}
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-sm">Incident Log ({filtered.length})</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-left">
                  <th className="pb-2 text-slate-400 font-medium text-xs">Reference</th>
                  <th className="pb-2 text-slate-400 font-medium text-xs">Type</th>
                  <th className="pb-2 text-slate-400 font-medium text-xs">Severity</th>
                  <th className="pb-2 text-slate-400 font-medium text-xs">Status</th>
                  <th className="pb-2 text-slate-400 font-medium text-xs">Reporter</th>
                  <th className="pb-2 text-slate-400 font-medium text-xs">Barangay</th>
                  <th className="pb-2 text-slate-400 font-medium text-xs">Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 50).map(inc => (
                  <tr key={inc.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                    <td className="py-2 text-blue-400 font-mono text-xs">{inc.reference_number ?? '—'}</td>
                    <td className="py-2">
                      <span className="flex items-center gap-1.5">
                        <EmergencyTypeIcon iconName={inc.emergency_type?.icon ?? 'AlertTriangle'} className="w-3.5 h-3.5" style={{ color: inc.emergency_type?.color ?? '#ef4444' }} />
                        <span className="text-white text-xs">{inc.emergency_type?.name ?? 'Emergency'}</span>
                      </span>
                    </td>
                    <td className="py-2"><SeverityBadge severity={inc.severity as SeverityLevel} /></td>
                    <td className="py-2"><IncidentStatusBadge status={inc.status as IncidentStatus} /></td>
                    <td className="py-2 text-slate-300 text-xs">{inc.reporter_name ?? '—'}</td>
                    <td className="py-2 text-slate-400 text-xs">{inc.barangay ?? '—'}</td>
                    <td className="py-2 text-slate-400 text-xs">{formatRelativeTime(inc.created_at)}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 text-sm">No incidents match your filters</td>
                  </tr>
                )}
              </tbody>
            </table>
            {filtered.length > 50 && (
              <p className="text-xs text-slate-500 mt-3 text-center">Showing 50 of {filtered.length} — export for full data</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
