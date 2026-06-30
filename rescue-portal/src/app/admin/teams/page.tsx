'use client'

import { useEffect, useState } from 'react'
import { Users, Phone, MapPin, Plus, ChevronDown, ChevronUp, Calendar, UserPlus, UserMinus, Send, X, Check, Edit2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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

const POSITION_LABELS: Record<string, string> = {
  team_leader: 'Team Leader',
  driver: 'Driver',
  medic: 'Medic',
  responder: 'Responder',
  fire_specialist: 'Fire Specialist',
  communications: 'Communications',
}

export default function TeamsPage() {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [teams, setTeams] = useState<any[]>([])

  // Create team dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [newTeam, setNewTeam] = useState({ name: '', code: '', contact_number: '', vehicle_type: '', plate_number: '', vehicle_model: '', equipment: [] as string[] })

  // Edit team dialog
  const [editOpen, setEditOpen] = useState(false)
  const [editTeamData, setEditTeamData] = useState<any>(null)

  // Add member dialog
  const [addMemberOpen, setAddMemberOpen] = useState(false)
  const [addMemberTeamId, setAddMemberTeamId] = useState('')
  const [staffList, setStaffList] = useState<any[]>([])
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [selectedPosition, setSelectedPosition] = useState('')

  // Dispatch dialog
  const [dispatchOpen, setDispatchOpen] = useState(false)
  const [dispatchTeam, setDispatchTeam] = useState<any>(null)
  const [activeIncidents, setActiveIncidents] = useState<any[]>([])
  const [selectedIncidentId, setSelectedIncidentId] = useState('')
  const [dispatching, setDispatching] = useState(false)

  async function loadTeams() {
    const response = await fetch('/api/admin/teams', { cache: 'no-store' })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) return toast.error(payload.message ?? 'Unable to load rescue teams.')
    setTeams(payload.teams ?? [])
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadTeams() }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  async function handleCreateTeam() {
    if (!newTeam.name.trim() || !newTeam.code.trim()) return toast.error('Team name and code are required.')
    const body: any = { name: newTeam.name, code: newTeam.code, contact_number: newTeam.contact_number }
    if (newTeam.vehicle_type) {
      body.vehicle_info = { type: newTeam.vehicle_type, plate_number: newTeam.plate_number, model: newTeam.vehicle_model }
    }
    if (newTeam.equipment.length > 0) body.equipment = newTeam.equipment
    const response = await fetch('/api/admin/teams', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) return toast.error(payload.message ?? 'Unable to create team.')
    toast.success('Rescue team created'); setCreateOpen(false); setNewTeam({ name: '', code: '', contact_number: '', vehicle_type: '', plate_number: '', vehicle_model: '', equipment: [] }); void loadTeams()
  }

  async function handleEditTeam() {
    if (!editTeamData) return
    const body: any = { name: editTeamData.name, code: editTeamData.code, contact_number: editTeamData.contact_number, status: editTeamData.status }
    if (editTeamData.vehicle_type) {
      body.vehicle_info = { type: editTeamData.vehicle_type, plate_number: editTeamData.plate_number || '', model: editTeamData.vehicle_model || '' }
    }
    body.equipment = editTeamData.equipment || []
    const response = await fetch(`/api/admin/teams/${editTeamData.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) return toast.error(payload.message ?? 'Unable to update team.')
    toast.success('Team updated'); setEditOpen(false); void loadTeams()
  }

  async function openAddMember(teamId: string) {
    setAddMemberTeamId(teamId); setSelectedStaffId(''); setSelectedPosition('responder')
    // Load org staff who aren't already on this team
    const response = await fetch('/api/admin/users?role=staff', { cache: 'no-store' })
    const payload = await response.json().catch(() => ({}))
    setStaffList(payload.users ?? [])
    setAddMemberOpen(true)
  }

  async function handleAddMember() {
    if (!selectedStaffId || !selectedPosition) return toast.error('Select a staff member and position.')
    const response = await fetch(`/api/admin/teams/${addMemberTeamId}/members`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: selectedStaffId, position: selectedPosition }) })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) return toast.error(payload.message ?? 'Unable to add member.')
    toast.success('Member added'); setAddMemberOpen(false); void loadTeams()
  }

  async function removeMember(teamId: string, memberId: string, memberName: string) {
    if (!confirm(`Remove ${memberName} from this team?`)) return
    const response = await fetch(`/api/admin/teams/${teamId}/members`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ memberId }) })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) { toast.error(payload?.message ?? 'Unable to remove team member.'); return }
    toast.success(`${memberName} removed from the team`); void loadTeams()
  }

  async function openDispatch(team: any) {
    setDispatchTeam(team); setSelectedIncidentId(''); setDispatching(false)
    // Load active/pending incidents
    const response = await fetch('/api/admin/incidents?status=submitted,received,verification_pending,verified', { cache: 'no-store' })
    const payload = await response.json().catch(() => ({}))
    setActiveIncidents(payload.incidents ?? [])
    setDispatchOpen(true)
  }

  async function handleDispatch() {
    if (!selectedIncidentId || !dispatchTeam) return toast.error('Select an incident to dispatch to.')
    setDispatching(true)
    try {
      const response = await fetch(`/api/admin/incidents/${selectedIncidentId}/assignments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rescueUnitId: dispatchTeam.id }) })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) return toast.error(payload.message ?? 'Unable to dispatch team.')
      toast.success(`${dispatchTeam.name} dispatched!`); setDispatchOpen(false); void loadTeams()
    } finally { setDispatching(false) }
  }

  async function handleReleaseTeam(team: any) {
    try {
      const response = await fetch(`/api/admin/teams/${team.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'available' }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) return toast.error(payload.message ?? 'Unable to release team.')
      toast.success(`${team.name} released back to available.`)
      void loadTeams()
    } catch {
      toast.error('Failed to release team.')
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-screen-xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Rescue Teams</h1>
          <p className="text-slate-400 text-sm">{teams.length} units registered</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800" render={<Link href="/admin/teams/shifts" />}>
            <Calendar className="w-4 h-4 mr-1" /> Shift Schedule
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Add Team
          </Button>
        </div>
      </div>

      {/* Status summary */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
          const count = teams.filter((u) => u.status === status).length
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
        {teams.map((unit) => {
          const statusCfg = STATUS_CONFIG[unit.status as TeamStatus] || STATUS_CONFIG.unavailable
          const isExpanded = expanded === unit.id
          const activeMembers = unit.members?.filter((m: any) => m.is_active) || []

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
                    <p className="text-sm text-slate-400">{unit.team_leader_name || 'No leader assigned'}</p>
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
                    <p className="text-white font-medium">{activeMembers.length}</p>
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
                    {/* Members with management */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-slate-500">Team Members</p>
                        <Button size="sm" variant="ghost" className="h-6 text-xs text-blue-400 hover:text-blue-300 px-2" onClick={() => void openAddMember(unit.id)}>
                          <UserPlus className="w-3 h-3 mr-1" /> Add
                        </Button>
                      </div>
                      {activeMembers.length === 0 && <p className="text-xs text-slate-600 py-2">No members assigned yet.</p>}
                      <div className="space-y-1.5">
                        {activeMembers.map((m: any) => (
                          <div key={m.id} className="flex items-center justify-between group">
                            <div className="flex items-center gap-2">
                              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', m.role === 'team_leader' ? 'bg-amber-400' : 'bg-green-400')} />
                              <span className="text-xs text-slate-300">{m.user_name}</span>
                              <Badge className="text-[10px] py-0 px-1 border" variant="outline" style={{ color: m.role === 'team_leader' ? '#fbbf24' : '#94a3b8', borderColor: m.role === 'team_leader' ? 'rgba(245,158,11,0.3)' : 'rgba(100,116,139,0.3)' }}>
                                {POSITION_LABELS[m.role] || m.role}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {unit.vehicle_info && (
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Vehicle</p>
                        <p className="text-xs text-slate-300">
                          {unit.vehicle_info.model} · {unit.vehicle_info.plate_number} · {unit.vehicle_info.color}
                          {unit.vehicle_info.capacity && ` · Cap: ${unit.vehicle_info.capacity}`}
                        </p>
                      </div>
                    )}

                    {unit.equipment?.length > 0 && (
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Equipment</p>
                        <div className="flex flex-wrap gap-1">
                          {unit.equipment.map((eq: string) => (
                            <Badge key={eq} variant="outline" className="text-xs border-slate-700 text-slate-400">{eq}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {unit.specializations?.length > 0 && (
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Specializations</p>
                        <div className="flex flex-wrap gap-1">
                          {unit.specializations.map((sp: string) => (
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
                  <Button size="sm" variant="outline" className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800 text-xs" onClick={() => { setEditTeamData({ id: unit.id, name: unit.name, code: unit.code, contact_number: unit.contact_number ?? '', status: unit.status, vehicle_type: unit.vehicle_info?.type ?? '', plate_number: unit.vehicle_info?.plate_number ?? '', vehicle_model: unit.vehicle_info?.model ?? '', equipment: unit.equipment ?? [] }); setEditOpen(true) }}>
                    <Edit2 className="w-3 h-3 mr-1" /> Edit
                  </Button>
                  {unit.status !== 'available' && unit.status !== 'off_duty' ? (
                    <Button size="sm" variant="outline" className="border-green-700/50 text-green-400 hover:bg-green-900/20 text-xs" onClick={() => void handleReleaseTeam(unit)}>
                      <Check className="w-3 h-3 mr-1" /> Release
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="border-amber-700/50 text-amber-400 hover:bg-amber-900/20 text-xs" disabled={unit.status !== 'available'} onClick={() => void openDispatch(unit)}>
                      <Send className="w-3 h-3 mr-1" /> Dispatch
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Create Team Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Rescue Team</DialogTitle>
            <DialogDescription className="text-slate-400">Register a new rescue unit for your municipality.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-slate-300 text-xs">Team Name *</Label>
                <Input placeholder="e.g. Bravo Rescue Unit" value={newTeam.name} onChange={e => setNewTeam(p => ({ ...p, name: e.target.value }))} className="bg-slate-800 border-slate-600 text-white" />
              </div>
              <div className="space-y-1">
                <Label className="text-slate-300 text-xs">Team Code *</Label>
                <Input placeholder="e.g. BRU-01" value={newTeam.code} onChange={e => setNewTeam(p => ({ ...p, code: e.target.value }))} className="bg-slate-800 border-slate-600 text-white" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-slate-300 text-xs">Contact Number</Label>
              <Input placeholder="e.g. 09171234567" value={newTeam.contact_number} onChange={e => setNewTeam(p => ({ ...p, contact_number: e.target.value }))} className="bg-slate-800 border-slate-600 text-white" />
            </div>
            <div className="border-t border-slate-800 pt-3 mt-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Vehicle Information</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-slate-300 text-xs">Vehicle Type</Label>
                  <Select value={newTeam.vehicle_type} onValueChange={(v) => setNewTeam(p => ({ ...p, vehicle_type: v ?? '' }))}>
                    <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                      <SelectValue placeholder="Select vehicle" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      {Object.entries(VEHICLE_TYPE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k} className="text-white">{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-300 text-xs">Plate Number</Label>
                  <Input placeholder="e.g. ABC 1234" value={newTeam.plate_number} onChange={e => setNewTeam(p => ({ ...p, plate_number: e.target.value }))} className="bg-slate-800 border-slate-600 text-white" />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-slate-300 text-xs">Vehicle Model</Label>
                  <Input placeholder="e.g. Toyota HiAce" value={newTeam.vehicle_model} onChange={e => setNewTeam(p => ({ ...p, vehicle_model: e.target.value }))} className="bg-slate-800 border-slate-600 text-white" />
                </div>
              </div>
            </div>
            <div className="border-t border-slate-800 pt-3 mt-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Equipment</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {newTeam.equipment.map((eq, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs border-slate-600 text-slate-300 gap-1">
                    {eq}
                    <button type="button" className="ml-1 text-slate-500 hover:text-red-400" onClick={() => setNewTeam(p => ({ ...p, equipment: p.equipment.filter((_, i) => i !== idx) }))}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <Select onValueChange={(v) => { const s = String(v || ''); if (s && !newTeam.equipment.includes(s)) setNewTeam(p => ({ ...p, equipment: [...p.equipment, s] })) }}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                  <SelectValue placeholder="Add equipment..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  {['First Aid Kit', 'Stretcher', 'Oxygen Tank', 'Fire Extinguisher', 'Hydraulic Rescue Tool', 'Rope & Harness', 'Megaphone', 'Flashlight', 'Radio', 'AED Defibrillator', 'Spine Board', 'Life Vest', 'Chainsaw', 'Generator', 'Water Pump'].filter(eq => !newTeam.equipment.includes(eq)).map(eq => (
                    <SelectItem key={eq} value={eq} className="text-white">{eq}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" className="text-slate-400" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => void handleCreateTeam()}>Create Team</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Team Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Rescue Team</DialogTitle>
            <DialogDescription className="text-slate-400">Update team details, vehicle, and equipment.</DialogDescription>
          </DialogHeader>
          {editTeamData && (
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-slate-300 text-xs">Team Name *</Label>
                  <Input value={editTeamData.name} onChange={e => setEditTeamData((p: any) => ({ ...p, name: e.target.value }))} className="bg-slate-800 border-slate-600 text-white" />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-300 text-xs">Code *</Label>
                  <Input value={editTeamData.code} onChange={e => setEditTeamData((p: any) => ({ ...p, code: e.target.value }))} className="bg-slate-800 border-slate-600 text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-slate-300 text-xs">Contact Number</Label>
                  <Input value={editTeamData.contact_number} onChange={e => setEditTeamData((p: any) => ({ ...p, contact_number: e.target.value }))} className="bg-slate-800 border-slate-600 text-white" />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-300 text-xs">Status</Label>
                  <Select value={editTeamData.status} onValueChange={v => setEditTeamData((p: any) => ({ ...p, status: v }))}>
                    <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                        <SelectItem key={k} value={k} className="text-white">{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="border-t border-slate-800 pt-3 mt-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Vehicle Information</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-slate-300 text-xs">Vehicle Type</Label>
                    <Select value={editTeamData.vehicle_type || ''} onValueChange={v => setEditTeamData((p: any) => ({ ...p, vehicle_type: v }))}>
                      <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                        <SelectValue placeholder="Select vehicle" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        {Object.entries(VEHICLE_TYPE_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k} className="text-white">{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-300 text-xs">Plate Number</Label>
                    <Input value={editTeamData.plate_number || ''} onChange={e => setEditTeamData((p: any) => ({ ...p, plate_number: e.target.value }))} placeholder="e.g. ABC 1234" className="bg-slate-800 border-slate-600 text-white" />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <Label className="text-slate-300 text-xs">Vehicle Model</Label>
                    <Input value={editTeamData.vehicle_model || ''} onChange={e => setEditTeamData((p: any) => ({ ...p, vehicle_model: e.target.value }))} placeholder="e.g. Toyota HiAce" className="bg-slate-800 border-slate-600 text-white" />
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-800 pt-3 mt-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Equipment</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(editTeamData.equipment || []).map((eq: string, idx: number) => (
                    <Badge key={idx} variant="outline" className="text-xs border-slate-600 text-slate-300 gap-1">
                      {eq}
                      <button type="button" className="ml-1 text-slate-500 hover:text-red-400" onClick={() => setEditTeamData((p: any) => ({ ...p, equipment: p.equipment.filter((_: string, i: number) => i !== idx) }))}>
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <Select onValueChange={v => { if (v && !(editTeamData.equipment || []).includes(v)) setEditTeamData((p: any) => ({ ...p, equipment: [...(p.equipment || []), v] })) }}>
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                    <SelectValue placeholder="Add equipment..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    {['First Aid Kit', 'Stretcher', 'Oxygen Tank', 'Fire Extinguisher', 'Hydraulic Rescue Tool', 'Rope & Harness', 'Megaphone', 'Flashlight', 'Radio', 'AED Defibrillator', 'Spine Board', 'Life Vest', 'Chainsaw', 'Generator', 'Water Pump'].filter(eq => !(editTeamData.equipment || []).includes(eq)).map(eq => (
                      <SelectItem key={eq} value={eq} className="text-white">{eq}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" className="text-slate-400" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => void handleEditTeam()}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription className="text-slate-400">Assign a staff member to this rescue team.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-slate-300 text-xs">Staff Member</Label>
              <Select value={selectedStaffId} onValueChange={(v) => setSelectedStaffId(v ?? '')}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  {staffList.length === 0 && <SelectItem value="none" disabled className="text-slate-500">No staff available</SelectItem>}
                  {staffList.map((s: any) => (
                    <SelectItem key={s.id} value={s.id} className="text-white">{s.full_name} ({s.role})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-slate-300 text-xs">Position</Label>
              <Select value={selectedPosition} onValueChange={(v) => setSelectedPosition(v ?? '')}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  {Object.entries(POSITION_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-white">{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" className="text-slate-400" onClick={() => setAddMemberOpen(false)}>Cancel</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => void handleAddMember()}>
              <UserPlus className="w-4 h-4 mr-1" /> Add Member
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dispatch Dialog */}
      <Dialog open={dispatchOpen} onOpenChange={setDispatchOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-amber-400" />
              Dispatch {dispatchTeam?.name}
            </DialogTitle>
            <DialogDescription className="text-slate-400">Select an active incident to dispatch this team to.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {activeIncidents.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-slate-500">No active incidents waiting for dispatch.</p>
                <p className="text-xs text-slate-600 mt-1">Incidents appear here when residents submit emergency requests.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {activeIncidents.map((incident: any) => (
                  <div
                    key={incident.id}
                    onClick={() => setSelectedIncidentId(incident.id)}
                    className={cn(
                      'p-3 rounded-lg border cursor-pointer transition-colors',
                      selectedIncidentId === incident.id
                        ? 'border-amber-500 bg-amber-900/20'
                        : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-white font-medium">{incident.emergency_type?.name || incident.type || 'Emergency'}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{incident.reporter_name || 'Unknown'} · {incident.barangay || incident.address || '—'}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{incident.description?.slice(0, 80) || 'No description'}</p>
                      </div>
                      <Badge variant="outline" className="text-xs border-amber-600/30 text-amber-400 shrink-0">{incident.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" className="text-slate-400" onClick={() => setDispatchOpen(false)}>Cancel</Button>
            <Button disabled={!selectedIncidentId || dispatching} className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => void handleDispatch()}>
              <Send className="w-4 h-4 mr-1" /> {dispatching ? 'Dispatching…' : 'Dispatch Now'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
