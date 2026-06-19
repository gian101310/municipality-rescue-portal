'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, MapPin, Camera, ChevronRight, CheckCircle2,
  AlertTriangle, Users, Shield, Phone
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import { IncidentStatusBadge } from '@/components/incident-status-badge'
import { EmergencyTypeIcon } from '@/components/emergency-type-icon'
import { DEMO_EMERGENCY_TYPES } from '@/lib/demo-data'
import { useSettings } from '@/lib/settings-context'
import { toast } from 'sonner'
import type { EmergencyType } from '@/lib/types'
import { calculateSeverity, getSeverityRingProps } from '@/lib/severity-scoring'
import { VoiceSOS } from '@/components/voice-sos'
import { checkRateLimit, recordSubmission } from '@/lib/rate-limiter'

type Step = 'select' | 'details' | 'confirm' | 'submitted'

// Define which hazard toggles are relevant per emergency type category
function getRelevantHazards(typeId: string) {
  const hazards: { key: string; label: string; urgent: boolean }[] = []

  // Unconscious/unresponsive — always relevant for medical, rescue, fire, collapse, vehicular
  if (['et-medical', 'et-rescue', 'et-fire', 'et-collapse', 'et-vehicular'].includes(typeId)) {
    hazards.push({ key: 'unconscious', label: 'Someone is unconscious or unresponsive', urgent: true })
  }

  // Fire — relevant for fire, collapse, hazmat, explosion types
  if (['et-fire', 'et-collapse', 'et-hazmat', 'et-explosion', 'et-other'].includes(typeId)) {
    hazards.push({ key: 'fire', label: 'There is fire present', urgent: true })
  }

  // Flooding — relevant for flood, rescue, typhoon, landslide
  if (['et-flood', 'et-rescue', 'et-typhoon', 'et-landslide', 'et-other'].includes(typeId)) {
    hazards.push({ key: 'flooding', label: 'There is flooding or water hazard', urgent: false })
  }

  // Violence — relevant for crime, civil unrest
  if (['et-crime', 'et-civil_unrest', 'et-other'].includes(typeId)) {
    hazards.push({ key: 'violence', label: 'There is violence or threat of violence', urgent: true })
  }

  // Trapped persons — relevant for collapse, earthquake, landslide, vehicular
  if (['et-collapse', 'et-earthquake', 'et-landslide', 'et-vehicular'].includes(typeId)) {
    hazards.push({ key: 'trapped', label: 'People are trapped or pinned', urgent: true })
  }

  // Chemical/hazmat — relevant for hazmat, explosion, fire
  if (['et-hazmat', 'et-explosion', 'et-fire'].includes(typeId)) {
    hazards.push({ key: 'chemical', label: 'Hazardous materials or chemical exposure', urgent: true })
  }

  return hazards
}

