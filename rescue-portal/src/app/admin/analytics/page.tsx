'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, TrendingUp, Zap, BarChart3, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Incident = {
  id: string
  status: string
  severity: string
  created_at: string
  updated_at: string
  dispatched_at?: string | null
  arrived_at?: string | null
  resolved_at?: string | null
  emergency_type?: { name?: string; color?: string } | null
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
  info: '#6b7280',
}

const PIE_COLORS = ['#ef4444', '#3b82f6', '#eab308', '#22c55e', '#a855f7', '#f97316', '#06b6d4', '#ec4899']

function getResponseMinutes(incident: Incident): number | null {
  if (!incident.dispatched_at || !incident.created_at) return null
  const created = new Date(incident.created_at).getTime()
  const dispatched = new Date(incident.dispatched_at).getTime()
  if (dispatched <= created) return null
  return (dispatched - created) / 60000
}

export default function AnalyticsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/dashboard', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          setIncidents((data.incidents ?? []) as Incident[])
        }
      } catch { /* silent */ } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const analytics = useMemo(() => {
    const responseTimes = incidents
      .map(getResponseMinutes)
      .filter((t): t is number => t !== null && t < 1440)

    const avgResponse = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : null
    const fastest = responseTimes.length > 0 ? Math.round(Math.min(...responseTimes)) : null
    const slowest = responseTimes.length > 0 ? Math.round(Math.max(...responseTimes)) : null

    // Daily response time trend (last 30 days)
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000)
    const dailyMap = new Map<string, number[]>()

    for (const inc of incidents) {
      const d = new Date(inc.created_at)
      if (d < thirtyDaysAgo) continue
      const key = d.toISOString().slice(0, 10)
      const rt = getResponseMinutes(inc)
      if (rt !== null && rt < 1440) {
        const arr = dailyMap.get(key) ?? []
        arr.push(rt)
        dailyMap.set(key, arr)
      }
    }
    const dailyTrend = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, times]) => ({
        date: date.slice(5), // MM-DD
        avg: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
        count: times.length,
      }))

    // By type
    const typeMap = new Map<string, { count: number; color: string }>()
    for (const inc of incidents) {
      const name = inc.emergency_type?.name ?? 'Unknown'
      const color = inc.emergency_type?.color ?? '#6b7280'
      const entry = typeMap.get(name) ?? { count: 0, color }
      entry.count++
      typeMap.set(name, entry)
    }
    const byType = Array.from(typeMap.entries())
      .map(([name, { count, color }]) => ({ name, count, color }))
      .sort((a, b) => b.count - a.count)

    // By severity
    const sevMap: Record<string, number> = {}
    for (const inc of incidents) {
      const sev = inc.severity ?? 'medium'
      sevMap[sev] = (sevMap[sev] ?? 0) + 1
    }
    const bySeverity = Object.entries(sevMap)
      .map(([severity, count]) => ({ severity, count, fill: SEVERITY_COLORS[severity] ?? '#6b7280' }))
      .sort((a, b) => {
        const order = ['critical', 'high', 'medium', 'low', 'info']
        return order.indexOf(a.severity) - order.indexOf(b.severity)
      })

    // By hour
    const hourMap = new Array(24).fill(0)
    for (const inc of incidents) {
      const h = new Date(inc.created_at).getHours()
      hourMap[h]++
    }
    const byHour = hourMap.map((count, hour) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      count,
    }))

    return { avgResponse, fastest, slowest, dailyTrend, byType, bySeverity, byHour }
  }, [incidents])

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="text-sm text-slate-400">Loading analytics...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-screen-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-slate-400 text-sm">Response performance and incident patterns</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Total Incidents" value={incidents.length} icon={BarChart3} color="text-blue-400" />
        <KPICard label="Avg Response" value={analytics.avgResponse !== null ? `${analytics.avgResponse} min` : '—'} icon={Clock} color="text-purple-400" />
        <KPICard label="Fastest" value={analytics.fastest !== null ? `${analytics.fastest} min` : '—'} icon={Zap} color="text-green-400" />
        <KPICard label="Slowest" value={analytics.slowest !== null ? `${analytics.slowest} min` : '—'} icon={TrendingUp} color="text-red-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Response Time Trend */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-sm">Response Time Trend (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.dailyTrend.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-12">No response time data available</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={analytics.dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} unit=" min" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    labelStyle={{ color: '#e2e8f0' }}
                    itemStyle={{ color: '#60a5fa' }}
                  />
                  <Area type="monotone" dataKey="avg" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} name="Avg Response (min)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* By Type - Pie Chart */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-sm">Incidents by Type</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.byType.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-12">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={analytics.byType}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    label={(props: Record<string, unknown>) => `${String(props.name ?? '')} ${(((props.percent as number) ?? 0) * 100).toFixed(0)}%`}
                  >
                    {analytics.byType.map((entry, index) => (
                      <Cell key={entry.name} fill={entry.color || PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    labelStyle={{ color: '#e2e8f0' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* By Severity */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-sm">Incidents by Severity</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.bySeverity.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-12">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={analytics.bySeverity} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis type="number" stroke="#64748b" fontSize={11} />
                  <YAxis dataKey="severity" type="category" stroke="#64748b" fontSize={11} width={70} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    labelStyle={{ color: '#e2e8f0' }}
                  />
                  <Bar dataKey="count" name="Incidents" radius={[0, 4, 4, 0]}>
                    {analytics.bySeverity.map((entry) => (
                      <Cell key={entry.severity} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Hourly Distribution */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-sm">Incidents by Hour of Day</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={analytics.byHour}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="hour" stroke="#64748b" fontSize={10} interval={2} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="Incidents" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function KPICard({ label, value, icon: Icon, color }: {
  label: string; value: string | number; icon: React.FC<{ className?: string }>; color: string
}) {
  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{label}</p>
            <p className={cn('text-2xl font-black', color)}>{value}</p>
          </div>
          <div className="p-2 rounded-lg bg-slate-800">
            <Icon className={cn('w-5 h-5', color)} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
