'use client'

import { useEffect, useState, useCallback } from 'react'
import { Search, Eye, CheckCircle2, XCircle, MessageSquare, ChevronLeft, ChevronRight, Upload, UserPlus, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import type { ResidentProfile, RegistrationStatus } from '@/lib/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const PAGE_SIZE = 10

type ResidentFormState = {
  full_name: string
  phone: string
  email: string
  password: string
  barangay: string
  address: string
  registration_status: RegistrationStatus
}

const STATUS_CONFIG: Record<RegistrationStatus, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-slate-800 text-slate-400' },
  submitted: { label: 'Submitted', color: 'bg-blue-900/30 text-blue-400' },
  under_review: { label: 'Under Review', color: 'bg-yellow-900/30 text-yellow-400' },
  more_info_required: { label: 'More Info Required', color: 'bg-orange-900/30 text-orange-400' },
  approved: { label: 'Approved', color: 'bg-green-900/30 text-green-400' },
  rejected: { label: 'Rejected', color: 'bg-red-900/30 text-red-400' },
  suspended: { label: 'Suspended', color: 'bg-slate-800 text-slate-500' },
}

const LOCAL_BARANGAYS = [
  'Poblacion', 'San Isidro', 'Santo Nino', 'San Jose', 'Bagong Pag-asa',
  'Mabuhay', 'Pag-asa', 'Maligaya', 'Bagong Silang', 'Lumang Bayan',
]

const emptyResidentForm: ResidentFormState = {
  full_name: '',
  phone: '',
  email: '',
  password: '',
  barangay: '',
  address: '',
  registration_status: 'approved',
}

