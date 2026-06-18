'use client'

import Link from 'next/link'
import {
  AlertTriangle, Users, CheckCircle2, Clock, Activity,
  TrendingUp, Eye, Plus, Zap, Map, ArrowRight
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { IncidentStatusBadge } from '@/components/incident-status-badge'
import { SeverityBadge } from '@/components/severity-badge'
import { EmergencyTypeIcon } from '@/components/emergency-type-icon'
import { DEMO_INCIDENTS, DEMO_STATS, DEMO_RESCUE_UNITS, DEMO_ORGANIZATION } from '@/lib/demo-data'
import { formatRelativeTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

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
  const activeIncidents = DEMO_INCIDENTS.filter((i) => ACTIVE_STATUSES.includes(i.status))
  const resolvedToday = DEMO_INCIDENTS.filter((i) => i.status === 'resolved' || i.status === 'closed').length
  const dispatchedUnits = DEMO_RESCUE_UNITS.filter((u) => u.status === 'dispatched' || u.status === 'on_scene').length
  const onSceneUnits = DEMO_RESCUE_UNITS.filter((u) => u.status === 'on_scene').length

  // Recent activity feed
  const recentActivity = DEMO_INCIDENTS.slice(0, 8).flatMap((i) =>
    (i.timeline || []).slice(-1).map((t) => ({ ...t, reference: i.reference_number, incidentId: i.id, emergencyType: i.emergency_type }))
  ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 8)

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-screen-2xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Command Center</h1>
          <p className="text-slate-400 text-sm">{DEMO_ORGANIZATION.name} — Emergency Operations Dashboard</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800" render={<Link href="/admin/incidents" />}>
              <Map className="w-4 h-4 mr-1" />
              View All
          </Button>
          <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white">
            <Plus className="w-4 h-4 mr-1" />
            New Alert
          </Button>
        </div>
      </div>

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
        <Button size="sm" className="bg-red-700 hover:bg-red-600 text-white">
          <Plus className="w-4 h-4 mr-1" /> Manual Alert
        </Button>
        <Button size="sm" className="bg-blue-700 hover:bg-blue-600 text-white" render={<Link href="/admin/teams" />}>
            <Users className="w-4 h-4 mr-1" /> Dispatch Team
        </Button>
        <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800" render={<Link href="/admin/incidents" />}>
            <Map className="w-4 h-4 mr-1" /> View Map
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Live Incidents Table */}
        <div className="xl:col-span-2">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-base">Live Incidents</CardTitle>
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white text-xs" render={<Link href="/admin/incidents" />}>
                  View all <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
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
                    {DEMO_INCIDENTS.slice(0, 8).map((incident) => (
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
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-white" render={<Link href={`/admin/incidents/${incident.id}`} />}>
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
