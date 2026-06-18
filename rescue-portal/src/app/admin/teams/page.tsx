'use client'

import { useState } from 'react'
import { Users, Phone, MapPin, Plus, ChevronDown, ChevronUp, Calendar } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { DEMO_RESCUE_UNITS } from '@/lib/demo-data'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { TeamStatus } from '@/lib/types'

const STATUS_CONFIG: Record<TeamStatus, { label: string; color: string; dot: string }> = {
  available: { label: 'Available', color: 'bg-green-600/20 text-green-400 border-green-500/30', dot: 'bg-green-400' },
  assigned: { label: 'Assigned', color: 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30', dot: 'bg-indigo-400' },
  preparing: { label: 'Preparing', color: 'bg-purple-600/20 text-purple-400 border-purple-500/30', dot: 'bg-purple-400' },
  dispatched: { label: 'Dispatched', color: 'bg-amber-600/20 text-amber-400 border-amber-500/30', dot: 'bg-amber-400' },
  on_scene: { label: 'On Scene', color: 'bg-blue-600/20 text-blue-400 border-blue-500/30', dot: 'bg-blue-400' },
  returning: { label: 'Returning', color: 'bg-teal-600/20 text-teal-400 border-teal-500/30', dot: 'bg-teal-400' },
  off_duty: { label: 'Off Duty', color: 'bg-slate-600/20 text-slate-400 border-slate-600/30', dot: 'bg-slate-500' },
  unavailable: { label: 'Unavailable', color: 'bg-red-600/20 text-red-400 border-red-500/30', dot: 'bg-red-400' },
}

const VEHICLE_TYPE_LABELS: Record<string, string> = {
  ambulance: 'Ambulance',
  fire_truck: 'Fire Truck',
  rescue_vehicle: 'Rescue Vehicle',
  motorcycle: 'Motorcycle',
  boat: 'Boat',
  other: 'Other',
}

export default function TeamsPage() {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-screen-xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Rescue Teams</h1>
          <p className="text-slate-400 text-sm">{DEMO_RESCUE_UNITS.length} units registered</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800" render={<Link href="/admin/teams/shifts" />}>
            <Calendar className="w-4 h-4 mr-1" /> Shift Schedule
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Add Team
          </Button>
        </div>
      </div>

      {/* Status summary */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
          const count = DEMO_RESCUE_UNITS.filter((u) => u.status === status).length
          if (count === 0) return null
          return (
            <div key={status} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium', cfg.color)}>
              <span className={cn('w-2 h-2 rounded-full', cfg.dot)} />
              {cfg.label}: {count}
            </div>
          )
        })}
      </div>

      {/* Team Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DEMO_RESCUE_UNITS.map((unit) => {
          const statusCfg = STATUS_CONFIG[unit.status] || STATUS_CONFIG.unavailable
          const isExpanded = expanded === unit.id

          return (
            <Card key={unit.id} className="bg-slate-900 border-slate-700">
              <CardHeader className="pb-0 px-5 pt-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">{unit.code}</span>
                      <Badge variant="outline" className={cn('text-xs border', statusCfg.color)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full mr-1.5', statusCfg.dot)} />
                        {statusCfg.label}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-white">{unit.name}</h3>
                    <p className="text-sm text-slate-400">{unit.team_leader_name}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {unit.contact_number && (
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-green-400" render={<a href={`tel:${unit.contact_number}`} />}>
                        <Phone className="w-4 h-4" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-white" onClick={() => setExpanded(isExpanded ? null : unit.id)}>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="px-5 pb-5 pt-3 space-y-3">
                {/* Basic info */}
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <p className="text-slate-500">Members</p>
                    <p className="text-white font-medium">{unit.members?.filter((m) => m.is_active).length || 0}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Vehicle</p>
                    <p className="text-white font-medium">{unit.vehicle_info?.type ? VEHICLE_TYPE_LABELS[unit.vehicle_info.type] : '—'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Contact</p>
                    <p className="text-white font-medium truncate">{unit.contact_number || '—'}</p>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="pt-3 border-t border-slate-800 space-y-3">
                    {unit.members && unit.members.length > 0 && (
                      <div>
                        <p className="text-xs text-slate-500 mb-2">Team Members</p>
                        <div className="space-y-1.5">
                          {unit.members.map((m) => (
                            <div key={m.id} className="flex items-center gap-2">
                              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', m.role === 'team_leader' ? 'bg-amber-400' : m.is_active ? 'bg-green-400' : 'bg-slate-600')} />
                              <span className={cn('text-xs', m.is_active ? 'text-slate-300' : 'text-slate-600 line-through')}>{m.user_name}</span>
                              {m.role === 'team_leader' && <Badge className="text-xs bg-amber-600/20 text-amber-400 border border-amber-500/30 py-0 px-1">Leader</Badge>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {unit.vehicle_info && (
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Vehicle</p>
                        <p className="text-xs text-slate-300">
                          {unit.vehicle_info.model} · {unit.vehicle_info.plate_number} · {unit.vehicle_info.color}
                          {unit.vehicle_info.capacity && ` · Cap: ${unit.vehicle_info.capacity}`}
                        </p>
                      </div>
                    )}

                    {unit.equipment.length > 0 && (
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Equipment</p>
                        <div className="flex flex-wrap gap-1">
                          {unit.equipment.map((eq) => (
                            <Badge key={eq} variant="outline" className="text-xs border-slate-700 text-slate-400">{eq}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {unit.specializations.length > 0 && (
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Specializations</p>
                        <div className="flex flex-wrap gap-1">
                          {unit.specializations.map((sp) => (
                            <Badge key={sp} variant="outline" className="text-xs border-blue-700/50 text-blue-400">{sp}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {unit.current_lat && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <a
                          href={`https://www.google.com/maps?q=${unit.current_lat},${unit.current_lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:text-blue-300"
                        >
                          View last known location
                        </a>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800 text-xs" onClick={() => toast.success('Demo: Team details would open here')}>
                    Edit Team
                  </Button>
                  <Button size="sm" variant="outline" className="border-amber-700/50 text-amber-400 hover:bg-amber-900/20 text-xs" onClick={() => toast.success('Demo: Dispatch dialog would open')}>
                    Dispatch
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Add Team Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Add New Rescue Team</DialogTitle>
            <DialogDescription className="text-slate-400">
              In demo mode, team creation is simulated. Connect to Supabase to enable real team management.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-center text-slate-400 text-sm">
            <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            Demo mode — form would appear here
          </div>
          <Button onClick={() => { setAddOpen(false); toast.success('Demo: Team would be created') }} className="bg-blue-600 hover:bg-blue-700 text-white">
            Simulate Create
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