export default function ResidentsPage() {
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [viewResident, setViewResident] = useState<ResidentProfile | null>(null)
  const [residentRows, setResidentRows] = useState<ResidentProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [manualForm, setManualForm] = useState<ResidentFormState>(emptyResidentForm)
  const [bulkText, setBulkText] = useState('Full Name, Phone, Email, Barangay, Address\nAna Lopez Cruz, 0917-555-0001, ana.cruz@email.com, Poblacion, 22 Rizal St.')

  const fetchResidents = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/residents')
      if (!res.ok) throw new Error('Failed to load residents')
      const data = await res.json()
      setResidentRows(data.residents ?? [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load residents')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchResidents()
  }, [fetchResidents])

  async function createManualResident() {
    if (!manualForm.full_name.trim() || !manualForm.phone.trim()) {
      toast.error('Name and phone are required.')
      return
    }
    if (!manualForm.email.trim()) {
      toast.error('Email is required — the resident uses it to log in.')
      return
    }
    if (!manualForm.password.trim() || manualForm.password.trim().length < 6) {
      toast.error('Set a password (at least 6 characters) for the resident.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/residents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          residents: [{
            full_name: manualForm.full_name.trim(),
            phone: manualForm.phone.trim(),
            email: manualForm.email.trim(),
            password: manualForm.password.trim(),
            barangay: manualForm.barangay || undefined,
            address: manualForm.address.trim() || undefined,
            registration_status: manualForm.registration_status,
          }],
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? 'Failed to create resident')

      if (data.errors?.length) {
        toast.error(`Failed: ${data.errors[0].error}`)
      } else {
        toast.success(`Resident "${manualForm.full_name}" created successfully`)
        setManualForm(emptyResidentForm)
        void fetchResidents()
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create resident')
    } finally {
      setSubmitting(false)
    }
  }

  async function importBulkResidents() {
    const rows = bulkText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.toLowerCase().startsWith('full name'))

    if (rows.length === 0) {
      toast.error('No valid rows to import.')
      return
    }

    const residents = rows.map((row) => {
      const [full_name, phone, email, barangay, address] = row.split(',').map((s) => s.trim())
      return { full_name, phone, email, barangay, address, registration_status: 'submitted' as RegistrationStatus }
    }).filter((r) => r.full_name && r.phone)

    if (residents.length === 0) {
      toast.error('No valid rows found. Each row needs at least name and phone.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/residents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ residents }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? 'Failed to import residents')

      toast.success(`${data.created} resident${data.created === 1 ? '' : 's'} imported${data.failed ? `, ${data.failed} failed` : ''}`)
      void fetchResidents()
      setPage(1)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to import residents')
    } finally {
      setSubmitting(false)
    }
  }

  async function updateResidentStatus(residentId: string, status: RegistrationStatus, note?: string) {
    try {
      const res = await fetch(`/api/admin/residents/${residentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, note: note || '' }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? 'Failed to update status')

      toast.success(
        status === 'approved' ? 'Resident approved — they can now log in' :
        status === 'rejected' ? 'Resident rejected' :
        'Status updated'
      )

      // Update local state immediately
      setResidentRows((rows) => rows.map((r) =>
        r.id === residentId
          ? { ...r, registration_status: status, verified_at: status === 'approved' ? new Date().toISOString() : r.verified_at }
          : r
      ))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status')
    }
  }

  const filtered = residentRows.filter((r) => {
    if (tab === 'pending' && !['submitted', 'under_review', 'more_info_required'].includes(r.registration_status)) return false
    if (tab === 'approved' && r.registration_status !== 'approved') return false
    if (tab === 'rejected' && r.registration_status !== 'rejected') return false
    if (search) {
      const q = search.toLowerCase()
      if (
        !r.full_name.toLowerCase().includes(q) &&
        !r.email.toLowerCase().includes(q) &&
        !(r.barangay ?? '').toLowerCase().includes(q) &&
        !(r.phone ?? '').toLowerCase().includes(q)
      ) return false
    }
    return true
  })

  const pendingCount = residentRows.filter((r) =>
    ['submitted', 'under_review', 'more_info_required'].includes(r.registration_status)
  ).length

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-screen-xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Residents</h1>
          <p className="text-slate-400 text-sm">
            {loading ? 'Loading...' : `${residentRows.length} registered resident${residentRows.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => void fetchResidents()} className="h-8 text-slate-400 hover:text-white">
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </Button>
          <a
            href="#bulk-upload-panel"
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-600 px-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <Upload className="w-4 h-4 mr-1.5" /> Bulk Upload
          </a>
          <a
            href="#manual-resident-panel"
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <UserPlus className="w-4 h-4 mr-1.5" /> New Resident
          </a>
        </div>
      </div>

      <Card className="bg-slate-900 border-slate-700">
        <CardContent className="p-4 space-y-3">
          <Tabs value={tab} onValueChange={(v) => { setTab(v); setPage(1) }}>
            <TabsList className="bg-slate-800 border border-slate-700">
              <TabsTrigger value="all" className="data-[active]:bg-slate-700 data-[active]:text-white text-slate-400">All</TabsTrigger>
              <TabsTrigger value="pending" className="data-[active]:bg-slate-700 data-[active]:text-white text-slate-400">
                Pending {pendingCount > 0 && <Badge className="ml-1.5 bg-red-600 text-white text-xs border-0 h-4 px-1">{pendingCount}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="approved" className="data-[active]:bg-slate-700 data-[active]:text-white text-slate-400">Approved</TabsTrigger>
              <TabsTrigger value="rejected" className="data-[active]:bg-slate-700 data-[active]:text-white text-slate-400">Rejected</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Search by name, email, barangay, or phone..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="pl-9 bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card id="manual-resident-panel" className="bg-slate-900 border-slate-700 scroll-mt-4">
          <CardContent className="p-4 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-white">Manual Resident Registration</h2>
              <p className="text-xs text-slate-400">Register a resident directly — creates a real account in the system.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-slate-300">Full Name *</Label>
                <Input value={manualForm.full_name} onChange={(e) => setManualForm((prev) => ({ ...prev, full_name: e.target.value }))} className="bg-slate-800 border-slate-600 text-white" placeholder="Juan Dela Cruz" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300">Phone *</Label>
                <Input value={manualForm.phone} onChange={(e) => setManualForm((prev) => ({ ...prev, phone: e.target.value }))} className="bg-slate-800 border-slate-600 text-white" placeholder="0917-123-4567" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300">Email * <span className="text-slate-500 font-normal">(login username)</span></Label>
                <Input type="email" value={manualForm.email} onChange={(e) => setManualForm((prev) => ({ ...prev, email: e.target.value }))} className="bg-slate-800 border-slate-600 text-white" placeholder="resident@email.com" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300">Password * <span className="text-slate-500 font-normal">(give to resident)</span></Label>
                <Input type="text" value={manualForm.password} onChange={(e) => setManualForm((prev) => ({ ...prev, password: e.target.value }))} className="bg-slate-800 border-slate-600 text-white" placeholder="Set login password" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300">Barangay</Label>
                <Select value={manualForm.barangay} onValueChange={(value) => value && setManualForm((prev) => ({ ...prev, barangay: value }))}>
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                    <SelectValue placeholder="Select barangay" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    {LOCAL_BARANGAYS.map((barangay) => (
                      <SelectItem key={barangay} value={barangay} className="text-white hover:bg-slate-700">{barangay}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300">Status</Label>
                <Select value={manualForm.registration_status} onValueChange={(value) => value && setManualForm((prev) => ({ ...prev, registration_status: value as RegistrationStatus }))}>
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="approved" className="text-white hover:bg-slate-700">Approved (can login immediately)</SelectItem>
                    <SelectItem value="submitted" className="text-white hover:bg-slate-700">Submitted (needs approval)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-slate-300">Address</Label>
                <Input value={manualForm.address} onChange={(e) => setManualForm((prev) => ({ ...prev, address: e.target.value }))} placeholder="Street or purok" className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500" />
              </div>
            </div>
            <button
              type="button"
              onClick={createManualResident}
              disabled={submitting}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-blue-600 px-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <UserPlus className="w-4 h-4 mr-1.5" />}
              {submitting ? 'Creating...' : 'Create Resident'}
            </button>
          </CardContent>
        </Card>

        <Card id="bulk-upload-panel" className="bg-slate-900 border-slate-700 scroll-mt-4">
          <CardContent className="p-4 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-white">Bulk Registration</h2>
              <p className="text-xs text-slate-400">Paste CSV rows to register multiple residents at once. Each gets a real account.</p>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">CSV Rows</Label>
              <Textarea
                value={bulkText}
                onChange={(event) => setBulkText(event.target.value)}
                className="min-h-40 bg-slate-800 border-slate-600 text-white font-mono text-xs"
              />
              <p className="text-xs text-slate-500">Format: Full Name, Phone, Email, Barangay, Address</p>
            </div>
            <button
              type="button"
              onClick={importBulkResidents}
              disabled={submitting}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-blue-600 px-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Upload className="w-4 h-4 mr-1.5" />}
              {submitting ? 'Importing...' : 'Import Residents'}
            </button>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900 border-slate-700">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
              <span className="ml-2 text-slate-500">Loading residents...</span>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800">
                      {['Name', 'Phone', 'Barangay', 'Status', 'Registered', 'Actions'].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paged.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-slate-500">
                          {residentRows.length === 0 ? 'No residents yet — register the first one above' : 'No residents match your filter'}
                        </td>
                      </tr>
                    ) : paged.map((resident) => {
                      const statusCfg = STATUS_CONFIG[resident.registration_status] ?? STATUS_CONFIG.draft
                      return (
                        <tr key={resident.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-white">{resident.full_name}</p>
                              <p className="text-xs text-slate-500">{resident.email}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-slate-400">{resident.phone || '—'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-slate-300">{resident.barangay || '—'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={cn('text-xs border-0', statusCfg.color)}>{statusCfg.label}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-slate-500">{formatRelativeTime(resident.created_at)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-white" onClick={() => setViewResident(resident)}>
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                              {['submitted', 'under_review', 'more_info_required'].includes(resident.registration_status) && (
                                <>
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-400 hover:text-green-300" onClick={() => updateResidentStatus(resident.id, 'approved')}>
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-300" onClick={() => updateResidentStatus(resident.id, 'rejected')}>
                                    <XCircle className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-amber-400 hover:text-amber-300" onClick={() => updateResidentStatus(resident.id, 'more_info_required', 'Please submit additional documents.')}>
                                    <MessageSquare className="w-3.5 h-3.5" />
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

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
                  <span className="text-xs text-slate-500">
                    Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="h-7 w-7 p-0 text-slate-400 hover:text-white">
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-xs text-slate-400 px-2">{page} / {totalPages}</span>
                    <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="h-7 w-7 p-0 text-slate-400 hover:text-white">
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* View Resident Dialog */}
      <Dialog open={!!viewResident} onOpenChange={() => setViewResident(null)}>
        {viewResident && (
          <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle>{viewResident.full_name}</DialogTitle>
              <DialogDescription className="text-slate-400">{viewResident.email}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-slate-500">Phone</p><p className="text-slate-300">{viewResident.phone || '—'}</p></div>
                <div><p className="text-xs text-slate-500">Date of Birth</p><p className="text-slate-300">{formatDate(viewResident.date_of_birth)}</p></div>
                <div><p className="text-xs text-slate-500">Barangay</p><p className="text-slate-300">{viewResident.barangay || '—'}</p></div>
                <div><p className="text-xs text-slate-500">Municipality</p><p className="text-slate-300">{viewResident.municipality || '—'}</p></div>
                <div className="col-span-2"><p className="text-xs text-slate-500">Address</p><p className="text-slate-300">{viewResident.address || '—'}</p></div>
              </div>
              <Separator className="bg-slate-800" />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-slate-500">ID Type</p><p className="text-slate-300">{viewResident.id_type || '—'}</p></div>
                <div><p className="text-xs text-slate-500">ID Number</p><p className="text-slate-300">{viewResident.id_number || '—'}</p></div>
              </div>
              <Separator className="bg-slate-800" />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-slate-500">Emergency Contact</p><p className="text-slate-300">{viewResident.emergency_contact_name || '—'}</p></div>
                <div><p className="text-xs text-slate-500">EC Phone</p><p className="text-slate-300">{viewResident.emergency_contact_phone || '—'}</p></div>
              </div>
              <Separator className="bg-slate-800" />
              <div>
                <p className="text-xs text-slate-500">Registration Status</p>
                <Badge className={cn('mt-1 text-xs border-0', (STATUS_CONFIG[viewResident.registration_status] ?? STATUS_CONFIG.draft).color)}>
                  {(STATUS_CONFIG[viewResident.registration_status] ?? STATUS_CONFIG.draft).label}
                </Badge>
                {viewResident.rejection_reason && (
                  <p className="mt-1 text-xs text-red-400">{viewResident.rejection_reason}</p>
                )}
                {viewResident.more_info_request && (
                  <p className="mt-1 text-xs text-amber-400">{viewResident.more_info_request}</p>
                )}
              </div>
              {['submitted', 'under_review', 'more_info_required'].includes(viewResident.registration_status) && (
                <div className="flex gap-2">
                  <Button className="flex-1 bg-green-700 hover:bg-green-600 text-white" size="sm" onClick={() => { updateResidentStatus(viewResident.id, 'approved'); setViewResident(null) }}>
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                  </Button>
                  <Button className="flex-1 bg-red-700 hover:bg-red-600 text-white" size="sm" onClick={() => { updateResidentStatus(viewResident.id, 'rejected'); setViewResident(null) }}>
                    <XCircle className="w-4 h-4 mr-1" /> Reject
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
