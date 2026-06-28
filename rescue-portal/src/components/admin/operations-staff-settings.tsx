'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Edit2, Loader2, Plus, Search, ShieldCheck, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type Team = { id: string; name: string; code: string; status: string }
type Membership = { id: string; unit_id: string; role: string; is_active: boolean }
type Staff = {
  id: string
  full_name: string
  email: string
  phone: string | null
  role: string
  is_active: boolean
  membership: Membership | null
}

type StaffPayload = { staff?: Staff[]; teams?: Team[]; used?: number; max?: number; message?: string }
type StaffForm = {
  fullName: string
  email: string
  phone: string
  role: string
  password: string
  teamId: string
  position: string
}

const ROLE_LABELS: Record<string, string> = {
  dispatcher: 'Dispatcher',
  team_leader: 'Team Leader',
  responder: 'Responder',
  staff: 'Operations Staff',
}

const POSITION_LABELS: Record<string, string> = {
  team_leader: 'Team Leader',
  driver: 'Driver',
  medic: 'Medic',
  responder: 'Responder',
  fire_specialist: 'Fire Specialist',
  communications: 'Communications',
}

const EMPTY_FORM: StaffForm = {
  fullName: '',
  email: '',
  phone: '',
  role: 'responder',
  password: '',
  teamId: 'none',
  position: 'responder',
}

