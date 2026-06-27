'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import {
  AlertTriangle, Users, CheckCircle2, Clock, Activity,
  TrendingUp, Eye, Plus, Zap, Map, ArrowRight, Search, Phone, X, RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { IncidentStatusBadge } from '@/components/incident-status-badge'
import { SeverityBadge } from '@/components/severity-badge'
import { EmergencyTypeIcon } from '@/components/emergency-type-icon'
import { useSettings } from '@/lib/settings-context'
import { formatRelativeTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { DemoIncident, EmergencyType } from '@/lib/types'
import { useRealtimeIncidents } from '@/lib/use-realtime-incidents'
import { playAdminNotificationSound } from '@/lib/notification-sound'
import { EscalationMonitor } from '@/components/escalation-monitor'
import { MapView } from '@/components/map-view'
import { buildDashboardIncidentMarkers } from '@/lib/dashboard-live-map'

type DashboardStats = {
  total_incidents_today: number
  active_incidents: number
  critical_incidents: number
  resolved_today: number
  pending_registrations: number
  average_response_time_minutes: number | null
  total_incidents: number
}

function StatCard({
  label, value, icon: Icon, color, pulse
}: {
  label: string
  value: string | number
  icon: React.FC<{ className?: string }>
  color: string
  pulse?: boolean
}) {
  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{label}</p>
            <p className={cn('text-3xl font-black', color, pulse && 'animate-pulse')}>{value}</p>
          </div>
          <div className={cn('p-2 rounded-lg', color.includes('red') ? 'bg-red-900/30' : color.includes('yellow') || color.includes('amber') ? 'bg-amber-900/30' : color.includes('green') ? 'bg-green-900/30' : color.includes('blue') ? 'bg-blue-900/30' : 'bg-slate-800')}>
            <Icon className={cn('w-5 h-5', color)} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function CommandCenterPage() {
  const { settings } = useSettings()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [showManualAlert, setShowManualAlert] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Real data state
  const [incidents, setIncidents] = useState<DemoIncident[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [emergencyTypes, setEmergencyTypes] = useState<EmergencyType[]>([])

  // Manual alert form state
  const [alertType, setAlertType] = useState('')
  const [alertDescription, setAlertDescription] = useState('')
  const [alertReporterName, setAlertReporterName] = useState('')
  const [alertReporterPhone, setAlertReporterPhone] = useState('')
  const [alertBarangay, setAlertBarangay] = useState('')
  const [alertSeverity, setAlertSeverity] = useState('moderate')

  const fetchDashboard = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    try {
      const res = await fetch('/api/admin/dashboard', { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load dashboard')
      const data = await res.json()
      setIncidents((data.incidents ?? []) as DemoIncident[])
      setStats(data.stats ?? null)
      setEmergencyTypes((data.emergencyTypes ?? []) as EmergencyType[])
    } catch (err) {
      if (showRefresh) toast.error(err instanceof Error ? err.message : 'Dashboard load failed')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    const initialFetch = setTimeout(fetchDashboard, 0)
    // Auto-refresh every 15 seconds
    const interval = setInterval(() => fetchDashboard(), 15000)
    return () => {
      clearTimeout(initialFetch)
      clearInterval(interval)
    }
  }, [fetchDashboard])

  // Realtime subscription for instant updates
  const { isConnected: realtimeConnected } = useRealtimeIncidents({
    onNewIncident: (payload) => {
      const newIncident = payload.new as unknown as DemoIncident
      setIncidents((prev) => {
        // Avoid duplicates
        if (prev.some((i) => i.id === newIncident.id)) return prev
        return [newIncident, ...prev]
      })
      setStats((prev) =>
        prev ? { ...prev, total_incidents_today: prev.total_incidents_today + 1, active_incidents: prev.active_incidents + 1, total_incidents: prev.total_incidents + 1 } : prev
      )
      playAdminNotificationSound()
      const typeName = newIncident.emergency_type?.name ?? 'Emergency'
      toast.info(`New incident: ${typeName}`, { description: newIncident.reference_number ?? 'New report received' })
    },
    onIncidentUpdate: (payload) => {
      const updated = payload.new as unknown as DemoIncident
      setIncidents((prev) => prev.map((i) => (i.id === updated.id ? { ...i, ...updated } : i)))
    },
  })

  // Filter incidents
  const filteredIncidents = incidents.filter((i) => {
    if (statusFilter !== 'all' && i.status !== statusFilter) return false
    if (typeFilter !== 'all' && i.emergency_type?.id !== typeFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchesRef = i.reference_number?.toLowerCase().includes(q)
      const matchesType = i.emergency_type?.name?.toLowerCase().includes(q)
      const matchesBarangay = i.barangay?.toLowerCase().includes(q)
      const matchesReporter = i.reporter_name?.toLowerCase().includes(q)
      const matchesDesc = i.description?.toLowerCase().includes(q)
      if (!matchesRef && !matchesType && !matchesBarangay && !matchesReporter && !matchesDesc) return false
    }
    return true
  })

  const [selectedMapIncident, setSelectedMapIncident] = useState<string | null>(null)
  const dashboardMapMarkers = useMemo(() => buildDashboardIncidentMarkers(incidents), [incidents])
  const dashboardMapCenter = dashboardMapMarkers[0]
    ? { lat: dashboardMapMarkers[0].lat, lng: dashboardMapMarkers[0].lng }
    : { lat: settings.mapCenterLat, lng: settings.mapCenterLng }

  async function handleSubmitManualAlert() {
    if (!alertType || !alertDescription.trim()) {
      toast.error('Please fill in the emergency type and description')
      return
    }
    try {
      const response = await fetch('/api/admin/incidents/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emergency_type_id: alertType,
          description: alertDescription.trim(),
          reporter_name: alertReporterName.trim() || 'Walk-in / Call-in',
          reporter_phone: alertReporterPhone.trim() || null,
          barangay: alertBarangay.trim() || null,
          severity: alertSeverity,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.message ?? 'Unable to create alert.')
      toast.success(`Alert created: ${payload.reference_number ?? 'New incident'}`)
      setShowManualAlert(false)
      setAlertType('')
      setAlertDescription('')
      setAlertReporterName('')
      setAlertReporterPhone('')
      setAlertBarangay('')
      setAlertSeverity('moderate')
      void fetchDashboard()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to create alert.')
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-sm text-slate-400">Loading dashboard...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-screen-2xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Command Center</h1>
          <p className="text-slate-400 text-sm">{settings.municipalityName} — Emergency Operations Dashboard</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
            onClick={() => fetchDashboard(true)}
            disabled={refreshing}
          >
            <RefreshCw className={cn('w-4 h-4 mr-1', refreshing && 'animate-spin')} />
            Refresh
          </Button>
          <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800" render={<Link href="/admin/incidents" />}>
              <Map className="w-4 h-4 mr-1" />
              View All
          </Button>
          <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => setShowManualAlert(true)}>
            <Plus className="w-4 h-4 mr-1" />
            New Alert
          </Button>
        </div>
      </div>

      {/* Manual Alert Dialog */}
      {showManualAlert && (
        <Card className="bg-slate-900 border-red-700/50 border-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                Create Manual Alert
              </CardTitle>
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white h-7 w-7" onClick={() => setShowManualAlert(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-slate-300">Emergency Type *</Label>
                <Select value={alertType} onValueChange={(v) => setAlertType(v ?? '')}>
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    {emergencyTypes.map((et) => (
                      <SelectItem key={et.id} value={et.id} className="text-white hover:bg-slate-700">{et.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300">Severity</Label>
                <Select value={alertSeverity} onValueChange={(v) => setAlertSeverity(v ?? 'moderate')}>
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    {['low', 'moderate', 'high', 'critical'].map((s) => (
                      <SelectItem key={s} value={s} className="text-white hover:bg-slate-700 capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300">Reporter Name</Label>
                <Input value={alertReporterName} onChange={(e) => setAlertReporterName(e.target.value)} placeholder="Walk-in or call-in reporter" className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300">Reporter Phone</Label>
                <Input value={alertReporterPhone} onChange={(e) => setAlertReporterPhone(e.target.value)} placeholder="09171234567" className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-slate-300">Barangay / Location</Label>
                <Input value={alertBarangay} onChange={(e) => setAlertBarangay(e.target.value)} placeholder="Barangay or landmark" className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-slate-300">Description *</Label>
                <Textarea value={alertDescription} onChange={(e) => setAlertDescription(e.target.value)} placeholder="Describe the emergency..." className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 min-h-[80px]" />
              </div>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <Button variant="outline" className="border-slate-600 text-slate-300" onClick={() => setShowManualAlert(false)}>Cancel</Button>
              <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleSubmitManualAlert}>
                <Plus className="w-4 h-4 mr-1" /> Create Alert
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="New Today" value={stats?.total_incidents_today ?? 0} icon={AlertTriangle} color="text-red-400" pulse={!!stats?.total_incidents_today} />
        <StatCard label="Active Incidents" value={stats?.active_incidents ?? 0} icon={Activity} color="text-amber-400" />
        <StatCard label="Critical" value={stats?.critical_incidents ?? 0} icon={Zap} color="text-red-500" pulse={!!stats?.critical_incidents} />
        <StatCard label="Resolved Today" value={stats?.resolved_today ?? 0} icon={CheckCircle2} color="text-green-400" />
        <StatCard label="Pending Regs" value={stats?.pending_registrations ?? 0} icon={Users} color="text-blue-400" />
        <StatCard label="Avg Response" value={stats?.average_response_time_minutes ? `${stats.average_response_time_minutes} min` : '—'} icon={Clock} color="text-purple-400" />
        <StatCard label="Total Incidents" value={stats?.total_incidents ?? 0} icon={TrendingUp} color="text-slate-400" />
      </div>

      {/* Auto-Escalation Monitor */}
      <EscalationMonitor incidents={incidents} />

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" className="bg-red-700 hover:bg-red-600 text-white" onClick={() => setShowManualAlert(true)}>
          <Plus className="w-4 h-4 mr-1" /> Manual Alert
        </Button>
        <Button size="sm" className="bg-blue-700 hover:bg-blue-600 text-white" render={<Link href="/admin/teams" />}>
            <Users className="w-4 h-4 mr-1" /> Dispatch Team
        </Button>
        <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800" render={<Link href="/admin/map" />}>
            <Map className="w-4 h-4 mr-1" /> View Map
        </Button>
      </div>

      <Card className="bg-slate-900 border-slate-700">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Map className="w-4 h-4 text-blue-400" />
                Live GPS Map
              </CardTitle>
              <p className="text-xs text-slate-500 mt-1">Incoming SOS locations appear here immediately.</p>
            </div>
            <Badge className={realtimeConnected
              ? 'bg-green-500/20 text-green-400 border-green-500/30'
              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'}>
              {realtimeConnected ? 'LIVE' : 'RECONNECTING'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <MapView
            center={dashboardMapCenter}
            zoom={dashboardMapMarkers.length ? 15 : 12}
            markers={dashboardMapMarkers}
            selectedMarkerId={selectedMapIncident}
            onMarkerClick={(id) => setSelectedMapIncident(id === selectedMapIncident ? null : id)}
            height="360px"
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Live Incidents Table */}
        <div className="xl:col-span-2">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between mb-3">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  Live Incidents
                  <span className={cn('w-2 h-2 rounded-full', realtimeConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500')} title={realtimeConnected ? 'Realtime connected' : 'Realtime disconnected'} />
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white text-xs" render={<Link href="/admin/incidents" />}>
                  View all <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
              {/* Search & Filters */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search ref, type, barangay, reporter..."
                    className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 pl-9 h-9 text-sm"
                  />
                </div>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'all')}>
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white w-[140px] h-9 text-sm">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="all" className="text-white hover:bg-slate-700">All Statuses</SelectItem>
                    {['submitted', 'received', 'verified', 'dispatched', 'on_the_way', 'arrived', 'operation_in_progress', 'resolved', 'closed'].map((s) => (
                      <SelectItem key={s} value={s} className="text-white hover:bg-slate-700 capitalize">{s.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? 'all')}>
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white w-[140px] h-9 text-sm">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="all" className="text-white hover:bg-slate-700">All Types</SelectItem>
                    {emergencyTypes.map((et) => (
                      <SelectItem key={et.id} value={et.id} className="text-white hover:bg-slate-700">{et.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left px-4 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider">Reference</th>
                      <th className="text-left px-4 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider">Type</th>
                      <th className="text-left px-4 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider hidden sm:table-cell">Severity</th>
                      <th className="text-left px-4 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider hidden md:table-cell">Location</th>
                      <th className="text-left px-4 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider">Status</th>
                      <th className="text-left px-4 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider hidden lg:table-cell">Time</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIncidents.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-500 text-sm">
                          {incidents.length === 0 ? 'No incidents yet — reports from residents will appear here.' : 'No incidents match your filters'}
                        </td>
                      </tr>
                    ) : (
                      filteredIncidents.slice(0, 10).map((incident) => (
                        <tr key={incident.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs text-slate-300">{incident.reference_number?.split('-').slice(-1)[0]}</span>
                            {incident.intake_state === 'incoming' && (
                              <span className="mt-1 block text-[10px] font-bold uppercase tracking-wide text-red-300 animate-pulse">Incoming SOS</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                                style={{ background: (incident.emergency_type?.color ?? '#6b7280') + '30' }}
                              >
                                <EmergencyTypeIcon
                                  iconName={incident.emergency_type?.icon ?? 'AlertTriangle'}
                                  className="w-3 h-3"
                                  style={{ color: incident.emergency_type?.color ?? '#6b7280' }}
                                />
                              </span>
                              <span className="text-xs text-slate-300 truncate max-w-[80px]">{incident.emergency_type?.name ?? 'Unknown'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <SeverityBadge severity={incident.severity} />
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <span className="text-xs text-slate-400">{incident.barangay}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              <IncidentStatusBadge status={incident.status} />
                              {incident.intake_state === 'incoming' && <p className="text-[10px] text-red-300">Location received · details pending</p>}
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <span className="text-xs text-slate-500">{formatRelativeTime(incident.created_at)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {incident.reporter_phone && (
                                <a
                                  href={`tel:${incident.reporter_phone}`}
                                  className="inline-flex items-center justify-center h-7 w-7 rounded text-green-400 hover:bg-green-900/30 transition-colors"
                                  title={`Call ${incident.reporter_phone}`}
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                </a>
                              )}
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-white" render={<Link href={`/admin/incidents/${incident.id}`} />}>
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {filteredIncidents.length > 10 && (
                <div className="px-4 py-2 border-t border-slate-800 text-center">
                  <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white text-xs" render={<Link href="/admin/incidents" />}>
                    View all {filteredIncidents.length} incidents <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Activity Feed — recent incidents */}
        <div>
          <Card className="bg-slate-900 border-slate-700 h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0 p-0">
              {incidents.length === 0 && (
                <p className="text-slate-500 text-xs text-center px-4 py-8">No activity yet</p>
              )}
              {incidents.slice(0, 8).map((incident) => (
                <Link
                  key={incident.id}
                  href={`/admin/incidents/${incident.id}`}
                  className="flex items-start gap-3 px-4 py-3 border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30 transition-colors"
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: (incident.emergency_type?.color || '#6b7280') + '25' }}
                  >
                    <EmergencyTypeIcon
                      iconName={incident.emergency_type?.icon || 'AlertTriangle'}
                      className="w-3.5 h-3.5"
                      style={{ color: incident.emergency_type?.color || '#6b7280' }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-medium text-white truncate">{incident.emergency_type?.name ?? 'Alert'}</p>
                      <Badge variant="outline" className="text-xs border-slate-700 text-slate-400 shrink-0">
                        {incident.reference_number?.split('-').slice(-1)[0]}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{incident.reporter_name ?? 'Anonymous'}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <IncidentStatusBadge status={incident.status} />
                      <span className="text-xs text-slate-600">{formatRelativeTime(incident.created_at)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
