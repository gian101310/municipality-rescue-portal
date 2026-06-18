'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check, Shield, Upload } from 'lucide-react'
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
import { generateDemoReferenceNumber } from '@/lib/utils'
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
  const [geoScope, setGeoScope] = useState<TenantGeographyScope>(DEMO_TENANT_GEO_SCOPE)
  const [geoScopePersistence, setGeoScopePersistence] = useState<'checking' | 'supabase' | 'demo'>('checking')
  const [form, setForm] = useState<FormData>({
    full_name: '', phone: '', email: '', date_of_birth: '',
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
    if (step < TOTAL_STEPS) setStep((s) => s + 1)
  }
  function back() {
    if (step > 1) setStep((s) => s - 1)
  }

  async function submit() {
    setSubmitting(true)
    await new Promise((r) => setTimeout(r, 1500))
    const ref = generateDemoReferenceNumber()
    setRefNumber(ref)
    setStep(6)
    setSubmitting(false)
    toast.success('Registration submitted successfully!')
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
                      The Municipality of Bayani Rescue Portal collects your personal information for the purpose of
                      providing emergency response services. Your data including name, contact details, location, and
                      ID information will be stored securely and used only for emergency coordination.
                      We do not share your information with third parties except as required by law or for emergency coordination
                      with authorized agencies. You have the right to request access, correction, or deletion of your data
                      by contacting the Municipal Rescue Office.
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
                      of my personal data for emergency response purposes.
                    </Label>
                  </div>

                  <div className="bg-red-900/20 border border-red-800/40 rounded-lg p-4">
                    <p className="text-sm font-semibold text-red-300 mb-1">False Alert Warning</p>
                    <p className="text-xs text-slate-400">
                      Filing false emergency reports is a criminal offense under Philippine law.
                      Violations may result in fines, community service, or imprisonment, and may
                      divert resources from real emergencies.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="false_alert"
                      checked={form.false_alert_agree}
                      onCheckedChange={(v) => update('false_alert_agree', v === true)}
                      className="mt-0.5"
                    />
                    <Label htmlFor="false_alert" className="text-sm text-slate-300 cursor-pointer leading-relaxed">
                      I understand that filing false emergency reports is illegal and I will only
                      use this system for genuine emergencies.
                    </Label>
                  </div>
                </CardContent>
              </>
            )}

            {/* Step 6: Success */}
            {step === 6 && (
              <CardContent className="py-10 text-center">
                <div className="w-16 h-16 rounded-full bg-green-600/20 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Registration Submitted!</h2>
                <p className="text-slate-400 text-sm mb-4">
                  Your registration has been received and is pending verification by our team.
                </p>
                <div className="bg-slate-800 rounded-lg p-4 mb-6">
                  <p className="text-xs text-slate-400 mb-1">Reference Number</p>
                  <p className="text-lg font-mono font-bold text-white">{refNumber}</p>
                </div>
                <p className="text-xs text-slate-500 mb-6">
                  You will be notified via SMS once your account is verified. This typically takes 1–3 business days.
                </p>
                <Button className="w-full bg-red-600 hover:bg-red-700 text-white" render={<Link href="/auth/login?role=resident" />}>
                  Go to Login
                </Button>
              </CardContent>
            )}

            {/* Navigation Buttons */}
            {step < 6 && (
              <div className="flex items-center justify-between px-6 pb-6">
                <Button variant="outline" onClick={back} disabled={step === 1} className="border-slate-600 text-slate-300 hover:bg-slate-800">
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
                {step < 5 ? (
                  <Button onClick={next} className="bg-blue-600 hover:bg-blue-700 text-white">
                    Next
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                ) : (
                  <Button
                    onClick={submit}
                    disabled={!form.privacy_agree || !form.false_alert_agree || submitting}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Submitting...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Submit Registration
                      </span>
                    )}
                  </Button>
                )}
              </div>
            )}
        </Card>
        </div>
      </div>
    </div>
  )
}
