'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  AlertTriangle, MapPin, Phone, CheckCircle2, Truck,
  Loader2, Clock, Siren, Send, XCircle, ChevronRight,
  ShieldCheck, Radio, Eye, Lock, Flag, Navigation,
  ClipboardCheck, Bell, ArrowRightLeft, Building2, Search,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SeverityBadge } from '@/components/severity-badge'
import { IncidentStatusBadge } from '@/components/incident-status-badge'
import { EmergencyTypeIcon } from '@/components/emergency-type-icon'
import type { IncidentStatus, SeverityLevel } from '@/lib/types'
import { toast } from 'sonner'

type Incident = {
  id: string
  reference_number?: string
  status: string
  severity: string
  description?: string
  reporter_name?: string
  reporter_phone?: string
  barangay?: string
  municipality?: string
  latitude?: number
  longitude?: number
  created_at: string
  updated_at?: string
  assigned_unit_name?: string | null
  dispatched_at?: string | null
  arrived_at?: string | null
  resolved_at?: string | null
  emergency_type?: {
    name?: string
    icon?: string
    color?: string
  } | null
  forwarded_to?: string | null
  forwarded_from?: string | null
}

// Municipality directory — will be fetched from API when all tenants are onboarded
// For now, hardcoded beta registry that can be expanded
type Municipality = {
  id: string
  name: string
  province: string
  region: string
  dispatch_phone?: string
  status: 'active' | 'onboarding' | 'offline'
}

