'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Shield, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { DemoBanner } from '@/components/demo-banner'
import { DEMO_BARANGAYS } from '@/lib/demo-data'
import {
  DEMO_TENANT_GEO_SCOPE,
  getLocalitiesForProvince,
  getLocalitiesForRegionWithoutProvince,
  getLocalityLabel,
  getRegionName,
  getScopedProvinces,
  getScopedRegions,
  PSGC_VERSION_LABEL,
} from '@/lib/philippines-geography'
import type { TenantGeographyScope } from '@/lib/philippines-geography'
import { loadCoverageLock } from '@/lib/coverage-lock-client'
import { getPasswordRequirementText, isStrongPassword, isValidEmail } from '@/lib/auth-validation'
import { toast } from 'sonner'

const TOTAL_STEPS = 6

const ID_TYPES = [
  { value: 'national_id', label: 'PhilSys National ID' },
  { value: 'drivers_license', label: "Driver's License" },
  { value: 'passport', label: 'Passport' },
  { value: 'philhealth', label: 'PhilHealth ID' },
  { value: 'sss', label: 'SSS ID' },
  { value: 'gsis', label: 'GSIS ID' },
  { value: 'voters_id', label: "Voter's ID" },
  { value: 'postal_id', label: 'Postal ID' },
  { value: 'barangay_id', label: 'Barangay ID' },
  { value: 'senior_citizen_id', label: 'Senior Citizen ID' },
  { value: 'pwd_id', label: 'PWD ID' },
  { value: 'other', label: 'Other Government ID' },
]

interface FormData {
  full_name: string
  phone: string
  email: string
  password: string
  confirmPassword: string
  date_of_birth: string
  region: string
  regionCode: string
  province: string
  provinceCode: string
  municipality: string
  municipalityCode: string
  barangay: string
  address: string
  id_type: string
  id_number: string
  ec_name: string
  ec_phone: string
  ec_relationship: string
  privacy_agree: boolean
  false_alert_agree: boolean
}

