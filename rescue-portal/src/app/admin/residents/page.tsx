'use client'

import { useState } from 'react'
import { Search, Eye, CheckCircle2, XCircle, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { DEMO_RESIDENTS } from '@/lib/demo-data'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import type { ResidentProfile, RegistrationStatus } from '@/lib/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const PAGE_SIZE = 8

const STATUS_CONFIG: Record<RegistrationStatus, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-slate-800 text-slate-400' },
  submitted: { label: 'Submitted', color: 'bg-blue-900/30 text-blue-400' },
  under_review: { label: 'Under Review', color: 'bg-yellow-900/30 text-yellow-400' },
  more_info_required: { label: 'More Info Required', color: 'bg-orange-900/30 text-orange-400' },
  approved: { label: 'Approved', color: 'bg-green-900/30 text-green-400' },
  rejected: { label: 'Rejected', color: 'bg-red-900/30 text-red-400' },
  suspended: { label: 'Suspended', color: 'bg-slate-800 text-slate-500' },
}

export default function ResidentsPage() {
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [viewResident, setViewResident] = useState<ResidentProfile | null>(null)

  const filtered = DEMO_RESIDENTS.filter((r) => {
    if (tab === 'pending' && !['submitted', 'under_review', 'more_info_required'].includes(r.registration_status)) return false
    if (tab === 'approved' && r.registration_status !== 'approved') return false
    if (tab === 'rejected' && r.registration_status !== 'rejected') return false
    if (search) {
      const q = search.toLowerCase()
      if (!r.full_name.toLowerCase().includes(q) &&
          !r.email.toLowerCase().includes(q) &&
          !r.barangay.toLowerCase().includes(q) &&
          !(r.phone || '').toLowerCase().includes(q)) return false
    }
    return true
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const pendingCount = DEMO_RESIDENTS.filter((r) => ['submitted', 'under_review', 'more_info_required'].includes(r.registration_status)).length

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-screen-xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Residents</h1>
          <p className="text-slate-400 text-sm">{DEMO_RESIDENTS.length} registered residents</p>
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

      <Card className="bg-slate-900 border-slate-700">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  {['Name', 'Phone', 'Barangay', 'Status', 'Submitted', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-500">No residents found</td>
                  </tr>
                ) : paged.map((resident) => {
                  const statusCfg = STATUS_CONFIG[resident.registration_status]
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
                        <span className="text-xs text-slate-300">{resident.barangay}</span>
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
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-400 hover:text-green-300" onClick={() => toast.success('Demo: Resident approved')}>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-300" onClick={() => toast.error('Demo: Resident rejected')}>
                                <XCircle className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-amber-400 hover:text-amber-300" onClick={() => toast.info('Demo: More info requested')}>
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
                <div><p className="text-xs text-slate-500">Barangay</p><p className="text-slate-300">{viewResident.barangay}</p></div>
                <div><p className="text-xs text-slate-500">Municipality</p><p className="text-slate-300">{viewResident.municipality}</p></div>
                <div className="col-span-2"><p className="text-xs text-slate-500">Address</p><p className="text-slate-300">{viewResident.address}</p></div>
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
                <Badge className={cn('mt-1 text-xs border-0', STATUS_CONFIG[viewResident.registration_status].color)}>
                  {STATUS_CONFIG[viewResident.registration_status].label}
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
                  <Button className="flex-1 bg-green-700 hover:bg-green-600 text-white" size="sm" onClick={() => { toast.success('Demo: Approved'); setViewResident(null) }}>
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                  </Button>
                  <Button className="flex-1 bg-red-700 hover:bg-red-600 text-white" size="sm" onClick={() => { toast.error('Demo: Rejected'); setViewResident(null) }}>
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