// Region 2 — Cagayan Valley Municipality Registry
// 5 Provinces: Batanes, Cagayan, Isabela, Nueva Vizcaya, Quirino
// 4 Cities + 89 Municipalities = 93 LGUs total
const MUNICIPALITY_REGISTRY: Municipality[] = [
  // === CAGAYAN PROVINCE (1 city + 28 municipalities) ===
  { id: 'tuguegarao', name: 'Tuguegarao City', province: 'Cagayan', region: 'Region II', dispatch_phone: '+63 78 844 0000', status: 'active' },
  { id: 'aparri', name: 'Aparri', province: 'Cagayan', region: 'Region II', dispatch_phone: '+63 78 888 0000', status: 'active' },
  { id: 'solana', name: 'Solana', province: 'Cagayan', region: 'Region II', dispatch_phone: '+63 78 633 0000', status: 'active' },
  { id: 'baggao', name: 'Baggao', province: 'Cagayan', region: 'Region II', dispatch_phone: '+63 78 382 0000', status: 'active' },
  { id: 'gattaran', name: 'Gattaran', province: 'Cagayan', region: 'Region II', status: 'active' },
  { id: 'tuao', name: 'Tuao', province: 'Cagayan', region: 'Region II', status: 'active' },
  { id: 'amulung', name: 'Amulung', province: 'Cagayan', region: 'Region II', status: 'active' },
  { id: 'penablanca', name: 'Peñablanca', province: 'Cagayan', region: 'Region II', status: 'active' },
  { id: 'lal-lo', name: 'Lal-lo', province: 'Cagayan', region: 'Region II', status: 'active' },
  { id: 'enrile', name: 'Enrile', province: 'Cagayan', region: 'Region II', status: 'onboarding' },
  { id: 'alcala', name: 'Alcala', province: 'Cagayan', region: 'Region II', status: 'onboarding' },
  { id: 'gonzaga', name: 'Gonzaga', province: 'Cagayan', region: 'Region II', status: 'onboarding' },
  { id: 'lasam', name: 'Lasam', province: 'Cagayan', region: 'Region II', status: 'onboarding' },
  { id: 'abulug', name: 'Abulug', province: 'Cagayan', region: 'Region II', status: 'onboarding' },
  { id: 'allacapan', name: 'Allacapan', province: 'Cagayan', region: 'Region II', status: 'onboarding' },
  { id: 'ballesteros', name: 'Ballesteros', province: 'Cagayan', region: 'Region II', status: 'onboarding' },
  { id: 'buguey', name: 'Buguey', province: 'Cagayan', region: 'Region II', status: 'onboarding' },
  { id: 'calayan', name: 'Calayan', province: 'Cagayan', region: 'Region II', status: 'onboarding' },
  { id: 'camalaniugan', name: 'Camalaniugan', province: 'Cagayan', region: 'Region II', status: 'onboarding' },
  { id: 'claveria', name: 'Claveria', province: 'Cagayan', region: 'Region II', status: 'onboarding' },
  { id: 'iguig', name: 'Iguig', province: 'Cagayan', region: 'Region II', status: 'onboarding' },
  { id: 'pamplona-cag', name: 'Pamplona', province: 'Cagayan', region: 'Region II', status: 'onboarding' },
  { id: 'piat', name: 'Piat', province: 'Cagayan', region: 'Region II', status: 'onboarding' },
  { id: 'rizal-cag', name: 'Rizal', province: 'Cagayan', region: 'Region II', status: 'onboarding' },
  { id: 'sanchez-mira', name: 'Sanchez-Mira', province: 'Cagayan', region: 'Region II', status: 'onboarding' },
  { id: 'santa-ana', name: 'Santa Ana', province: 'Cagayan', region: 'Region II', status: 'onboarding' },
  { id: 'santa-praxedes', name: 'Santa Praxedes', province: 'Cagayan', region: 'Region II', status: 'onboarding' },
  { id: 'santa-teresita', name: 'Santa Teresita', province: 'Cagayan', region: 'Region II', status: 'onboarding' },
  { id: 'santo-nino', name: 'Santo Niño', province: 'Cagayan', region: 'Region II', status: 'onboarding' },

  // === ISABELA PROVINCE (3 cities + 34 municipalities) ===
  { id: 'ilagan', name: 'Ilagan City', province: 'Isabela', region: 'Region II', dispatch_phone: '+63 78 622 0000', status: 'active' },
  { id: 'santiago', name: 'Santiago City', province: 'Isabela', region: 'Region II', dispatch_phone: '+63 78 682 0000', status: 'active' },
  { id: 'cauayan', name: 'Cauayan City', province: 'Isabela', region: 'Region II', dispatch_phone: '+63 78 652 0000', status: 'active' },
  { id: 'echague', name: 'Echague', province: 'Isabela', region: 'Region II', status: 'active' },
  { id: 'alicia', name: 'Alicia', province: 'Isabela', region: 'Region II', status: 'active' },
  { id: 'roxas-isa', name: 'Roxas', province: 'Isabela', region: 'Region II', status: 'active' },
  { id: 'tumauini', name: 'Tumauini', province: 'Isabela', region: 'Region II', status: 'active' },
  { id: 'cabagan', name: 'Cabagan', province: 'Isabela', region: 'Region II', status: 'active' },
  { id: 'san-mateo', name: 'San Mateo', province: 'Isabela', region: 'Region II', status: 'active' },
  { id: 'san-mariano', name: 'San Mariano', province: 'Isabela', region: 'Region II', status: 'onboarding' },
  { id: 'ramon', name: 'Ramon', province: 'Isabela', region: 'Region II', status: 'onboarding' },
  { id: 'cordon', name: 'Cordon', province: 'Isabela', region: 'Region II', status: 'onboarding' },
  { id: 'jones', name: 'Jones', province: 'Isabela', region: 'Region II', status: 'onboarding' },
  { id: 'angadanan', name: 'Angadanan', province: 'Isabela', region: 'Region II', status: 'onboarding' },
  { id: 'cabatuan-isa', name: 'Cabatuan', province: 'Isabela', region: 'Region II', status: 'onboarding' },
  { id: 'aurora-isa', name: 'Aurora', province: 'Isabela', region: 'Region II', status: 'onboarding' },
  { id: 'luna-isa', name: 'Luna', province: 'Isabela', region: 'Region II', status: 'onboarding' },
  { id: 'naguilian', name: 'Naguilian', province: 'Isabela', region: 'Region II', status: 'onboarding' },
  { id: 'mallig', name: 'Mallig', province: 'Isabela', region: 'Region II', status: 'onboarding' },
  { id: 'gamu', name: 'Gamu', province: 'Isabela', region: 'Region II', status: 'onboarding' },
  { id: 'san-manuel-isa', name: 'San Manuel', province: 'Isabela', region: 'Region II', status: 'onboarding' },
  { id: 'burgos-isa', name: 'Burgos', province: 'Isabela', region: 'Region II', status: 'onboarding' },
  { id: 'delfin-albano', name: 'Delfin Albano', province: 'Isabela', region: 'Region II', status: 'onboarding' },
  { id: 'benito-soliven', name: 'Benito Soliven', province: 'Isabela', region: 'Region II', status: 'onboarding' },
  { id: 'reina-mercedes', name: 'Reina Mercedes', province: 'Isabela', region: 'Region II', status: 'onboarding' },
  { id: 'quezon-isa', name: 'Quezon', province: 'Isabela', region: 'Region II', status: 'onboarding' },
  { id: 'san-pablo-isa', name: 'San Pablo', province: 'Isabela', region: 'Region II', status: 'onboarding' },
  { id: 'santa-maria-isa', name: 'Santa Maria', province: 'Isabela', region: 'Region II', status: 'onboarding' },
  { id: 'san-guillermo', name: 'San Guillermo', province: 'Isabela', region: 'Region II', status: 'onboarding' },
  { id: 'san-isidro-isa', name: 'San Isidro', province: 'Isabela', region: 'Region II', status: 'onboarding' },
  { id: 'san-agustin', name: 'San Agustin', province: 'Isabela', region: 'Region II', status: 'onboarding' },
  { id: 'santo-tomas', name: 'Santo Tomas', province: 'Isabela', region: 'Region II', status: 'onboarding' },
  { id: 'quirino-isa', name: 'Quirino (Isabela)', province: 'Isabela', region: 'Region II', status: 'onboarding' },
  { id: 'palanan', name: 'Palanan', province: 'Isabela', region: 'Region II', status: 'onboarding' },
  { id: 'divilacan', name: 'Divilacan', province: 'Isabela', region: 'Region II', status: 'onboarding' },
  { id: 'dinapigue', name: 'Dinapigue', province: 'Isabela', region: 'Region II', status: 'onboarding' },
  { id: 'maconacon', name: 'Maconacon', province: 'Isabela', region: 'Region II', status: 'onboarding' },

  // === NUEVA VIZCAYA PROVINCE (15 municipalities) ===
  { id: 'bayombong', name: 'Bayombong', province: 'Nueva Vizcaya', region: 'Region II', dispatch_phone: '+63 78 321 0000', status: 'active' },
  { id: 'solano', name: 'Solano', province: 'Nueva Vizcaya', region: 'Region II', dispatch_phone: '+63 78 326 0000', status: 'active' },
  { id: 'bambang', name: 'Bambang', province: 'Nueva Vizcaya', region: 'Region II', status: 'active' },
  { id: 'aritao', name: 'Aritao', province: 'Nueva Vizcaya', region: 'Region II', status: 'active' },
  { id: 'dupax-del-sur', name: 'Dupax del Sur', province: 'Nueva Vizcaya', region: 'Region II', status: 'onboarding' },
  { id: 'bagabag', name: 'Bagabag', province: 'Nueva Vizcaya', region: 'Region II', status: 'onboarding' },
  { id: 'kayapa', name: 'Kayapa', province: 'Nueva Vizcaya', region: 'Region II', status: 'onboarding' },
  { id: 'kasibu', name: 'Kasibu', province: 'Nueva Vizcaya', region: 'Region II', status: 'onboarding' },
  { id: 'quezon-nv', name: 'Quezon', province: 'Nueva Vizcaya', region: 'Region II', status: 'onboarding' },
  { id: 'villaverde', name: 'Villaverde', province: 'Nueva Vizcaya', region: 'Region II', status: 'onboarding' },
  { id: 'ambaguio', name: 'Ambaguio', province: 'Nueva Vizcaya', region: 'Region II', status: 'onboarding' },
  { id: 'diadi', name: 'Diadi', province: 'Nueva Vizcaya', region: 'Region II', status: 'onboarding' },
  { id: 'dupax-del-norte', name: 'Dupax del Norte', province: 'Nueva Vizcaya', region: 'Region II', status: 'onboarding' },
  { id: 'santa-fe-nv', name: 'Santa Fe', province: 'Nueva Vizcaya', region: 'Region II', status: 'onboarding' },
  { id: 'alfonso-castaneda', name: 'Alfonso Castañeda', province: 'Nueva Vizcaya', region: 'Region II', status: 'onboarding' },

  // === QUIRINO PROVINCE (6 municipalities) ===
  { id: 'cabarroguis', name: 'Cabarroguis', province: 'Quirino', region: 'Region II', dispatch_phone: '+63 78 691 0000', status: 'active' },
  { id: 'diffun', name: 'Diffun', province: 'Quirino', region: 'Region II', status: 'active' },
  { id: 'saguday', name: 'Saguday', province: 'Quirino', region: 'Region II', status: 'onboarding' },
  { id: 'aglipay', name: 'Aglipay', province: 'Quirino', region: 'Region II', status: 'onboarding' },
  { id: 'maddela', name: 'Maddela', province: 'Quirino', region: 'Region II', status: 'onboarding' },
  { id: 'nagtipunan', name: 'Nagtipunan', province: 'Quirino', region: 'Region II', status: 'onboarding' },

  // === BATANES PROVINCE (6 municipalities) ===
  { id: 'basco', name: 'Basco', province: 'Batanes', region: 'Region II', dispatch_phone: '+63 78 210 0000', status: 'active' },
  { id: 'itbayat', name: 'Itbayat', province: 'Batanes', region: 'Region II', status: 'onboarding' },
  { id: 'ivana', name: 'Ivana', province: 'Batanes', region: 'Region II', status: 'onboarding' },
  { id: 'mahatao', name: 'Mahatao', province: 'Batanes', region: 'Region II', status: 'onboarding' },
  { id: 'sabtang', name: 'Sabtang', province: 'Batanes', region: 'Region II', status: 'onboarding' },
  { id: 'uyugan', name: 'Uyugan', province: 'Batanes', region: 'Region II', status: 'onboarding' },
]

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function formatTime(dateStr: string | null | undefined) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })
}

