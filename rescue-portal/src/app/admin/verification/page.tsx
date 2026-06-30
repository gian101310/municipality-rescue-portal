'use client'

import { useCallback, useEffect, useState } from 'react'
import { ShieldCheck, Search, Eye, CheckCircle2, XCircle, MessageSquare, Clock, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { formatDate, formatRelativeTime, maskIdNumber } from '@/lib/utils'
import { toast } from 'sonner'
import type { ResidentProfile, RegistrationStatus } from '@/lib/types'

const PENDING_STATUSES: RegistrationStatus[] = ['submitted', 'under_review', 'more_info_required']

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.FC<{ className?: string }> }> = {
  submitted: { label: 'Submitted', color: 'text-blue-400', bg: 'bg-blue-500/20', icon: Clock },
  under_review: { label: 'Under Review', color: 'text-yellow-400', bg: 'bg-yellow-500/20', icon: Clock },
  more_info_required: { label: 'More Info Required', color: 'text-orange-400', bg: 'bg-orange-500/20', icon: AlertCircle },
  approved: { label: 'Approved', color: 'text-green-400', bg: 'bg-green-500/20', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'text-red-400', bg: 'bg-red-500/20', icon: XCircle },
}

const ID_TYPE_LABELS: Record<string, string> = {
  national_id: 'PhilSys National ID',
  drivers_license: "Driver's License",
  passport: 'Passport',
  philhealth: 'PhilHealth ID',
  sss: 'SSS ID',
  gsis: 'GSIS ID',
  voters_id: "Voter's ID",
  postal_id: 'Postal ID',
  barangay_id: 'Barangay ID',
  senior_citizen_id: 'Senior Citizen ID',
  pwd_id: 'PWD ID',
  other: 'Other Government ID',
}

