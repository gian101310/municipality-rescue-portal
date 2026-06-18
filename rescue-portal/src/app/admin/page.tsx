'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle, Users, CheckCircle2, Clock, Activity,
  TrendingUp, Eye, Plus, Zap, Map, ArrowRight, Search, Phone, X
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
import { DEMO_INCIDENTS, DEMO_STATS, DEMO_RESCUE_UNITS, DEMO_EMERGENCY_TYPES } from '@/lib/demo-data'
import { useSettings } from '@/lib/settings-context'
import { formatRelativeTime, generateDemoReferenceNumber } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const ACTIVE_STATUSES = ['submitted', 'received', 'verification_pending', 'verified', 'assigned', 'dispatched', 'on_the_way', 'arrived', 'operation_in_progress']

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

  // Manual alert form state
  const [alertType, setAlertType] = useState('')
  const [alertDescription, setAlertDescription] = useState('')
  const [alertReporterName, setAlertReporterName] = useState('')
  const [alertReporterPhone, setAlertReporterPhone] = useState('')
  const [alertBarangay, setAlertBarangay] = useState('')
  const [alertSeverity, setAlertSeverity] = useState('moderate')

  const activeIncidents = DEMO_INCIDENTS.filter((i) => ACTIVE_STATUSES.includes(i.status))
  const resolvedToday = DEMO_INCIDENTS.filter((i) => i.status === 'resolved' || i.status === 'closed').length
  const dispatchedUnits = DEMO_RESCUE_UNITS.filter((u) => u.status === 'dispatched' || u.status === 'on_scene').length
  const onSceneUnits = DEMO_RESCUE_UNITS.filter((u) => u.status === 'on_scene').length

  // Filter incidents
  const filteredIncidents = DEMO_INCIDENTS.filter((i) => {
    if (statusFilter !== 'all' && i.status !== statusFilter) return false
    if (typeFilter !== 'all' && i.emergency_type.id !== typeFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchesRef = i.reference_number.toLowerCase().includes(q)
      const matchesType = i.emergency_type.name.toLowerCase().includes(q)
      const matchesBarangay = i.barangay?.toLowerCase().includes(q)
      const matchesReporter = i.reporter_name?.toLowerCase().includes(q)
      const matchesDesc = i.description?.toLowerCase().includes(q)
      if (!matchesRef && !matchesType && !matchesBarangay && !matchesReporter && !matchesDesc) return false
    }
    return true
  })

  // Recent activity feed
  const recentActivity = DEMO_INCIDENTS.slice(0, 8).flatMap((i) =>
    (i.timeline || []).slice(-1).map((t) => ({ ...t, reference: i.reference_number, incidentId: i.id, emergencyType: i.emergency_type }))
  ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 8)

  function handleSubmitManualAlert() {
    if (!alertType || !alertDescription.trim()) {
      toast.error('Please fill in the emergency type and description')
      return
    }
    const ref = generateDemoReferenceNumber()
    toast.success(`Alert ${ref} created successfully`)
    setShowManualAlert(false)
    setAlertType('')
    setAlertDescription('')
    setAlertReporterName('')
    setAlertReporterPhone('')
    setAlertBarangay('')
    setAlertSeverity('moderate')
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
                    {DEMO_EMERGENCY_TYPES.map((et) => (
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
        <StatCard label="New Alerts" value={DEMO_STATS.total_incidents_today} icon={AlertTriangle} color="text-red-400" pulse />
        <StatCard label="Active Incidents" value={DEMO_STATS.active_incidents} icon={Activity} color="text-amber-400" />
        <StatCard label="Critical" value={DEMO_STATS.critical_incidents} icon={Zap} color="text-red-500" pulse />
        <StatCard label="Dispatched" value={dispatchedUnits} icon={Users} color="text-blue-400" />
        <StatCard label="On Scene" value={onSceneUnits} icon={CheckCircle2} color="text-teal-400" />
        <StatCard label="Resolved Today" value={resolvedToday} icon={CheckCircle2} color="text-green-400" />
        <StatCard label="Avg Response" value={`${DEMO_STATS.average_response_time_minutes} min`} icon={Clock} color="text-purple-400" />
        <StatCard label="Total Incidents" value={DEMO_INCIDENTS.length} icon={TrendingUp} color="text-slate-400" />
      </div>

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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Live Incidents Table */}
        <div className="xl:col-span-2">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between mb-3">
                <CardTitle className="text-white text-base">Live Incidents</CardTitle>
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
                    {DEMO_EMERGENCY_TYPES.map((et) => (
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
                          No incidents match your filters
                        </td>
                      </tr>
                    ) : (
                      filteredIncidents.slice(0, 10).map((incident) => (
                        <tr key={incident.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs text-slate-300">{incident.reference_number.split('-').slice(-1)[0]}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                                style={{ background: incident.emergency_type.color + '30' }}
                              >
                                <EmergencyTypeIcon
                                  iconName={incident.emergency_type.icon}
                                  className="w-3 h-3"
                                  style={{ color: incident.emergency_type.color }}
                                />
                              </span>
                              <span className="text-xs text-slate-300 hidden sm:block truncate max-w-[80px]">{incident.emergency_type.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <SeverityBadge severity={incident.severity} />
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <span className="text-xs text-slate-400">{incident.barangay}</span>
                          </td>
                          <td className="px-4 py-3">
                            <IncidentStatusBadge status={incident.status} />
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

        {/* Activity Feed */}
        <div>
          <Card className="bg-slate-900 border-slate-700 h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0 p-0">
              {recentActivity.map((activity, idx) => (
                <div key={`${activity.id}-${idx}`} className="flex items-start gap-3 px-4 py-3 border-b border-slate-800/50 last:border-0">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: (activity.emergencyType?.color || '#6b7280') + '25' }}
                  >
                    <EmergencyTypeIcon
                      iconName={activity.emergencyType?.icon || 'AlertTriangle'}
                      className="w-3.5 h-3.5"
                      style={{ color: activity.emergencyType?.color || '#6b7280' }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-medium text-white truncate">{activity.label}</p>
                      <Badge variant="outline" className="text-xs border-slate-700 text-slate-400 shrink-0">
                        {activity.reference.split('-').slice(-1)[0]}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{activity.actor_name}</p>
                    <p className="text-xs text-slate-600">{formatRelativeTime(activity.created_at)}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Units Status */}
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-base">Rescue Team Status</CardTitle>
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white text-xs" render={<Link href="/admin/teams" />}>
              Manage <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {DEMO_RESCUE_UNITS.map((unit) => {
              const statusColors: Record<string, string> = {
                available: 'bg-green-500',
                dispatched: 'bg-amber-500',
                on_scene: 'bg-blue-500',
                off_duty: 'bg-slate-500',
                returning: 'bg-teal-500',
              }
              const statusLabels: Record<string, string> = {
                available: 'Available',
                dispatched: 'Dispatched',
                on_scene: 'On Scene',
                off_duty: 'Off Duty',
                returning: 'Returning',
              }
              return (
                <div key={unit.id} className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm text-white">{unit.code}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={cn('w-2 h-2 rounded-full', statusColors[unit.status] || 'bg-slate-500')} />
                      <span className="text-xs text-slate-400">{statusLabels[unit.status] || unit.status}</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">{unit.team_leader_name}</p>
                  <p className="text-xs text-slate-600 mt-1">{unit.members?.length || 0} members</p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