export function OperationsStaffSettings() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [used, setUsed] = useState(0)
  const [max, setMax] = useState(10)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Staff | null>(null)
  const [form, setForm] = useState<StaffForm>(EMPTY_FORM)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [teamFilter, setTeamFilter] = useState('all')
  const [stateFilter, setStateFilter] = useState('all')

  const loadStaff = useCallback(async () => {
    const response = await fetch('/api/admin/staff', { cache: 'no-store' })
    const payload = await response.json().catch(() => ({})) as StaffPayload
    if (!response.ok) {
      toast.error(payload.message ?? 'Unable to load operations staff.')
      setLoading(false)
      return
    }
    setStaff(payload.staff ?? [])
    setTeams(payload.teams ?? [])
    setUsed(payload.used ?? 0)
    setMax(payload.max ?? 10)
    setLoading(false)
  }, [])

  useEffect(() => {
    let cancelled = false
    void fetch('/api/admin/staff', { cache: 'no-store' })
      .then(async (response) => ({ response, payload: await response.json().catch(() => ({})) as StaffPayload }))
      .then(({ response, payload }) => {
        if (cancelled) return
        if (!response.ok) {
          toast.error(payload.message ?? 'Unable to load operations staff.')
          setLoading(false)
          return
        }
        setStaff(payload.staff ?? [])
        setTeams(payload.teams ?? [])
        setUsed(payload.used ?? 0)
        setMax(payload.max ?? 10)
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const teamNames = useMemo(() => new Map(teams.map((team) => [team.id, team.name])), [teams])
  const filtered = useMemo(() => staff.filter((member) => {
    const query = search.trim().toLowerCase()
    if (query && !`${member.full_name} ${member.email} ${member.phone ?? ''}`.toLowerCase().includes(query)) return false
    if (roleFilter !== 'all' && member.role !== roleFilter) return false
    if (teamFilter === 'unassigned' && member.membership) return false
    if (teamFilter !== 'all' && teamFilter !== 'unassigned' && member.membership?.unit_id !== teamFilter) return false
    if (stateFilter === 'active' && !member.is_active) return false
    if (stateFilter === 'inactive' && member.is_active) return false
    return true
  }), [roleFilter, search, staff, stateFilter, teamFilter])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEdit(member: Staff) {
    setEditing(member)
    setForm({
      fullName: member.full_name,
      email: member.email,
      phone: member.phone ?? '',
      role: member.role,
      password: '',
      teamId: member.membership?.unit_id ?? 'none',
      position: member.membership?.role ?? 'responder',
    })
    setDialogOpen(true)
  }

  async function saveStaff() {
    setSaving(true)
    try {
      const teamId = form.teamId === 'none' ? '' : form.teamId
      const body = {
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        role: form.role,
        password: form.password,
        teamId,
        position: teamId ? form.position : '',
      }
      const response = await fetch(editing ? `/api/admin/staff/${editing.id}` : '/api/admin/staff', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const payload = await response.json().catch(() => ({})) as StaffPayload
      if (!response.ok) return toast.error(payload.message ?? 'Unable to save staff account.')
      toast.success(editing ? 'Staff account updated.' : 'Staff account created and ready to sign in.')
      setDialogOpen(false)
      await loadStaff()
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(member: Staff) {
    const response = await fetch(`/api/admin/staff/${member.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !member.is_active }),
    })
    const payload = await response.json().catch(() => ({})) as StaffPayload
    if (!response.ok) return toast.error(payload.message ?? 'Unable to update staff access.')
    toast.success(member.is_active ? 'Staff access deactivated.' : 'Staff access activated.')
    await loadStaff()
  }

  const teamLabel = (member: Staff) => member.membership ? teamNames.get(member.membership.unit_id) ?? 'Assigned team' : 'Unassigned'

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-white text-base flex items-center gap-2"><Users className="h-4 w-4 text-blue-400" /> Operations Staff</CardTitle>
          <CardDescription className="text-slate-400">Create municipality staff logins and assign responders to rescue teams.</CardDescription>
        </div>
        <Button onClick={openCreate} disabled={used >= max} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="mr-1 h-4 w-4" /> Add Operations Account
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 rounded-lg border border-slate-700 bg-slate-950/40 p-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email or phone" className="bg-slate-800 border-slate-600 pl-9 text-white" />
          </div>
          <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value ?? 'all')}>
            <SelectTrigger className="w-full bg-slate-800 border-slate-600 text-white lg:w-44"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600 text-white">
              <SelectItem value="all">All roles</SelectItem>
              {Object.entries(ROLE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={teamFilter} onValueChange={(value) => setTeamFilter(value ?? 'all')}>
            <SelectTrigger className="w-full bg-slate-800 border-slate-600 text-white lg:w-44"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600 text-white">
              <SelectItem value="all">All teams</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {teams.map((team) => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={stateFilter} onValueChange={(value) => setStateFilter(value ?? 'all')}>
            <SelectTrigger className="w-full bg-slate-800 border-slate-600 text-white lg:w-36"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600 text-white">
              <SelectItem value="all">Any status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>{filtered.length} account{filtered.length === 1 ? '' : 's'} shown</span>
          <span>{used} of {max} staff seats used</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-slate-400"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading staff…</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-700 py-10 text-center text-sm text-slate-400">
            No matching operations staff. Create an account before assigning someone to a rescue team.
          </div>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {filtered.map((member) => (
                <div key={member.id} className="rounded-lg border border-slate-700 bg-slate-950/50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><p className="font-medium text-white truncate">{member.full_name}</p><p className="text-xs text-slate-400 truncate">{member.email}</p></div>
                    <Badge variant="outline" className={member.is_active ? 'border-green-500/40 text-green-400' : 'border-slate-600 text-slate-500'}>{member.is_active ? 'Active' : 'Inactive'}</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs"><div><p className="text-slate-500">Account Role</p><p className="text-slate-200">{ROLE_LABELS[member.role]}</p></div><div><p className="text-slate-500">Rescue Team</p><p className="text-slate-200">{teamLabel(member)}</p></div><div><p className="text-slate-500">Team Position</p><p className="text-slate-200">{member.membership ? POSITION_LABELS[member.membership.role] ?? member.membership.role : '—'}</p></div><div><p className="text-slate-500">Phone</p><p className="text-slate-200">{member.phone || '—'}</p></div></div>
                  <div className="mt-3 flex gap-2"><Button size="sm" variant="outline" className="flex-1 border-slate-600 text-slate-300" onClick={() => openEdit(member)}><Edit2 className="mr-1 h-3 w-3" /> Edit</Button><Button size="sm" variant="outline" className={member.is_active ? 'border-red-800 text-red-400' : 'border-green-800 text-green-400'} onClick={() => void toggleActive(member)}>{member.is_active ? 'Deactivate' : 'Activate'}</Button></div>
                </div>
              ))}
            </div>
            <div className="hidden md:block overflow-x-auto rounded-lg border border-slate-700">
              <table className="w-full text-left text-sm"><thead className="bg-slate-800/80 text-xs text-slate-400"><tr><th className="px-4 py-3">Staff</th><th className="px-4 py-3">Account Role</th><th className="px-4 py-3">Rescue Team</th><th className="px-4 py-3">Team Position</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-800">{filtered.map((member) => <tr key={member.id} className="bg-slate-950/30"><td className="px-4 py-3"><p className="font-medium text-white">{member.full_name}</p><p className="text-xs text-slate-500">{member.email}</p></td><td className="px-4 py-3 text-slate-300">{ROLE_LABELS[member.role]}</td><td className="px-4 py-3 text-slate-300">{teamLabel(member)}</td><td className="px-4 py-3 text-slate-300">{member.membership ? POSITION_LABELS[member.membership.role] ?? member.membership.role : '—'}</td><td className="px-4 py-3"><Badge variant="outline" className={member.is_active ? 'border-green-500/40 text-green-400' : 'border-slate-600 text-slate-500'}>{member.is_active ? 'Active' : 'Inactive'}</Badge></td><td className="px-4 py-3"><div className="flex justify-end gap-2"><Button size="sm" variant="ghost" className="text-blue-400" onClick={() => openEdit(member)}><Edit2 className="h-4 w-4" /></Button><Button size="sm" variant="outline" className={member.is_active ? 'border-red-800 text-red-400' : 'border-green-800 text-green-400'} onClick={() => void toggleActive(member)}>{member.is_active ? 'Deactivate' : 'Activate'}</Button></div></td></tr>)}</tbody></table>
            </div>
          </>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700 text-white sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Edit Operations Account' : 'Add Operations Account'}</DialogTitle><DialogDescription className="text-slate-400">Account Role controls portal access. Team Position controls the person’s rescue duty.</DialogDescription></DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2"><Label>Full Name</Label><Input value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} className="bg-slate-800 border-slate-600 text-white" /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} disabled={Boolean(editing)} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className="bg-slate-800 border-slate-600 text-white disabled:opacity-60" /></div>
            <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} className="bg-slate-800 border-slate-600 text-white" /></div>
            <div className="space-y-1.5"><Label>Account Role</Label><Select value={form.role} onValueChange={(value) => setForm((current) => ({ ...current, role: value ?? 'responder' }))}><SelectTrigger className="w-full bg-slate-800 border-slate-600 text-white"><SelectValue /></SelectTrigger><SelectContent className="bg-slate-800 border-slate-600 text-white">{Object.entries(ROLE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>{editing ? 'New Password (optional)' : 'Temporary Password'}</Label><Input type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} placeholder="Upper, lower, number, symbol" className="bg-slate-800 border-slate-600 text-white" /></div>
            <div className="space-y-1.5"><Label>Rescue Team</Label><Select value={form.teamId} onValueChange={(value) => setForm((current) => ({ ...current, teamId: value ?? 'none' }))}><SelectTrigger className="w-full bg-slate-800 border-slate-600 text-white"><SelectValue /></SelectTrigger><SelectContent className="bg-slate-800 border-slate-600 text-white"><SelectItem value="none">Not assigned</SelectItem>{teams.map((team) => <SelectItem key={team.id} value={team.id}>{team.name} ({team.code})</SelectItem>)}</SelectContent></Select>{teams.length === 0 && <p className="text-xs text-amber-400">Create a rescue team first under Admin → Teams.</p>}</div>
            <div className="space-y-1.5"><Label>Team Position</Label><Select value={form.position} onValueChange={(value) => setForm((current) => ({ ...current, position: value ?? 'responder' }))}><SelectTrigger disabled={form.teamId === 'none'} className="w-full bg-slate-800 border-slate-600 text-white"><SelectValue /></SelectTrigger><SelectContent className="bg-slate-800 border-slate-600 text-white">{Object.entries(POSITION_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-slate-400">Cancel</Button><Button onClick={() => void saveStaff()} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}{editing ? 'Save Changes' : 'Create Account'}</Button></div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