export default function VerificationPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('pending')
  const [selected, setSelected] = useState<ResidentProfile | null>(null)
  const [moreInfoNote, setMoreInfoNote] = useState('')
  const [residents, setResidents] = useState<ResidentProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [savingResidentId, setSavingResidentId] = useState<string | null>(null)

  const loadResidents = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/residents', { cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload?.message ?? 'Unable to load residents.')
      }

      setResidents((payload?.residents ?? []) as ResidentProfile[])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load residents.')
      setResidents([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadResidents()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadResidents])

  const pendingCount = residents.filter((r) => PENDING_STATUSES.includes(r.registration_status)).length

  const filtered = residents.filter((r) => {
    const matchesSearch =
      !search ||
      r.full_name.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase()) ||
      r.barangay.toLowerCase().includes(search.toLowerCase())
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'pending' && PENDING_STATUSES.includes(r.registration_status)) ||
      r.registration_status === statusFilter
    return matchesSearch && matchesStatus
  })

  async function updateResidentStatus(resident: ResidentProfile, status: RegistrationStatus, note = '') {
    setSavingResidentId(resident.id)
    try {
      const response = await fetch(`/api/admin/residents/${resident.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, note }),
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload?.message ?? 'Unable to update resident.')
      }

      const updatedResident = payload?.resident as ResidentProfile
      setResidents((prev) => prev.map((item) => item.id === resident.id ? updatedResident : item))
      setSelected((current) => current?.id === resident.id ? updatedResident : current)

      if (status === 'approved') toast.success(`${resident.full_name} has been approved`)
      if (status === 'rejected') toast.error(`${resident.full_name} has been rejected`)
      if (status === 'more_info_required') toast.info(`Additional info requested from ${resident.full_name}`)

      if (status !== 'more_info_required') setSelected(null)
      setMoreInfoNote('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update resident.')
    } finally {
      setSavingResidentId(null)
    }
  }

  function handleApprove(resident: ResidentProfile) {
    updateResidentStatus(resident, 'approved')
  }

  function handleReject(resident: ResidentProfile) {
    updateResidentStatus(resident, 'rejected')
  }

  function handleMoreInfo(resident: ResidentProfile) {
    if (!moreInfoNote.trim()) { toast.error('Please enter the information required'); return }
    updateResidentStatus(resident, 'more_info_required', moreInfoNote)
  }

  const FILTER_TABS = [
    { value: 'pending', label: `Pending (${pendingCount})` },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'all', label: 'All' },
  ]

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-green-400" />
            ID Verification
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Review and verify resident identity submissions</p>
        </div>
        {pendingCount > 0 && (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-sm px-3 py-1">
            {pendingCount} pending review{pendingCount !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Pending', value: residents.filter((r) => PENDING_STATUSES.includes(r.registration_status)).length, color: 'text-yellow-400' },
          { label: 'Approved', value: residents.filter((r) => r.registration_status === 'approved').length, color: 'text-green-400' },
          { label: 'Rejected', value: residents.filter((r) => r.registration_status === 'rejected').length, color: 'text-red-400' },
          { label: 'Total', value: residents.length, color: 'text-blue-400' },
        ].map(({ label, value, color }) => (
          <Card key={label} className="bg-slate-900 border-slate-700">
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="bg-slate-900 border-slate-700">
        <CardContent className="p-4 space-y-3">
          {/* Status filter tabs */}
          <div className="flex flex-wrap gap-2">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === tab.value
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Search by name, email, or barangay..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-slate-800 border-slate-600 text-slate-200 placeholder:text-slate-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-slate-900 border-slate-700">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left text-xs font-semibold text-slate-400 px-4 py-3">Resident</th>
                  <th className="text-left text-xs font-semibold text-slate-400 px-4 py-3">Barangay</th>
                  <th className="text-left text-xs font-semibold text-slate-400 px-4 py-3">ID Type</th>
                  <th className="text-left text-xs font-semibold text-slate-400 px-4 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-slate-400 px-4 py-3">Submitted</th>
                  <th className="text-right text-xs font-semibold text-slate-400 px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-500 text-sm">
                      Loading residents...
                    </td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-500 text-sm">
                      No residents match your filters
                    </td>
                  </tr>
                )}
                {filtered.map((resident) => {
                  const cfg = STATUS_CONFIG[resident.registration_status] ?? STATUS_CONFIG['submitted']
                  const StatusIcon = cfg.icon
                  return (
                    <tr key={resident.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-200">{resident.full_name}</p>
                        <p className="text-xs text-slate-500">{resident.email}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{resident.barangay}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {resident.id_type ? ID_TYPE_LABELS[resident.id_type] ?? resident.id_type : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {formatRelativeTime(resident.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-slate-400 hover:text-blue-400"
                            onClick={() => { setSelected(resident); setMoreInfoNote('') }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {PENDING_STATUSES.includes(resident.registration_status) && (
                            <>
                              <Button
                                size="sm"
                                className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => handleApprove(resident)}
                                disabled={savingResidentId === resident.id}
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                className="h-7 px-2 text-xs bg-red-600 hover:bg-red-700 text-white"
                                onClick={() => handleReject(resident)}
                                disabled={savingResidentId === resident.id}
                              >
                                <XCircle className="w-3 h-3 mr-1" /> Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      {selected && (
        <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
          <DialogContent className="bg-slate-900 border-slate-700 text-slate-200 max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-green-400" />
                Resident Verification
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Profile */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                  {selected.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <p className="font-bold text-white">{selected.full_name}</p>
                  <p className="text-slate-400 text-sm">{selected.email}</p>
                  <p className="text-slate-500 text-xs">{selected.phone}</p>
                </div>
              </div>

              <Separator className="bg-slate-700" />

              {/* Personal Info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Date of Birth</p>
                  <p className="text-slate-200">{formatDate(selected.date_of_birth)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Barangay</p>
                  <p className="text-slate-200">{selected.barangay}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-slate-500">Address</p>
                  <p className="text-slate-200">{selected.address}</p>
                </div>
              </div>

              <Separator className="bg-slate-700" />

              {/* ID Info */}
              <div>
                <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">ID Submitted</p>
                <div className="bg-slate-800 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-400">Type</span>
                    <span className="text-sm text-slate-200">{selected.id_type ? ID_TYPE_LABELS[selected.id_type] ?? selected.id_type : '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-400">ID Number</span>
                    <span className="text-sm font-mono text-slate-200">{selected.id_number ? maskIdNumber(selected.id_number) : '—'}</span>
                  </div>
                </div>
                <div className="mt-2 p-3 border border-slate-700 rounded-lg text-center bg-slate-800/40">
                  <p className="text-xs text-slate-500">No ID document was uploaded. Verify the submitted details using the municipality&apos;s approved identity-check process.</p>
                </div>
              </div>

              {/* More info request field */}
              {PENDING_STATUSES.includes(selected.registration_status) && (
                <div>
                  <Label className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2 block">Request Additional Info</Label>
                  <Textarea
                    placeholder="Describe what additional information is needed from the resident..."
                    value={moreInfoNote}
                    onChange={(e) => setMoreInfoNote(e.target.value)}
                    className="bg-slate-800 border-slate-600 text-slate-200 placeholder:text-slate-500 min-h-[80px]"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 border-orange-500/40 text-orange-400 hover:bg-orange-500/10"
                    onClick={() => handleMoreInfo(selected)}
                    disabled={!moreInfoNote.trim() || savingResidentId === selected.id}
                  >
                    <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                    Send Request
                  </Button>
                </div>
              )}

              {selected.more_info_request && (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                  <p className="text-xs font-semibold text-orange-400 mb-1">Info Requested:</p>
                  <p className="text-xs text-orange-300">{selected.more_info_request}</p>
                </div>
              )}
            </div>

            {PENDING_STATUSES.includes(selected.registration_status) && (
              <DialogFooter className="gap-2 mt-2">
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => handleReject(selected)}
                  disabled={savingResidentId === selected.id}
                >
                  <XCircle className="w-4 h-4 mr-1.5" /> Reject
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => handleApprove(selected)}
                  disabled={savingResidentId === selected.id}
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" /> Approve
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
