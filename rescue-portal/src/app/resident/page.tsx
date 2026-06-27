'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Shield, Phone, AlertTriangle, Clock, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { IncidentStatusBadge } from '@/components/incident-status-badge'
import { IncidentProgressTracker } from '@/components/incident-progress-tracker'
import { EmergencyTypeIcon } from '@/components/emergency-type-icon'
import { RescueTrackingMap } from '@/components/rescue-tracking-map'
import { formatRelativeTime } from '@/lib/utils'
import { useSettings } from '@/lib/settings-context'
import { createClient } from '@/lib/supabase/client'
import { isOwnerTestMode, withOwnerTestMode } from '@/lib/owner-test-mode'
import type { DemoIncident } from '@/lib/types'
import { toast } from 'sonner'

export default function ResidentDashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <ResidentDashboardContent />
    </Suspense>
  )
}

function ResidentDashboardContent() {
  const { settings } = useSettings()
  const searchParams = useSearchParams()
  const router = useRouter()
  const ownerTestMode = isOwnerTestMode(searchParams)
  const [residentName, setResidentName] = useState('Resident')
  const [residentLocation, setResidentLocation] = useState('')
  const [myIncidents, setMyIncidents] = useState<DemoIncident[]>([])
  const [loadingIncidents, setLoadingIncidents] = useState(true)
  const [sendingSos, setSendingSos] = useState(false)
  const [holdProgress, setHoldProgress] = useState(0) // 0-100
  const [holding, setHolding] = useState(false)
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const holdStartRef = useRef<number>(0)
  const HOLD_DURATION_MS = 3000
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const activeIncident = useMemo(
    () => myIncidents.find((i) => ['submitted', 'received', 'on_the_way', 'dispatched', 'arrived'].includes(i.status)),
    [myIncidents]
  )

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('full_name, barangay, municipality')
            .eq('user_id', user.id)
            .single() as {
              data: { full_name: string; barangay: string | null; municipality: string | null } | null
            }

          if (profile) {
            setResidentName(profile.full_name)
            setResidentLocation([profile.barangay, profile.municipality].filter(Boolean).join(', '))
          }
        }

        const response = await fetch(withOwnerTestMode('/api/resident/incidents', ownerTestMode), { cache: 'no-store' })
        const payload = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(payload?.message ?? 'Unable to load reports.')
        }

        setMyIncidents((payload?.incidents ?? []) as DemoIncident[])
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Unable to load reports.')
        setMyIncidents([])
      } finally {
        setLoadingIncidents(false)
      }
    }, 0)

    return () => window.clearTimeout(timer)
  }, [ownerTestMode])

  const cancelHold = useCallback(() => {
    setHolding(false)
    setHoldProgress(0)
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current)
      holdTimerRef.current = null
    }
  }, [])

  const startHold = useCallback(() => {
    if (sendingSos) return
    setHolding(true)
    holdStartRef.current = Date.now()
    // Haptic feedback on start
    if (navigator.vibrate) navigator.vibrate(50)

    holdTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - holdStartRef.current
      const progress = Math.min((elapsed / HOLD_DURATION_MS) * 100, 100)
      setHoldProgress(progress)

      // Haptic pulse at 50%
      if (progress >= 50 && progress < 55 && navigator.vibrate) {
        navigator.vibrate(30)
      }

      if (progress >= 100) {
        cancelHold()
        // Strong haptic on trigger
        if (navigator.vibrate) navigator.vibrate([100, 50, 100])
        sendSos()
      }
    }, 50)
  }, [sendingSos, cancelHold])

  // Cleanup on unmount
  useEffect(() => {
    return () => { if (holdTimerRef.current) clearInterval(holdTimerRef.current) }
  }, [])

  function sendSos() {
    if (!navigator.geolocation) {
      toast.error('This browser cannot share location. Call the emergency hotline now.')
      return
    }

    setSendingSos(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await fetch(withOwnerTestMode('/api/resident/incidents/sos', ownerTestMode), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              gps_accuracy: position.coords.accuracy,
            }),
          })
          const payload = await response.json().catch(() => ({}))

          if (!response.ok) throw new Error(payload?.message ?? 'Unable to send SOS.')

          const incidentId = payload?.incident?.id
          if (!incidentId) throw new Error('SOS was sent but no incident reference was returned.')

          const reference = encodeURIComponent(payload?.referenceNumber ?? payload?.incident?.reference_number ?? '')
          router.push(withOwnerTestMode(`/resident/emergency?incident=${encodeURIComponent(incidentId)}&reference=${reference}`, ownerTestMode))
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Unable to send SOS.')
          setSendingSos(false)
        }
      },
      () => {
        setSendingSos(false)
        toast.error('Location is required to send SOS. Please allow location access and try again.')
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

  return (
    <div className="px-4 py-6 space-y-6">
      <div>
        <p className="text-slate-500 text-sm">{greeting},</p>
        <h1 className="text-2xl font-bold text-slate-900">{residentName.split(' ')[0]}</h1>
        {residentLocation && <p className="text-slate-500 text-sm">{residentLocation}</p>}
      </div>

      <div className="flex flex-col items-center py-6">
        <button
          type="button"
          onPointerDown={startHold}
          onPointerUp={cancelHold}
          onPointerLeave={cancelHold}
          onContextMenu={(e) => e.preventDefault()}
          disabled={sendingSos}
          className="group disabled:cursor-wait disabled:opacity-70 select-none touch-none"
        >
          <div className="relative">
            {!holding && !sendingSos && (
              <>
                <div className="absolute inset-0 rounded-full bg-red-500/20 scale-125 group-hover:scale-150 transition-transform duration-700 animate-ping" />
                <div className="absolute inset-0 rounded-full bg-red-500/10 scale-150 group-hover:scale-175 transition-transform duration-1000 animate-ping" style={{ animationDelay: '200ms' }} />
              </>
            )}
            <span className="relative w-36 h-36 rounded-full bg-red-600 group-hover:bg-red-700 group-active:scale-95 transition-all shadow-2xl shadow-red-500/40 flex flex-col items-center justify-center text-white overflow-hidden">
              {/* Hold progress ring */}
              {holding && (
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 144 144">
                  <circle cx="72" cy="72" r="68" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="6" />
                  <circle
                    cx="72" cy="72" r="68" fill="none" stroke="white" strokeWidth="6"
                    strokeDasharray={2 * Math.PI * 68}
                    strokeDashoffset={2 * Math.PI * 68 * (1 - holdProgress / 100)}
                    strokeLinecap="round"
                    className="transition-none"
                  />
                </svg>
              )}
              <Shield className="w-10 h-10 mb-1" />
              <span className="text-xl font-black tracking-wide">
                {sendingSos ? 'SENDING' : holding ? `${Math.ceil((HOLD_DURATION_MS - (holdProgress / 100 * HOLD_DURATION_MS)) / 1000)}` : 'SOS'}
              </span>
              {holding && <span className="text-xs font-semibold opacity-80">HOLD</span>}
            </span>
          </div>
        </button>
        <p className="text-slate-500 text-sm mt-4">
          {sendingSos ? 'Sending your location to dispatch…' : holding ? 'Keep holding to send SOS...' : 'Hold for 3 seconds to send SOS'}
        </p>

        <div className="w-full grid grid-cols-1 gap-3 mt-5 max-w-sm">
          <Link href={withOwnerTestMode('/resident/emergency?role=victim', ownerTestMode)}>
            <Card className="border-2 border-red-500 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-red-700 text-sm">I AM INVOLVED</p>
                  <p className="text-xs text-red-600/70">I need help right now</p>
                </div>
                <ChevronRight className="w-5 h-5 text-red-400 ml-auto" />
              </CardContent>
            </Card>
          </Link>
          <Link href={withOwnerTestMode('/resident/emergency?role=passerby', ownerTestMode)}>
            <Card className="border border-slate-300 bg-white hover:bg-slate-50 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">REPORTING FOR SOMEONE ELSE</p>
                  <p className="text-xs text-slate-500">I witnessed an emergency</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 ml-auto" />
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {activeIncident && (
        <>
          <Link href={withOwnerTestMode('/resident/history', ownerTestMode)}>
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
                <IncidentProgressTracker
                  status={activeIncident.status}
                  assignedUnitName={activeIncident.assigned_unit_name}
                  className="mt-4 pt-3 border-t border-amber-200"
                />
              </CardContent>
            </Card>
          </Link>

          {/* Live Rescuer Tracking — shows distance & ETA to resident */}
          {['dispatched', 'on_the_way', 'arrived'].includes(activeIncident.status) && (
            <RescueTrackingMap
              incidentId={activeIncident.id}
              variant="compact"
              pollInterval={10000}
            />
          )}
        </>
      )}

      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-300 leading-relaxed">
            <strong className="text-white">Important:</strong> This portal does not replace national emergency numbers.
            For life-threatening emergencies, call <strong className="text-red-400">911</strong> immediately.
          </p>
        </CardContent>
      </Card>

      <a href={`tel:${settings.hotline.replace(/[^0-9+]/g, '')}`}>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Phone className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-red-600 font-medium">Emergency Hotline</p>
                <p className="font-bold text-red-700 text-lg">{settings.hotline}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-red-400" />
          </CardContent>
        </Card>
      </a>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-900">Recent Reports</h2>
          <Link href={withOwnerTestMode('/resident/history', ownerTestMode)} className="text-sm text-blue-600 hover:text-blue-700">View all</Link>
        </div>
        <div className="space-y-2">
          {loadingIncidents && (
            <div className="text-center py-8 text-slate-400 text-sm">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              Loading reports...
            </div>
          )}
          {!loadingIncidents && myIncidents.slice(0, 3).map((inc) => (
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
          {!loadingIncidents && myIncidents.length === 0 && (
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
