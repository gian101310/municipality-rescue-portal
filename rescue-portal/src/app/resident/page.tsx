'use client'

import Link from 'next/link'
import { Shield, Phone, AlertTriangle, Clock, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { IncidentStatusBadge } from '@/components/incident-status-badge'
import { EmergencyTypeIcon } from '@/components/emergency-type-icon'
import { DEMO_INCIDENTS, DEMO_RESIDENTS, DEMO_ORGANIZATION } from '@/lib/demo-data'
import { formatRelativeTime } from '@/lib/utils'

// Demo: current resident is Maria Clara Santos
const currentResident = DEMO_RESIDENTS[0]
// Show her most recent active incident
const myIncidents = DEMO_INCIDENTS.filter((i) => i.reporter_id === currentResident.user_id)
const activeIncident = myIncidents.find((i) => ['submitted', 'received', 'on_the_way', 'dispatched', 'arrived'].includes(i.status))

export default function ResidentDashboard() {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Welcome */}
      <div>
        <p className="text-slate-500 text-sm">{greeting},</p>
        <h1 className="text-2xl font-bold text-slate-900">{currentResident.full_name.split(' ')[0]} 👋</h1>
        <p className="text-slate-500 text-sm">{currentResident.barangay}, {currentResident.municipality}</p>
      </div>

      {/* SOS Button */}
      <div className="flex flex-col items-center py-6">
        <Link href="/resident/emergency" className="group">
          <div className="relative">
            {/* Pulse rings */}
            <div className="absolute inset-0 rounded-full bg-red-500/20 scale-125 group-hover:scale-150 transition-transform duration-700 animate-ping" />
            <div className="absolute inset-0 rounded-full bg-red-500/10 scale-150 group-hover:scale-175 transition-transform duration-1000 animate-ping" style={{ animationDelay: '200ms' }} />
            <button className="relative w-36 h-36 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 transition-all shadow-2xl shadow-red-500/40 flex flex-col items-center justify-center text-white">
              <Shield className="w-10 h-10 mb-1" />
              <span className="text-xl font-black tracking-wide">SOS</span>
            </button>
          </div>
        </Link>
        <p className="text-slate-500 text-sm mt-4">Tap to report an emergency</p>
      </div>

      {/* Active Incident */}
      {activeIncident && (
        <Link href={`/admin/incidents/${activeIncident.id}`}>
          <Card className="border-2 border-amber-400/50 bg-amber-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Active Incident</span>
                </div>
                <IncidentStatusBadge status={activeIncident.status} />
              </div>
              <div className="flex items-center gap-2">
                <EmergencyTypeIcon
                  iconName={activeIncident.emergency_type.icon}
                  className="w-4 h-4"
                  style={{ color: activeIncident.emergency_type.color }}
                />
                <span className="font-medium text-slate-900 text-sm">{activeIncident.emergency_type.name}</span>
              </div>
              <p className="text-xs text-slate-600 mt-1 font-mono">{activeIncident.reference_number}</p>
              <p className="text-xs text-slate-500 mt-1">{formatRelativeTime(activeIncident.created_at)}</p>
              {activeIncident.assigned_unit_name && (
                <p className="text-xs text-green-700 mt-1 font-medium">
                  {activeIncident.assigned_unit_name} is responding
                </p>
              )}
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Warning Banner */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-300 leading-relaxed">
            <strong className="text-white">Important:</strong> This portal does not replace national emergency numbers.
            For life-threatening emergencies, call <strong className="text-red-400">911</strong> immediately.
          </p>
        </CardContent>
      </Card>

      {/* Emergency Hotline */}
      <a href={`tel:${DEMO_ORGANIZATION.emergency_hotline.replace(/[^0-9]/g, '')}`}>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Phone className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-red-600 font-medium">Emergency Hotline</p>
                <p className="font-bold text-red-700 text-lg">{DEMO_ORGANIZATION.emergency_hotline}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-red-400" />
          </CardContent>
        </Card>
      </a>

      {/* Recent Incidents */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-900">Recent Reports</h2>
          <Link href="/resident/history" className="text-sm text-blue-600 hover:text-blue-700">View all</Link>
        </div>
        <div className="space-y-2">
          {myIncidents.slice(0, 3).map((inc) => (
            <Card key={inc.id} className="border-slate-200">
              <CardContent className="p-3 flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: inc.emergency_type.color + '20' }}
                >
                  <EmergencyTypeIcon
                    iconName={inc.emergency_type.icon}
                    className="w-4 h-4"
                    style={{ color: inc.emergency_type.color }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">{inc.emergency_type.name}</p>
                  <p className="text-xs text-slate-500">{formatRelativeTime(inc.created_at)}</p>
                </div>
                <IncidentStatusBadge status={inc.status} />
              </CardContent>
            </Card>
          ))}
          {myIncidents.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              No past reports
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