export default function EmergencyPage() {
  const router = useRouter()
  const { settings } = useSettings()
  const [step, setStep] = useState<Step>('select')
  const [selectedType, setSelectedType] = useState<EmergencyType | null>(null)
  const [description, setDescription] = useState('')
  const [affectedCount, setAffectedCount] = useState(1)
  const [hazardStates, setHazardStates] = useState<Record<string, boolean>>({})
  const [locationGranted, setLocationGranted] = useState(false)
  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy: number | null } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [refNumber, setRefNumber] = useState('')

  function selectType(type: EmergencyType) {
    setSelectedType(type)
    setStep('details')
    // Pre-set hazards based on type
    const presets: Record<string, boolean> = {}
    if (type.id === 'et-fire') presets.fire = true
    if (type.id === 'et-flood') presets.flooding = true
    if (type.id === 'et-crime') presets.violence = true
    if (type.id === 'et-collapse' || type.id === 'et-earthquake') presets.trapped = true
    setHazardStates(presets)
  }

  function toggleHazard(key: string, value: boolean) {
    setHazardStates((prev) => ({ ...prev, [key]: value }))
  }

  function requestLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          })
          setLocationGranted(true)
          toast.success('Location captured')
        },
        () => {
          setLocationGranted(false)
          setLocation(null)
          toast.error('Location is required to submit an emergency report.')
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
      )
    } else {
      setLocationGranted(false)
      toast.error('This browser cannot share location.')
    }
  }

  async function handleSubmit() {
    if (!description.trim()) { toast.error('Please describe the emergency'); return }
    if (!locationGranted || !location) { toast.error('Please share your location first'); return }
    if (!selectedType) { toast.error('Please choose an emergency type'); return }

    // Rate limiting
    const limit = checkRateLimit()
    if (!limit.allowed) {
      toast.error(`Too many submissions. Try again in ${Math.ceil(limit.resetIn / 60)} minutes.`)
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/resident/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emergency_type_id: selectedType.id,
          emergency_type_name: selectedType.name,
          emergency_type_icon: selectedType.icon,
          emergency_type_color: selectedType.color,
          emergency_type_description: selectedType.description,
          description,
          affected_count: affectedCount,
          hazards: activeHazards,
          latitude: location.lat,
          longitude: location.lng,
          gps_accuracy: location.accuracy,
        }),
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload?.message ?? 'Unable to submit emergency report.')
      }

      recordSubmission()
      setRefNumber(payload?.referenceNumber ?? payload?.incident?.reference_number ?? 'Submitted')
      setStep('submitted')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to submit emergency report.')
    } finally {
      setSubmitting(false)
    }
  }

  const activeHazards = Object.entries(hazardStates).filter(([, v]) => v).map(([k]) => k)
  const relevantHazards = selectedType ? getRelevantHazards(selectedType.id) : []

  // Submitted / Success screen
  if (step === 'submitted') {
    return (
      <div className="px-4 py-8 flex flex-col items-center text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Emergency Reported!</h2>
          <p className="text-slate-500 text-sm">Your report has been received by our dispatch team.</p>
        </div>
        <div className="bg-slate-100 rounded-xl p-5 w-full">
          <p className="text-xs text-slate-500 mb-1">Reference Number</p>
          <p className="text-xl font-mono font-bold text-slate-900">{refNumber}</p>
        </div>

        {/* Live Status */}
        <div className="w-full space-y-2">
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-green-700 font-medium">Report submitted</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-sm text-blue-700 font-medium">Dispatcher reviewing your report...</span>
          </div>
        </div>

        {/* Escalation Call Button */}
        <div className="w-full bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-red-700">Need immediate help?</p>
          <p className="text-xs text-red-600">If the situation is life-threatening, call our emergency hotline directly.</p>
          <a
            href={`tel:${settings.hotline.replace(/[^0-9+]/g, '')}`}
            className="flex items-center justify-center gap-2 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors"
          >
            <Phone className="w-5 h-5" />
            Call {settings.hotline}
          </a>
          {settings.secondaryHotline && (
            <a
              href={`tel:${settings.secondaryHotline.replace(/[^0-9+]/g, '')}`}
              className="flex items-center justify-center gap-2 w-full border border-red-300 text-red-700 font-semibold py-2.5 rounded-lg hover:bg-red-100 transition-colors text-sm"
            >
              <Phone className="w-4 h-4" />
              Secondary: {settings.secondaryHotline}
            </a>
          )}
          <a
            href="tel:911"
            className="flex items-center justify-center gap-2 w-full border border-slate-300 text-slate-700 font-semibold py-2.5 rounded-lg hover:bg-slate-100 transition-colors text-sm"
          >
            <Phone className="w-4 h-4" />
            911 — National Emergency
          </a>
        </div>

        <p className="text-xs text-slate-400 max-w-xs">
          Save your reference number. You&apos;ll receive updates as rescue teams are dispatched.
        </p>

        <div className="flex flex-col gap-2 w-full">
          <Button className="bg-slate-900 hover:bg-slate-800 text-white" render={<Link href="/resident" />}>
            Return to Home
          </Button>
          <Button variant="outline" className="border-slate-300" render={<Link href="/resident/history" />}>
            View My Reports
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="px-4 py-4 flex items-center gap-3 bg-white border-b border-slate-200">
        <Button
          variant="ghost"
          size="icon"
          className="text-slate-600"
          onClick={() => step === 'select' ? router.push('/resident') : setStep(step === 'confirm' ? 'details' : 'select')}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-bold text-slate-900">
          {step === 'select' ? 'Report Emergency' : step === 'details' ? 'Emergency Details' : 'Confirm Report'}
        </h1>
        {step !== 'select' && (
          <div className="ml-auto">
            <IncidentStatusBadge status="submitted" />
          </div>
        )}
      </div>

      <div className="flex-1 px-4 py-5 space-y-5">
        {/* Step 1: Type Selection */}
        {step === 'select' && (
          <div>
            <p className="text-slate-500 text-sm mb-4">Select the type of emergency</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {DEMO_EMERGENCY_TYPES.map((et) => (
                <button
                  key={et.id}
                  onClick={() => selectType(et)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-slate-200 hover:border-slate-400 active:scale-95 transition-all bg-white text-center"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: et.color + '20' }}
                  >
                    <EmergencyTypeIcon iconName={et.icon} className="w-6 h-6" style={{ color: et.color }} />
                  </div>
                  <span className="text-xs font-semibold text-slate-800 leading-tight">{et.name}</span>
                </button>
              ))}
            </div>
            <Card className="mt-4 bg-red-50 border-red-200">
              <CardContent className="p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">For life-threatening emergencies, call <strong>911</strong> immediately while using this app.</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: Details */}
        {step === 'details' && selectedType && (
          <div className="space-y-5">
            {/* Type reminder */}
            <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: selectedType.color + '20' }}>
                <EmergencyTypeIcon iconName={selectedType.icon} className="w-5 h-5" style={{ color: selectedType.color }} />
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-sm">{selectedType.name}</p>
                <button onClick={() => setStep('select')} className="text-xs text-blue-600">Change type</button>
              </div>
            </div>

            {/* Location */}
            <div>
              <Label className="text-slate-700 font-semibold mb-2 block">Location *</Label>
              {!locationGranted ? (
                <Button
                  onClick={requestLocation}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12"
                >
                  <MapPin className="w-4 h-4 mr-2" /> Share My Location
                </Button>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <MapPin className="w-4 h-4 text-green-600" />
                  <p className="text-sm text-green-700 font-medium">Location captured ✓</p>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="desc" className="text-slate-700 font-semibold mb-2 block">Describe the emergency *</Label>
              <Textarea
                id="desc"
                placeholder="What is happening? Include any important details about the situation, number of people involved, hazards, etc."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[100px] border-slate-300"
              />
              <div className="mt-2">
                <VoiceSOS
                  onTranscript={(text) => setDescription(text)}
                  onSOSTrigger={() => toast.warning('SOS keyword detected — submitting soon')}
                />
              </div>
            </div>

            {/* Affected count */}
            <div>
              <Label className="text-slate-700 font-semibold mb-2 block">How many people are affected?</Label>
              <Input
                type="number"
                min={0}
                value={affectedCount}
                onChange={(e) => setAffectedCount(Number(e.target.value))}
                className="border-slate-300"
              />
            </div>

            {/* Context-specific hazard toggles */}
            {relevantHazards.length > 0 && (
              <div className="space-y-3">
                <p className="text-slate-700 font-semibold text-sm">Additional Hazards</p>
                {relevantHazards.map(({ key, label, urgent }) => (
                  <div key={key} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                    <span className={`text-sm ${urgent && hazardStates[key] ? 'text-red-700 font-medium' : 'text-slate-700'}`}>{label}</span>
                    <Switch checked={!!hazardStates[key]} onCheckedChange={(v) => toggleHazard(key, v)} />
                  </div>
                ))}
              </div>
            )}

            {/* Photo */}
            <div>
              <Label className="text-slate-700 font-semibold mb-2 block">Photos (optional)</Label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                <Camera className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                <p className="text-xs text-slate-400">Tap to take or upload photos</p>
              </div>
            </div>

            <Button
              onClick={() => setStep('confirm')}
              className="w-full bg-red-600 hover:bg-red-700 text-white h-12 font-semibold"
              disabled={!description.trim() || !locationGranted}
            >
              Continue to Confirm
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 'confirm' && selectedType && (
          <div className="space-y-5">
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <p className="font-bold text-red-700">Confirm Emergency Report</p>
              </div>
              <p className="text-sm text-red-600">
                By submitting, you confirm this is a real emergency. False alerts may result in legal consequences.
              </p>
            </div>

            {/* Summary */}
            <Card className="border-slate-200">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: selectedType.color + '20' }}>
                    <EmergencyTypeIcon iconName={selectedType.icon} className="w-4 h-4" style={{ color: selectedType.color }} />
                  </div>
                  <span className="font-semibold text-slate-900">{selectedType.name}</span>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Description</p>
                  <p className="text-sm text-slate-800">{description}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-slate-500">Affected</p>
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      <p className="font-medium">{affectedCount} person{affectedCount !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-slate-500">Location</p>
                    <div className="flex items-center gap-1 text-green-600">
                      <MapPin className="w-3.5 h-3.5" />
                      <p className="font-medium">Captured</p>
                    </div>
                  </div>
                </div>
                {activeHazards.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {activeHazards.includes('unconscious') && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Unconscious</span>}
                    {activeHazards.includes('fire') && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Fire</span>}
                    {activeHazards.includes('flooding') && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Flooding</span>}
                    {activeHazards.includes('violence') && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Violence</span>}
                    {activeHazards.includes('trapped') && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Trapped</span>}
                    {activeHazards.includes('chemical') && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Hazmat</span>}
                  </div>
                )}

                {/* Auto Severity Score */}
                {(() => {
                  const severity = calculateSeverity({
                    emergencyType: selectedType.id,
                    hazards: activeHazards,
                    affectedCount: parseInt(String(affectedCount)) || 1,
                    description,
                  })
                  const ring = getSeverityRingProps(severity.score)
                  return (
                    <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                      <svg width="48" height="48" viewBox="0 0 100 100" className="shrink-0">
                        <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                        <circle
                          cx="50" cy="50" r="40" fill="none"
                          stroke={severity.color}
                          strokeWidth="8"
                          strokeDasharray={ring.circumference}
                          strokeDashoffset={ring.offset}
                          strokeLinecap="round"
                          transform="rotate(-90 50 50)"
                        />
                        <text x="50" y="55" textAnchor="middle" fontSize="24" fontWeight="900" fill={severity.color}>
                          {severity.score}
                        </text>
                      </svg>
                      <div>
                        <p className="text-xs text-slate-500">Auto Severity Score</p>
                        <p className="font-bold text-sm" style={{ color: severity.color }}>{severity.label}</p>
                        <p className="text-xs text-slate-400">Priority triage for dispatchers</p>
                      </div>
                    </div>
                  )
                })()}
              </CardContent>
            </Card>

            <div className="flex flex-col gap-3">
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full bg-red-600 hover:bg-red-700 text-white h-14 text-base font-bold shadow-lg shadow-red-500/30"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Submitting...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Submit Emergency Report
                  </span>
                )}
              </Button>
              <Button variant="outline" onClick={() => setStep('details')} className="border-slate-300 text-slate-700 h-11">
                Back to Edit
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