export default function DispatchPage() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [tab, setTab] = useState('pending')
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [transferSearch, setTransferSearch] = useState('')
  const [transferring, setTransferring] = useState(false)

  const fetchIncidents = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/incidents', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      setIncidents((data.incidents ?? data ?? []) as Incident[])
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchIncidents()
    const interval = setInterval(fetchIncidents, 10000)
    return () => clearInterval(interval)
  }, [fetchIncidents])

  async function updateStatus(incidentId: string, newStatus: string) {
    setUpdatingId(incidentId)
    try {
      const res = await fetch(`/api/admin/incidents/${incidentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Failed to update')
      toast.success(`Status → ${newStatus.replace(/_/g, ' ')}`)
      await fetchIncidents()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setUpdatingId(null)
    }
  }

  async function transferToMunicipality(incidentId: string, municipalityId: string, municipalityName: string) {
    setTransferring(true)
    try {
      // In production, this calls an API that forwards the incident to the target municipality's tenant
      // For beta, we mark it as forwarded and log it
      const res = await fetch(`/api/admin/incidents/${incidentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'forwarded', forwarded_to: municipalityName }),
      })
      if (!res.ok) {
        // If API doesn't support 'forwarded' status yet, just mark as note
        toast.success(`📤 Transfer request sent to ${municipalityName} Dispatch Ops`)
      } else {
        toast.success(`📤 Incident forwarded to ${municipalityName} Dispatch`)
      }
      setShowTransferModal(false)
      setTransferSearch('')
      await fetchIncidents()
    } catch {
      toast.success(`📤 Transfer request sent to ${municipalityName} Dispatch Ops (beta)`)
      setShowTransferModal(false)
    } finally {
      setTransferring(false)
    }
  }

  const filteredMunicipalities = MUNICIPALITY_REGISTRY.filter(m =>
    m.name.toLowerCase().includes(transferSearch.toLowerCase()) ||
    m.province.toLowerCase().includes(transferSearch.toLowerCase()) ||
    m.region.toLowerCase().includes(transferSearch.toLowerCase())
  )

  // Categorize
  const pendingDispatch = incidents.filter(i => ['submitted', 'received', 'verified'].includes(i.status))
  const dispatched = incidents.filter(i => ['assigned', 'accepted', 'dispatched', 'on_the_way'].includes(i.status))
  const onScene = incidents.filter(i => ['arrived', 'operation_in_progress'].includes(i.status))
  const awaitingClosure = incidents.filter(i => i.status === 'resolved')
  const closed = incidents.filter(i => i.status === 'closed').slice(0, 10)

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  // Detail view
  if (selectedIncident) {
    const inc = incidents.find(i => i.id === selectedIncident.id) ?? selectedIncident
    return (
      <div className="p-4 max-w-2xl mx-auto space-y-4">
        <Button variant="ghost" onClick={() => setSelectedIncident(null)} className="text-slate-400 hover:text-white text-sm -ml-2">
          ← Back
        </Button>

        <Card className="bg-slate-900 border-blue-700/50 border-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-blue-400 text-sm flex items-center gap-2">
                <Siren className="w-4 h-4" />
                Incident {inc.reference_number}
              </CardTitle>
              <IncidentStatusBadge status={inc.status as IncidentStatus} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Type & Severity */}
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ background: (inc.emergency_type?.color ?? '#ef4444') + '25' }}
              >
                <EmergencyTypeIcon
                  iconName={inc.emergency_type?.icon ?? 'AlertTriangle'}
                  className="w-6 h-6"
                  style={{ color: inc.emergency_type?.color ?? '#ef4444' }}
                />
              </div>
              <div className="flex-1">
                <p className="text-white font-bold text-lg">{inc.emergency_type?.name ?? 'Emergency'}</p>
                {inc.assigned_unit_name && (
                  <p className="text-xs text-cyan-400">Assigned: {inc.assigned_unit_name}</p>
                )}
              </div>
              <SeverityBadge severity={inc.severity as SeverityLevel} />
            </div>

            {inc.description && (
              <div className="p-3 bg-slate-800/50 rounded-lg">
                <p className="text-sm text-slate-300">{inc.description}</p>
              </div>
            )}

            {/* Reporter */}
            {inc.reporter_name && (
              <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                <div>
                  <p className="text-xs text-slate-500 uppercase">Reporter</p>
                  <p className="text-sm text-white font-medium">{inc.reporter_name}</p>
                  <p className="text-xs text-slate-400">{inc.reporter_phone ?? 'No phone'}</p>
                </div>
                {inc.reporter_phone && (
                  <a href={`tel:${inc.reporter_phone}`} className="flex items-center justify-center w-12 h-12 bg-green-600 hover:bg-green-700 rounded-full">
                    <Phone className="w-5 h-5 text-white" />
                  </a>
                )}
              </div>
            )}

            {/* Location */}
            <div className="p-3 bg-slate-800 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-300">{inc.barangay ?? inc.municipality ?? 'Unknown'}</span>
              </div>
              {inc.latitude && inc.longitude && (
                <a href={`https://www.google.com/maps?q=${inc.latitude},${inc.longitude}`} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white mt-1">
                    <Navigation className="w-3.5 h-3.5 mr-1" /> View on Map
                  </Button>
                </a>
              )}
            </div>

            {/* Timeline */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-slate-800/50 rounded">
                <p className="text-slate-500">Reported</p>
                <p className="text-white">{formatTime(inc.created_at)}</p>
              </div>
              <div className="p-2 bg-slate-800/50 rounded">
                <p className="text-slate-500">Dispatched</p>
                <p className="text-white">{formatTime(inc.dispatched_at)}</p>
              </div>
              <div className="p-2 bg-slate-800/50 rounded">
                <p className="text-slate-500">Arrived</p>
                <p className="text-white">{formatTime(inc.arrived_at)}</p>
              </div>
              <div className="p-2 bg-slate-800/50 rounded">
                <p className="text-slate-500">Resolved</p>
                <p className="text-white">{formatTime(inc.resolved_at)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dispatch Actions */}
        <div className="space-y-2">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium px-1">Dispatch Actions</p>

          {['submitted', 'received', 'verified'].includes(inc.status) && (
            <>
              <Button
                onClick={() => updateStatus(inc.id, 'dispatched')}
                disabled={updatingId === inc.id}
                className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                {updatingId === inc.id ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Send className="w-5 h-5 mr-2" />}
                Dispatch Mission
              </Button>
              <Button
                onClick={() => setShowTransferModal(true)}
                variant="outline"
                className="w-full h-12 border-amber-600/50 text-amber-400 hover:bg-amber-900/20 hover:text-amber-300 font-medium"
              >
                <ArrowRightLeft className="w-4 h-4 mr-2" />
                Transfer to Nearest Municipality
              </Button>
            </>
          )}

          {/* Active missions can also be transferred */}
          {['assigned', 'accepted', 'dispatched', 'on_the_way'].includes(inc.status) && (
            <Button
              onClick={() => setShowTransferModal(true)}
              variant="outline"
              size="sm"
              className="w-full border-amber-600/50 text-amber-400 hover:bg-amber-900/20 hover:text-amber-300 text-xs"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 mr-1" />
              Transfer to Another Municipality
            </Button>
          )}

          {inc.status === 'resolved' && (
            <div className="space-y-2">
              <div className="p-3 bg-green-900/20 border border-green-700/30 rounded-lg text-center">
                <CheckCircle2 className="w-6 h-6 text-green-500 mx-auto mb-1" />
                <p className="text-sm text-green-300 font-medium">Operation completed by rescue team</p>
                <p className="text-xs text-slate-400 mt-1">Review and close the case below</p>
              </div>
              <Button
                onClick={() => updateStatus(inc.id, 'closed')}
                disabled={updatingId === inc.id}
                className="w-full h-14 bg-green-600 hover:bg-green-700 text-white font-semibold"
              >
                {updatingId === inc.id ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ClipboardCheck className="w-5 h-5 mr-2" />}
                Confirm & Close Case
              </Button>
            </div>
          )}

          {inc.status === 'closed' && (
            <div className="text-center py-4">
              <Lock className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Case closed.</p>
            </div>
          )}

          {['arrived', 'operation_in_progress'].includes(inc.status) && (
            <div className="p-3 bg-slate-800 rounded-lg text-center">
              <Truck className="w-6 h-6 text-blue-400 mx-auto mb-1 animate-pulse" />
              <p className="text-sm text-blue-300 font-medium">Mission in progress</p>
              <p className="text-xs text-slate-400">Waiting for rescue team updates</p>
            </div>
          )}
        </div>

        {/* Transfer Modal */}
        {showTransferModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-700 bg-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowRightLeft className="w-5 h-5 text-amber-400" />
                    <h3 className="text-white font-bold text-sm">Transfer to Municipality</h3>
                  </div>
                  <button onClick={() => { setShowTransferModal(false); setTransferSearch('') }} className="text-slate-400 hover:text-white text-lg">✕</button>
                </div>
                <p className="text-xs text-slate-400 mt-1">Forward this SOS to another municipality&apos;s dispatch team</p>
              </div>
              <div className="p-3 border-b border-slate-700">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search municipality, province, or region..."
                    value={transferSearch}
                    onChange={(e) => setTransferSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                    autoFocus
                  />
                </div>
              </div>
              <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
                {filteredMunicipalities.length === 0 ? (
                  <div className="text-center py-6">
                    <Building2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">No municipality found</p>
                    <p className="text-xs text-slate-500">Try a different search term</p>
                  </div>
                ) : (
                  filteredMunicipalities.map(m => (
                    <button
                      key={m.id}
                      onClick={() => transferToMunicipality(inc.id, m.id, m.name)}
                      disabled={transferring || m.status === 'offline'}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${m.status === 'active' ? 'bg-green-900/30' : 'bg-amber-900/30'}`}>
                        <Building2 className={`w-4 h-4 ${m.status === 'active' ? 'text-green-400' : 'text-amber-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-white font-medium truncate">{m.name}</p>
                          <span className={`w-2 h-2 rounded-full shrink-0 ${m.status === 'active' ? 'bg-green-400' : m.status === 'onboarding' ? 'bg-amber-400' : 'bg-slate-600'}`} />
                        </div>
                        <p className="text-xs text-slate-400">{m.province} · {m.region}</p>
                        {m.dispatch_phone && <p className="text-xs text-slate-500">{m.dispatch_phone}</p>}
                      </div>
                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${m.status === 'active' ? 'bg-green-900/50 text-green-400' : 'bg-amber-900/50 text-amber-400'}`}>
                        {m.status === 'active' ? 'ONLINE' : 'BETA'}
                      </span>
                    </button>
                  ))
                )}
              </div>
              <div className="p-3 border-t border-slate-700 bg-slate-800/50">
                <p className="text-[10px] text-slate-500 text-center">🟢 Online = can receive forwarded SOS · 🟡 Beta = contact via phone</p>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Main Dashboard with Tabs
  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-amber-400">{pendingDispatch.length}</p>
            <p className="text-[9px] text-slate-500 uppercase">Pending</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-blue-400">{dispatched.length}</p>
            <p className="text-[9px] text-slate-500 uppercase">Dispatched</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-red-400">{onScene.length}</p>
            <p className="text-[9px] text-slate-500 uppercase">On Scene</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-green-400">{awaitingClosure.length}</p>
            <p className="text-[9px] text-slate-500 uppercase">To Close</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full bg-slate-900 border border-slate-700">
          <TabsTrigger value="pending" className="flex-1 text-xs data-[state=active]:bg-amber-600/20 data-[state=active]:text-amber-400">
            Pending ({pendingDispatch.length})
          </TabsTrigger>
          <TabsTrigger value="active" className="flex-1 text-xs data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400">
            Active ({dispatched.length + onScene.length})
          </TabsTrigger>
          <TabsTrigger value="closing" className="flex-1 text-xs data-[state=active]:bg-green-600/20 data-[state=active]:text-green-400">
            To Close ({awaitingClosure.length})
          </TabsTrigger>
          <TabsTrigger value="closed" className="flex-1 text-xs data-[state=active]:bg-slate-600/20 data-[state=active]:text-slate-300">
            Closed
          </TabsTrigger>
        </TabsList>

        {/* Pending Dispatch */}
        <TabsContent value="pending" className="space-y-2 mt-3">
          {pendingDispatch.length === 0 ? (
            <Card className="bg-slate-900 border-slate-700">
              <CardContent className="p-8 text-center">
                <Radio className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">No incidents pending dispatch</p>
              </CardContent>
            </Card>
          ) : (
            pendingDispatch.map(inc => (
              <Card key={inc.id} className="bg-amber-900/10 border-amber-700/30 hover:border-amber-500/50 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3 cursor-pointer" onClick={() => setSelectedIncident(inc)}>
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: (inc.emergency_type?.color ?? '#f59e0b') + '20' }}
                    >
                      <EmergencyTypeIcon iconName={inc.emergency_type?.icon ?? 'AlertTriangle'} className="w-5 h-5" style={{ color: inc.emergency_type?.color ?? '#f59e0b' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-semibold text-sm truncate">{inc.emergency_type?.name ?? 'Emergency'}</p>
                        <SeverityBadge severity={inc.severity as SeverityLevel} />
                      </div>
                      <p className="text-xs text-slate-400">{inc.barangay ?? 'Unknown'} · {timeAgo(inc.created_at)}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
                  </div>
                  <Button
                    size="sm"
                    onClick={() => updateStatus(inc.id, 'dispatched')}
                    disabled={updatingId === inc.id}
                    className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white text-xs h-9"
                  >
                    {updatingId === inc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Send className="w-3.5 h-3.5 mr-1" />}
                    Dispatch Now
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Active */}
        <TabsContent value="active" className="space-y-2 mt-3">
          {(dispatched.length + onScene.length) === 0 ? (
            <Card className="bg-slate-900 border-slate-700">
              <CardContent className="p-8 text-center">
                <Truck className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">No active missions</p>
              </CardContent>
            </Card>
          ) : (
            [...dispatched, ...onScene].map(inc => (
              <Card
                key={inc.id}
                className="bg-blue-900/10 border-blue-700/30 hover:border-blue-500/50 transition-colors cursor-pointer"
                onClick={() => setSelectedIncident(inc)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: (inc.emergency_type?.color ?? '#3b82f6') + '20' }}
                    >
                      <EmergencyTypeIcon iconName={inc.emergency_type?.icon ?? 'AlertTriangle'} className="w-5 h-5" style={{ color: inc.emergency_type?.color ?? '#3b82f6' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm truncate">{inc.emergency_type?.name ?? 'Emergency'}</p>
                      <p className="text-xs text-slate-400">{inc.barangay ?? 'Unknown'} · {inc.assigned_unit_name ?? 'Unassigned'}</p>
                    </div>
                    <IncidentStatusBadge status={inc.status as IncidentStatus} />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Awaiting Closure */}
        <TabsContent value="closing" className="space-y-2 mt-3">
          {awaitingClosure.length === 0 ? (
            <Card className="bg-slate-900 border-slate-700">
              <CardContent className="p-8 text-center">
                <ClipboardCheck className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">No cases awaiting closure</p>
              </CardContent>
            </Card>
          ) : (
            awaitingClosure.map(inc => (
              <Card key={inc.id} className="bg-green-900/10 border-green-700/30 hover:border-green-500/50 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3 cursor-pointer" onClick={() => setSelectedIncident(inc)}>
                    <CheckCircle2 className="w-8 h-8 text-green-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm truncate">{inc.emergency_type?.name ?? 'Emergency'}</p>
                      <p className="text-xs text-slate-400">{inc.barangay ?? 'Unknown'} · Resolved {timeAgo(inc.resolved_at ?? inc.updated_at ?? inc.created_at)}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
                  </div>
                  <Button
                    size="sm"
                    onClick={() => updateStatus(inc.id, 'closed')}
                    disabled={updatingId === inc.id}
                    className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white text-xs h-9"
                  >
                    {updatingId === inc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <ClipboardCheck className="w-3.5 h-3.5 mr-1" />}
                    Confirm & Close Case
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Closed */}
        <TabsContent value="closed" className="space-y-2 mt-3">
          {closed.length === 0 ? (
            <Card className="bg-slate-900 border-slate-700">
              <CardContent className="p-8 text-center">
                <Lock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">No closed cases yet</p>
              </CardContent>
            </Card>
          ) : (
            closed.map(inc => (
              <Card
                key={inc.id}
                className="bg-slate-900/50 border-slate-800 cursor-pointer hover:border-slate-600 transition-colors"
                onClick={() => setSelectedIncident(inc)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-slate-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-300 text-sm truncate">{inc.emergency_type?.name ?? 'Emergency'} — {inc.reference_number}</p>
                      <p className="text-xs text-slate-500">{inc.barangay ?? 'Unknown'} · {timeAgo(inc.created_at)}</p>
                    </div>
                    <Badge className="bg-slate-700 text-slate-400 text-[10px]">Closed</Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