export default function RegisterPage() {
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [refNumber, setRefNumber] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [geoScope, setGeoScope] = useState<TenantGeographyScope>(DEMO_TENANT_GEO_SCOPE)
  const [geoScopePersistence, setGeoScopePersistence] = useState<'checking' | 'supabase' | 'demo'>('checking')
  const [form, setForm] = useState<FormData>({
    full_name: '', phone: '', email: '', password: '', confirmPassword: '', date_of_birth: '',
    region: '', regionCode: '', province: '', provinceCode: '',
    municipality: '', municipalityCode: '', barangay: '', address: '',
    id_type: '', id_number: '',
    ec_name: '', ec_phone: '', ec_relationship: '',
    privacy_agree: false, false_alert_agree: false,
  })

  const allowedRegions = getScopedRegions(geoScope)
  const selectedRegionCode = form.regionCode || (allowedRegions.length === 1 ? allowedRegions[0].code : '')
  const allowedProvinces = getScopedProvinces(geoScope)
    .filter((province) => !selectedRegionCode || province.regionCode === selectedRegionCode)
  const provinceLocalities = form.provinceCode
    ? getLocalitiesForProvince(form.provinceCode, geoScope)
    : []
  const metroLocalities = selectedRegionCode && allowedProvinces.length === 0
    ? getLocalitiesForRegionWithoutProvince(selectedRegionCode, geoScope)
    : []
  const municipalityOptions = provinceLocalities.length > 0 ? provinceLocalities : metroLocalities
  const selectedMunicipality = municipalityOptions.find((item) => item.code === form.municipalityCode)
  const selectedMunicipalityLabel = selectedMunicipality ? getLocalityLabel(selectedMunicipality) : ''

  useEffect(() => {
    let cancelled = false

    async function loadSavedCoverageLock() {
      const result = await loadCoverageLock()
      if (cancelled) return

      setGeoScope(result.scope)
      setForm((prev) => ({
        ...prev,
        region: '',
        regionCode: '',
        province: '',
        provinceCode: '',
        municipality: '',
        municipalityCode: '',
        barangay: '',
      }))
      setGeoScopePersistence(result.persistence)
    }

    loadSavedCoverageLock()

    return () => {
      cancelled = true
    }
  }, [])

  function update(field: keyof FormData, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function validateStep(currentStep: number) {
    if (currentStep === 1) {
      if (!form.full_name.trim() || !form.phone.trim() || !form.date_of_birth.trim()) {
        toast.error('Complete your personal details first.')
        return false
      }
      if (!isValidEmail(form.email)) {
        toast.error('Enter a valid email address.')
        return false
      }
      if (form.password !== form.confirmPassword) {
        toast.error('Passwords do not match.')
        return false
      }
      if (!isStrongPassword(form.password)) {
        toast.error(getPasswordRequirementText())
        return false
      }
    }

    if (currentStep === 2) {
      if (!form.regionCode || !form.municipalityCode || !form.barangay || !form.address.trim()) {
        toast.error('Complete your address before continuing.')
        return false
      }
    }

    if (currentStep === 3) {
      if (!form.id_type || !form.id_number.trim()) {
        toast.error('Enter your government ID details.')
        return false
      }
    }

    if (currentStep === 4) {
      if (!form.ec_name.trim() || !form.ec_phone.trim() || !form.ec_relationship) {
        toast.error('Complete your emergency contact details.')
        return false
      }
    }

    return true
  }

  function selectRegion(regionCode: string) {
    setForm((prev) => ({
      ...prev,
      regionCode,
      region: getRegionName(regionCode),
      province: '',
      provinceCode: '',
      municipality: '',
      municipalityCode: '',
      barangay: '',
    }))
  }

  function selectProvince(provinceName: string) {
    const province = allowedProvinces.find((item) => item.name === provinceName)
    setForm((prev) => ({
      ...prev,
      provinceCode: province?.code ?? '',
      province: province?.name ?? '',
      municipality: '',
      municipalityCode: '',
      barangay: '',
    }))
  }

  function selectMunicipality(municipalityLabel: string) {
    const municipality = municipalityOptions.find((item) => getLocalityLabel(item) === municipalityLabel)
    setForm((prev) => ({
      ...prev,
      municipalityCode: municipality?.code ?? '',
      municipality: municipality?.name ?? '',
      barangay: '',
    }))
  }

  function next() {
    if (!validateStep(step)) return
    if (step < TOTAL_STEPS) setStep((s) => s + 1)
  }
  function back() {
    if (step > 1) setStep((s) => s - 1)
  }

  async function submit() {
    setSubmitting(true)
    try {
      const response = await fetch('/api/auth/register-resident', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload?.message ?? 'Unable to submit registration.')
      }

      setRefNumber(payload?.referenceNumber ?? 'Pending')
      setStep(6)
      toast.success('Registration submitted for approval.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to submit registration.')
    } finally {
      setSubmitting(false)
    }
  }

  const progress = ((step - 1) / (TOTAL_STEPS - 1)) * 100

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <DemoBanner />
      <div className="flex-1 flex items-center justify-center p-4 py-8">
        <div className="w-full max-w-lg">
          <Link href="/auth/login" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to login
          </Link>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Step {Math.min(step, 5)} of 5</span>
              {step < 6 && <span className="text-sm text-slate-400">{Math.round(Math.min(progress, 100))}%</span>}
            </div>
            {step < 6 && <Progress value={Math.min(progress, 100)} className="h-1.5 bg-slate-800" />}
          </div>

          <Card className="bg-slate-900 border-slate-700">
            {/* Step 1: Personal Info */}
            {step === 1 && (
              <>
                <CardHeader>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-sm font-bold">1</div>
                    <CardTitle className="text-white">Personal Information</CardTitle>
                  </div>
                  <CardDescription className="text-slate-400">Enter your basic personal details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">Full Name *</Label>
                    <Input placeholder="Juan dela Cruz" value={form.full_name} onChange={(e) => update('full_name', e.target.value)} className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-slate-300">Phone Number *</Label>
                      <Input placeholder="09171234567" value={form.phone} onChange={(e) => update('phone', e.target.value)} className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-slate-300">Date of Birth *</Label>
                      <Input type="date" value={form.date_of_birth} onChange={(e) => update('date_of_birth', e.target.value)} className="bg-slate-800 border-slate-600 text-white" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">Email Address *</Label>
                    <Input type="email" placeholder="juan@email.com" value={form.email} onChange={(e) => update('email', e.target.value)} className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">Password *</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter a secure password"
                        value={form.password}
                        onChange={(e) => update('password', e.target.value)}
                        className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-slate-500">{getPasswordRequirementText()}</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">Confirm Password *</Label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Re-enter your password"
                        value={form.confirmPassword}
                        onChange={(e) => update('confirmPassword', e.target.value)}
                        className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((value) => !value)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </CardContent>
              </>
            )}

            {/* Step 2: Address */}
            {step === 2 && (
              <>
                <CardHeader>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-sm font-bold">2</div>
                    <CardTitle className="text-white">Address</CardTitle>
                  </div>
                  <CardDescription className="text-slate-400">Your current residential address.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-3">
                    <p className="text-xs font-semibold text-blue-200">Buyer geography lock</p>
                    <p className="mt-1 text-xs text-blue-100/80">
                      This buyer account is currently scoped to {geoScope.level === 'country' ? 'all Philippines regions, provinces, and cities/municipalities' : 'the saved admin coverage lock'}.
                      Source: {PSGC_VERSION_LABEL}.
                    </p>
                    <p className="mt-1 text-xs text-blue-100/60">
                      Storage: {geoScopePersistence === 'checking'
                        ? 'Checking...'
                        : geoScopePersistence === 'supabase'
                        ? 'Supabase persisted'
                        : 'Demo fallback'}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-slate-300">Region *</Label>
                      {allowedRegions.length <= 1 ? (
                        <div className="rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white">
                          {allowedRegions[0]?.name ?? 'No region configured'}
                        </div>
                      ) : (
                        <Select value={getRegionName(selectedRegionCode)} onValueChange={(value) => { if (value) selectRegion(allowedRegions.find((region) => region.name === value)?.code ?? '') }}>
                          <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                            <SelectValue placeholder="Select region" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-600">
                            {allowedRegions.map((region) => (
                              <SelectItem key={region.code} value={region.name} className="text-white hover:bg-slate-700">{region.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-slate-300">Province / Area *</Label>
                      <Select value={form.province} onValueChange={(value) => { if (value) selectProvince(value) }} disabled={allowedProvinces.length === 0}>
                        <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                          <SelectValue placeholder={allowedProvinces.length === 0 ? 'Not applicable' : 'Select province'} />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-600">
                          {allowedProvinces.map((province) => (
                            <SelectItem key={province.code} value={province.name} className="text-white hover:bg-slate-700">{province.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-slate-300">City / Municipality *</Label>
                      <Select value={selectedMunicipalityLabel} onValueChange={(value) => { if (value) selectMunicipality(value) }} disabled={municipalityOptions.length === 0}>
                        <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                          <SelectValue placeholder={form.provinceCode || metroLocalities.length > 0 ? 'Select city/municipality' : 'Select province first'} />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-600">
                          {municipalityOptions.map((municipality) => (
                            <SelectItem key={municipality.code} value={getLocalityLabel(municipality)} className="text-white hover:bg-slate-700">{getLocalityLabel(municipality)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">Barangay *</Label>
                    <Select value={form.barangay} onValueChange={(v) => { if (v) update('barangay', v) }} disabled={!form.municipalityCode}>
                      <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                        <SelectValue placeholder={form.municipalityCode ? 'Select barangay' : 'Select city/municipality first'} />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        {DEMO_BARANGAYS.map((b) => (
                          <SelectItem key={b.id} value={b.name} className="text-white hover:bg-slate-700">{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500">Barangays are still demo records; production should query PSGC barangays by selected city/municipality.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">Full Street Address *</Label>
                    <Input placeholder="House/Unit #, Street, Subdivision" value={form.address} onChange={(e) => update('address', e.target.value)} className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500" />
                  </div>
                </CardContent>
              </>
            )}

            {/* Step 3: ID Verification */}
            {step === 3 && (
              <>
                <CardHeader>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-sm font-bold">3</div>
                    <CardTitle className="text-white">ID Verification</CardTitle>
                  </div>
                  <CardDescription className="text-slate-400">Provide a valid government-issued ID.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">ID Type *</Label>
                    <Select value={form.id_type} onValueChange={(v) => { if (v) update('id_type', v) }}>
                      <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                        <SelectValue placeholder="Select ID type" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        {ID_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value} className="text-white hover:bg-slate-700">{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">ID Number *</Label>
                    <Input placeholder="Enter ID number" value={form.id_number} onChange={(e) => update('id_number', e.target.value)} className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {['Front of ID', 'Back of ID'].map((label) => (
                      <div key={label} className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center hover:border-slate-500 cursor-pointer transition-colors">
                        <Upload className="w-6 h-6 text-slate-500 mx-auto mb-2" />
                        <p className="text-xs text-slate-400">{label}</p>
                        <p className="text-xs text-slate-600 mt-1">Click to upload</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500">
                    Upload clear photos of your ID. Files should be JPG, PNG, or PDF, max 5MB each.
                  </p>
                </CardContent>
              </>
            )}

            {/* Step 4: Emergency Contact */}
            {step === 4 && (
              <>
                <CardHeader>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-sm font-bold">4</div>
                    <CardTitle className="text-white">Emergency Contact</CardTitle>
                  </div>
                  <CardDescription className="text-slate-400">Who should we contact if you&apos;re incapacitated?</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">Full Name *</Label>
                    <Input placeholder="Contact's full name" value={form.ec_name} onChange={(e) => update('ec_name', e.target.value)} className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">Phone Number *</Label>
                    <Input placeholder="09171234567" value={form.ec_phone} onChange={(e) => update('ec_phone', e.target.value)} className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">Relationship *</Label>
                    <Select value={form.ec_relationship} onValueChange={(v) => { if (v) update('ec_relationship', v) }}>
                      <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                        <SelectValue placeholder="Select relationship" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        {['Spouse', 'Parent', 'Child', 'Sibling', 'Relative', 'Friend', 'Other'].map((r) => (
                          <SelectItem key={r} value={r} className="text-white hover:bg-slate-700">{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </>
            )}

            {/* Step 5: Agreement */}
            {step === 5 && (
              <>
                <CardHeader>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-sm font-bold">5</div>
                    <CardTitle className="text-white">Agreement</CardTitle>
                  </div>
                  <CardDescription className="text-slate-400">Please read and agree to the following.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="bg-slate-800 rounded-lg p-4 text-xs text-slate-400 leading-relaxed max-h-40 overflow-y-auto">
                    <p className="font-semibold text-slate-300 mb-2">Privacy Policy Summary</p>
                    <p>
                      Emergency Rescue Portal collects your personal information for emergency response services.
                      Your name, contact details, location, address, and ID information are stored for verification,
                      dispatch coordination, and audit purposes. Authorized local emergency response personnel may use
                      this information only for legitimate safety, rescue, and incident follow-up work. You may request
                      access, correction, or deletion through the active portal administrator.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="privacy"
                      checked={form.privacy_agree}
                      onCheckedChange={(v) => update('privacy_agree', v === true)}
                      className="mt-0.5"
                    />
                    <Label htmlFor="privacy" className="text-sm text-slate-300 cursor-pointer leading-relaxed">
                      I have read and agree to the Privacy Policy and consent to the collection and processing
                      of my personal data for emergency r