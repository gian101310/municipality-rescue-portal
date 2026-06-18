'use client'

import { useState } from 'react'
import { Download, TrendingUp, Clock, CheckCircle2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'
import { DEMO_STATS, DEMO_INCIDENTS } from '@/lib/demo-data'
import { toast } from 'sonner'
import { calculateSeverity } from '@/lib/severity-scoring'

function exportCSV() {
  const headers = ['Reference', 'Type', 'Severity', 'Status', 'Barangay', 'Reporter', 'Phone', 'Created At', 'Severity Score']
  const rows = DEMO_INCIDENTS.map((inc) => {
    const sev = calculateSeverity({
      emergencyType: inc.emergency_type.id,
      hazards: [],
      affectedCount: inc.affected_count || 1,
      description: inc.description,
    })
    return [
      inc.reference_number,
      inc.emergency_type.name,
      inc.severity,
      inc.status,
      inc.barangay,
      inc.reporter_name,
      inc.reporter_phone,
      inc.created_at,
      sev.score,
    ].join(',')
  })
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `rescue-portal-incidents-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
  toast.success('CSV exported successfully')
}

const COLORS = ['#dc2626', '#ea580c', '#0284c7', '#ca8a04', '#7c3aed', '#be123c', '#15803d', '#92400e', '#6b7280']

function incidentsByDay() {
  const days: Record<string, number> = {}
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
    days[key] = 0
  }
  DEMO_INCIDENTS.forEach((inc) => {
    const d = new Date(inc.created_at)
    const key = d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
    if (key in days) days[key]++
  })
  return Object.entries(days).map(([date, count]) => ({ date, count }))
}

const typeData = Object.entries(DEMO_STATS.incidents_by_type).map(([name, value]) => ({ name, value }))
const severityData = Object.entries(DEMO_STATS.incidents_by_severity).map(([name, value]) => ({
  name: name.charAt(0).toUpperCase() + name.slice(1), value
}))
const timelineData = incidentsByDay()
const responseData = [
  { day: 'Mon', avg: 7.2 },
  { day: 'Tue', avg: 8.5 },
  { day: 'Wed', avg: 6.8 },
  { day: 'Thu', avg: 9.1 },
  { day: 'Fri', avg: 7.5 },
  { day: 'Sat', avg: 8.9 },
  { day: 'Sun', avg: 10.2 },
]

export default function ReportsPage() {
  const [dateRange] = useState('7d')

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-screen-xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports & Analytics</h1>
          <p className="text-slate-400 text-sm">Emergency response performance overview</p>
        </div>
        <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800" onClick={exportCSV}>
          <Download className="w-4 h-4 mr-1" /> Export CSV
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Incidents', value: DEMO_INCIDENTS.length, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-900/20' },
          { label: 'Avg Response Time', value: `${DEMO_STATS.average_response_time_minutes} min`, icon: Clock, color: 'text-blue-400', bg: 'bg-blue-900/20' },
          { label: 'Resolved Today', value: DEMO_STATS.resolved_today, icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-900/20' },
          { label: 'Active Units', value: `${DEMO_STATS.available_units}/${DEMO_STATS.total_units}`, icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-900/20' },
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

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Incidents by Type */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Incidents by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={typeData} margin={{ top: 5, right: 10, left: -20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} angle={-45} textAnchor="end" interval={0} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }} />
                <Bar dataKey="value" name="Incidents" radius={[4, 4, 0, 0]}>
                  {typeData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Incidents by Severity */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Incidents by Severity</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        {/* Incidents Over Time */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Incidents Over Time (Last 7 Days)</CardTitle>
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

        {/* Response Time Trend */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Average Response Time (min)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={responseData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 10 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }} />
                <Area type="monotone" dataKey="avg" name="Avg Response (min)" stroke="#10b981" fill="#10b98120" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-sm">Incident Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {Object.entries(DEMO_STATS.incidents_by_status).map(([status, count]) => (
              <div key={status} className="bg-slate-800 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-white">{count}</p>
                <p className="text-xs text-slate-400 mt-1 capitalize">{status.replace(/_/g, ' ')}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
