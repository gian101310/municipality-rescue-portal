'use client'

import { useEffect, useState } from 'react'
import { Save, Plus, Edit2, Upload, Trash2, X, Check, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  PH_LOCALITIES,
  PH_PROVINCES,
  PH_REGIONS,
  getCountryForScope,
  getLocalitiesForProvince,
  getLocalityLabel,
  getProvinceName,
  getRegionName,
  getScopedLocalities,
  getScopedProvinces,
  makeTenantScope,
  PSGC_VERSION_LABEL,
} from '@/lib/philippines-geography'
import type { GeoScopeLevel } from '@/lib/philippines-geography'
import type { TenantGeographyScope } from '@/lib/philippines-geography'
import {
  getBuyerDetails,
  loadCoverageLock,
  saveCoverageLock,
} from '@/lib/coverage-lock-client'
import { getSettingsTabsForRole } from '@/lib/tenant-admin'
import { useSettings } from '@/lib/settings-context'
import { createClient } from '@/lib/supabase/client'
import { useMasterKey } from '@/components/master-key-provider'
import { toast } from 'sonner'
import { OperationsStaffSettings } from '@/components/admin/operations-staff-settings'

const SCOPE_LEVEL_LABELS: Record<GeoScopeLevel, string> = {
  country: 'Entire Philippines',
  region: 'Single Region',
  province: 'Single Province',
  municipality: 'Single City / Municipality',
}

export default function SettingsPage() {
  const { settings, updateSettings } = useSettings()
  const { isUnlocked } = useMasterKey()
  const [savingCoverage, setSavingCoverage] = useState(false)
  const [coveragePersistence, setCoveragePersistence] = useState<'checking' | 'supabase' | 'unavailable'>('checking')
  const [profileRole, setProfileRole] = useState<string | null>(null)
  const [orgName, setOrgName] = useState(settings.municipalityName)
  const [hotline, setHotline] = useState(settings.hotline)
  const [secondaryHotline, setSecondaryHotline] = useState(settings.secondaryHotline)
  const [localDescription, setLocalDescription] = useState('')
  const [dialect, setDialect] = useState('')
  const [email, setEmail] = useState(settings.email)
  const [province, setProvince] = useState('')
  const [region, setRegion] = useState('')
  const [municipality, setMunicipality] = useState('')
  const [mapLat, setMapLat] = useState(String(settings.mapCenterLat))
  const [mapLng, setMapLng] = useState(String(settings.mapCenterLng))
  const [scopeLevel, setScopeLevel] = useState<GeoScopeLevel>('country')
  const [scopeRegionCode, setScopeRegionCode] = useState('')
  const [scopeProvinceCode, setScopeProvinceCode] = useState('')
  const [scopeMunicipalityCode, setScopeMunicipalityCode] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [barangays, setBarangays] = useState<Array<{ id: string; name: string; captain_name: string | null; captain_phone: string | null }>>([])
  const [emergencyTypes, setEmergencyTypes] = useState<Array<{ id: string; name: string; icon: string; color: string; is_active: boolean; organization_id: string | null }>>([])

  const [editingBarangay, setEditingBarangay] = useState<{ id: string; name: string; captain_name: string; captain_phone: string } | null>(null)
  const [showAddBarangay, setShowAddBarangay] = useState(false)
  const [newBarangay, setNewBarangay] = useState({ name: '', captain_name: '', captain_phone: '' })
  const [showCsvImport, setShowCsvImport] = useState(false)
  const [csvText, setCsvText] = useState('')
  const [csvImporting, setCsvImporting] = useState(false)

  async function loadBarangays() { const response = await fetch('/api/admin/barangays'); const payload = await response.json().catch(() => ({})); if (response.ok) setBarangays(payload.barangays ?? []) }

  async function addBarangay() {
    if (!newBarangay.name.trim()) return toast.error('Barangay name is required.')
    const response = await fetch('/api/admin/barangays', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newBarangay) })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) return toast.error(payload.message ?? 'Unable to add barangay.')
    toast.success('Barangay added'); setShowAddBarangay(false); setNewBarangay({ name: '', captain_name: '', captain_phone: '' }); void loadBarangays()
  }

  async function saveBarangayEdit() {
    if (!editingBarangay) return
    const response = await fetch(`/api/admin/barangays/${editingBarangay.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: editingBarangay.name, captain_name: editingBarangay.captain_name, captain_phone: editingBarangay.captain_phone }) })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) return toast.error(payload.message ?? 'Unable to update barangay.')
    toast.success('Barangay updated'); setEditingBarangay(null); void loadBarangays()
  }

  async function deleteBarangay(id: string, name: string) {
    if (!confirm(`Delete barangay "${name}"? This cannot be undone.`)) return
    const response = await fetch(`/api/admin/barangays/${id}`, { method: 'DELETE' })
    if (!response.ok) { const p = await response.json().catch(() => ({})); return toast.error(p.message ?? 'Unable to delete.') }
    toast.success('Barangay deleted'); void loadBarangays()
  }

  async function importCsv() {
    if (!csvText.trim()) return toast.error('Paste CSV data first.')
    setCsvImporting(true)
    try {
      const response = await fetch('/api/admin/barangays/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ csv: csvText }) })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) return toast.error(payload.message ?? 'Import failed.')
      toast.success(`Imported ${payload.imported} barangay(s)${payload.skipped ? `, ${payload.skipped} skipped` : ''}`)
      if (payload.errors?.length) payload.errors.forEach((e: string) => toast.error(e))
      setShowCsvImport(false); setCsvText(''); void loadBarangays()
    } finally { setCsvImporting(false) }
  }

  useEffect(() => { const timer = window.setTimeout(() => { void loadBarangays() }, 0); return () => window.clearTimeout(timer) }, [])
  async function loadEmergencyTypes() { const response = await fetch('/api/admin/emergency-types'); const payload = await response.json().catch(() => ({})); if (response.ok) setEmergencyTypes(payload.emergencyTypes ?? []) }
  async function addEmergencyType() { const name = window.prompt('Emergency type name')?.trim(); if (!name) return; const response = await fetch('/api/admin/emergency-types', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) }); const payload = await response.json().catch(() => ({})); if (!response.ok) return toast.error(payload.message ?? 'Unable to add emergency type.'); toast.success('Custom emergency type added'); void loadEmergencyTypes() }
  useEffect(() => { const timer = window.setTimeout(() => { void loadEmergencyTypes() }, 0); return () => window.clearTimeout(timer) }, [])

  const currentScope = makeTenantScope(
    scopeLevel,
    scopeLevel === 'region'
      ? scopeRegionCode
      : scopeLevel === 'province'
      ? scopeProvinceCode
      : scopeLevel === 'municipality'
      ? scopeMunicipalityCode
      : undefined
  )
  const provinceOptions = scopeRegionCode
    ? PH_PROVINCES.filter((item) => item.regionCode === scopeRegionCode)
    : PH_PROVINCES
  const municipalityOptions = scopeProvinceCode
    ? getLocalitiesForProvince(scopeProvinceCode)
    : scopeRegionCode
    ? PH_LOCALITIES.filter((item) => item.regionCode === scopeRegionCode)
    : PH_LOCALITIES
  const coveredProvinces = getScopedProvinces(currentScope)
  const coveredLocalities = getScopedLocalities(currentScope)
  const selectedScopeLocality = PH_LOCALITIES.find((item) => item.code === scopeMunicipalityCode)
  const settingsTabs = getSettingsTabsForRole(profileRole)
  const canEditSettings = isUnlocked || profileRole === 'admin' || profileRole === 'super_admin'
  const currentCountry = getCountryForScope(currentScope)
  const scopeLabel = scopeLevel === 'country'
    ? (currentCountry === 'AE' ? 'Entire UAE' : 'Entire Philippines')
    : scopeLevel === 'region'
    ? getRegionName(scopeRegionCode)
    : scopeLevel === 'province'
    ? getProvinceName(scopeProvinceCode)
    : selectedScopeLocality
    ? getLocalityLabel(selectedScopeLocality)
    : ''
  const canSaveCoverage = scopeLevel === 'country'
    || (scopeLevel === 'region' && Boolean(scopeRegionCode))
    || (scopeLevel === 'province' && Boolean(scopeProvinceCode))
    || (scopeLevel === 'municipality' && Boolean(scopeMunicipalityCode))

  function applyCoverageScope(scope: TenantGeographyScope) {
    const details = getBuyerDetails(scope)

    setScopeLevel(scope.level)
    setScopeRegionCode(scope.regionCode ?? details.region?.code ?? '')
    setScopeProvinceCode(scope.provinceCode ?? details.province?.code ?? '')
    setScopeMunicipalityCode(scope.municipalityCode ?? '')
    setOrgName(details.organizationName)
    setProvince(details.provinceName || 'Philippines')
    setRegion(details.regionName || 'Philippines')
    setMunicipality(details.municipalityName || '')
    setMapLat(String(details.mapCenter.lat))
    setMapLng(String(details.mapCenter.lng))
  }

  useEffect(() => {
    let cancelled = false

    async function loadProfileRole() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', user.id)
        .single() as { data: { role: string } | null }

      if (!cancelled) setProfileRole(profile?.role ?? null)
    }

    async function loadSavedCoverageLock() {
      try {
        const result = await loadCoverageLock()
        if (cancelled) return
        applyCoverageScope(result.scope)
        setCoveragePersistence(result.persistence)
      } catch (error) {
        if (!cancelled) {
          setCoveragePersistence('unavailable')
          toast.error(error instanceof Error ? error.message : 'Coverage lock is unavailable.')
        }
      }
    }

    async function loadOrgSettings() {
      const res = await fetch('/api/admin/organization-settings')
      const payload = await res.json().catch(() => ({}))
      if (cancelled || !res.ok) return
      const s = payload.settings
      if (s?.name) setOrgName(s.name)
      setProvince(s?.province ?? '')
      setRegion(s?.region ?? '')
      if (s?.emergency_hotline) setHotline(s.emergency_hotline)
      setSecondaryHotline(s?.secondary_hotline ?? '')
      setEmail(s?.email ?? '')
      setMapLat(String(s?.map_center_lat ?? settings.mapCenterLat))
      setMapLng(String(s?.map_center_lng ?? settings.mapCenterLng))
      setLogoUrl(s?.logo_url ?? null)
      if (s?.branding?.localDescription) setLocalDescription(s.branding.localDescription)
      if (s?.branding?.dialect) setDialect(s.branding.dialect)
    }

    void loadProfileRole()
    loadSavedCoverageLock()
    void loadOrgSettings()

    return () => {
      cancelled = true
    }
  }, [settings.mapCenterLat, settings.mapCenterLng])

  async function uploadLogo(file: File) {
    if (!canEditSettings) return toast.error('Admin access is required to update the logo.')
    setLogoUploading(true)
    try {
      const form = new FormData()
      form.append('logo', file)
      const response = await fetch('/api/admin/organization-logo', { method: 'POST', body: form })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) return toast.error(payload.message ?? 'Unable to upload the logo.')
      setLogoUrl(payload.logo_url)
      toast.success('Organization logo updated')
    } finally {
      setLogoUploading(false)
    }
  }

  async function removeLogo() {
    if (!canEditSettings) return
    setLogoUploading(true)
    try {
      const response = await fetch('/api/admin/organization-logo', { method: 'DELETE' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) return toast.error(payload.message ?? 'Unable to remove the logo.')
      setLogoUrl(null)
      toast.success('Organization logo removed')
    } finally {
      setLogoUploading(false)
    }
  }

  async function save() {
    if (!canEditSettings) {
      toast.error('Unlock settings with the secret key first.')
      return
    }

    updateSettings({
      municipalityName: orgName,
      hotline,
      secondaryHotline,
      email,
      mapCenterLat: parseFloat(mapLat) || 0,
      mapCenterLng: parseFloat(mapLng) || 0,
    })
    const response = await fetch('/api/admin/organization-settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: orgName, emergency_hotline: hotline, secondary_hotline: secondaryHotline, email, map_center_lat: Number(mapLat), map_center_lng: Number(mapLng), localDescription, dialect }) })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) return toast.error(payload.message ?? 'Unable to save municipal contact settings.')
    toast.success('Municipal contact settings saved')
  }

  async function saveCoverage() {
    if (profileRole !== 'super_admin') {
      toast.error('Coverage lock can only be changed by the platform owner.')
      return
    }

    if (!canEditSettings) {
      toast.error('Unlock settings with the secret key first.')
      return
    }

    if (!canSaveCoverage) {
      toast.error('Choose the required location before saving.')
      return
    }

    setSavingCoverage(true)

    try {
      const result = await saveCoverageLock(currentScope)
      applyCoverageScope(result.scope)
      setCoveragePersistence(result.persistence)
      toast.success('Coverage lock saved to Supabase')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save coverage lock.')
    } finally {
      setSavingCoverage(false)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 text-sm">Organization configuration and system settings</p>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="bg-slate-800 border border-slate-700 flex-wrap h-auto gap-1">
          {settingsTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="data-[active]:bg-slate-700 data-[active]:text-white text-slate-400 text-sm">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* General */}
        <TabsContent value="general" className="mt-4">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-base">General Settings</CardTitle>
              <CardDescription className="text-slate-400">Basic organization information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-slate-300">Organization Name</Label>
                  <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} className="bg-slate-800 border-slate-600 text-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300">Province</Label>
                  <Input value={province} readOnly className="bg-slate-800 border-slate-600 text-slate-400 cursor-not-allowed" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300">Region</Label>
                  <Input value={region} readOnly className="bg-slate-800 border-slate-600 text-slate-400 cursor-not-allowed" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300">City / Municipality</Label>
                  <Input value={municipality} readOnly placeholder="Entire province / region" className="bg-slate-800 border-slate-600 text-slate-400 placeholder:text-slate-500 cursor-not-allowed" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300">Emergency Hotline</Label>
                  <Input value={hotline} onChange={(e) => setHotline(e.target.value)} className="bg-slate-800 border-slate-600 text-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300">Secondary Hotline</Label>
                  <Input value={secondaryHotline} onChange={(e) => setSecondaryHotline(e.target.value)} className="bg-slate-800 border-slate-600 text-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300">Email</Label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="bg-slate-800 border-slate-600 text-white" />
                </div>
              </div>
              <Separator className="bg-slate-800" />
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-300">QR Registration Page</h3>
                <p className="text-xs text-slate-500">These fields appear on the resident registration page when accessed via QR code poster.</p>
                <div className="space-y-1.5">
                  <Label className="text-slate-300">Local Description</Label>
                  <Input value={localDescription} onChange={(e) => setLocalDescription(e.target.value)} placeholder="e.g. Lungsod ng San Fernando — Serbisyong Pang-emerhensiya" className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500" />
                  <p className="text-xs text-slate-500">Shown on registration page when resident scans QR poster. Supports local language.</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300">Dialect / Language</Label>
                  <Input value={dialect} onChange={(e) => setDialect(e.target.value)} placeholder="e.g. Kapampangan, Tagalog, Cebuano" className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500" />
                </div>
              </div>
              <Separator className="bg-slate-800" />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-slate-300">Map Center Latitude</Label>
                  <Input value={mapLat} readOnly type="number" className="bg-slate-800 border-slate-600 text-slate-400 cursor-not-allowed" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300">Map Center Longitude</Label>
                  <Input value={mapLng} readOnly type="number" className="bg-slate-800 border-slate-600 text-slate-400 cursor-not-allowed" />
                </div>
              </div>
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-3">
                <p className="text-xs font-semibold text-blue-200">Location follows Coverage Lock</p>
                <p className="mt-1 text-xs text-blue-100/80">
                  Save a region, province, or city/municipality in Coverage Lock to update these General details and the live map focus.
                </p>
              </div>
              <div className="border-2 border-dashed border-slate-700 rounded-lg p-5 flex flex-col sm:flex-row items-center gap-4">
                <div
                  aria-label="Organization logo preview"
                  className="h-20 w-20 shrink-0 rounded-xl border border-slate-700 bg-slate-800 bg-contain bg-center bg-no-repeat"
                  style={logoUrl ? { backgroundImage: `url(${logoUrl})` } : undefined}
                />
                <div className="flex-1 text-center sm:text-left">
                  <p className="text-slate-300 text-sm font-medium">Organization logo</p>
                  <p className="text-slate-500 text-xs mt-1">PNG, JPEG, or WebP up to 2 MB.</p>
                  <div className="mt-3 flex flex-wrap justify-center sm:justify-start gap-2">
                    <Button disabled={!canEditSettings || logoUploading} size="sm" variant="outline" className="border-slate-600 text-slate-300" render={<label htmlFor="organization-logo" />}>
                      <Upload className="w-4 h-4 mr-1" /> {logoUploading ? 'Uploading…' : 'Choose logo'}
                    </Button>
                    {logoUrl && <Button disabled={!canEditSettings || logoUploading} size="sm" variant="ghost" className="text-red-400" onClick={() => void removeLogo()}><Trash2 className="w-4 h-4 mr-1" /> Remove</Button>}
                  </div>
                  <input id="organization-logo" type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={!canEditSettings || logoUploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadLogo(file); event.currentTarget.value = '' }} />
                </div>
              </div>
              <Button onClick={save} disabled={!canEditSettings} className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50">
                <Save className="w-4 h-4 mr-1" /> Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operations_staff" className="mt-4">
          <OperationsStaffSettings />
        </TabsContent>

        {/* Coverage Lock */}
        <TabsContent value="coverage_lock" className="mt-4">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-base">Coverage Lock</CardTitle>
              <CardDescription className="text-slate-400">Set the geography available to this buyer account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-slate-300">Buyer Coverage</Label>
                  <Select
                    value={SCOPE_LEVEL_LABELS[scopeLevel]}
                    onValueChange={(value) => {
                      if (!value) return
                      const nextLevel = (Object.entries(SCOPE_LEVEL_LABELS)
                        .find(([, label]) => label === value)?.[0] ?? 'country') as GeoScopeLevel
                      setScopeLevel(nextLevel)
                      if (nextLevel === 'country') {
                        setScopeRegionCode('')
                        setScopeProvinceCode('')
                        setScopeMunicipalityCode('')
                      }
                    }}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      {Object.values(SCOPE_LEVEL_LABELS).map((label) => (
                        <SelectItem key={label} value={label} className="text-white hover:bg-slate-700">{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-slate-300">Region</Label>
                  <Select
                    value={getRegionName(scopeRegionCode)}
                    onValueChange={(value) => {
                      if (!value) return
                      setScopeRegionCode(PH_REGIONS.find((item) => item.name === value)?.code ?? '')
                      setScopeProvinceCode('')
                      setScopeMunicipalityCode('')
                    }}
                    disabled={scopeLevel === 'country'}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      {PH_REGIONS.map((region) => (
                        <SelectItem key={region.code} value={region.name} className="text-white hover:bg-slate-700">{region.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-slate-300">Province</Label>
                  <Select
                    value={getProvinceName(scopeProvinceCode)}
                    onValueChange={(value) => {
                      if (!value) return
                      setScopeProvinceCode(provinceOptions.find((item) => item.name === value)?.code ?? '')
                      setScopeMunicipalityCode('')
                    }}
                    disabled={scopeLevel === 'country' || scopeLevel === 'region'}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                      <SelectValue placeholder="Select province" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      {provinceOptions.map((item) => (
                        <SelectItem key={item.code} value={item.name} className="text-white hover:bg-slate-700">{item.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-slate-300">City / Municipality</Label>
                  <Select
                    value={selectedScopeLocality ? getLocalityLabel(selectedScopeLocality) : ''}
                    onValueChange={(value) => {
                      if (!value) return
                      setScopeMunicipalityCode(municipalityOptions.find((item) => getLocalityLabel(item) === value)?.code ?? '')
                    }}
                    disabled={scopeLevel !== 'municipality'}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                      <SelectValue placeholder="Select city/municipality" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      {municipalityOptions.map((item) => (
                        <SelectItem key={item.code} value={getLocalityLabel(item)} className="text-white hover:bg-slate-700">{getLocalityLabel(item)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-lg bg-slate-800 p-3">
                  <p className="text-xs text-slate-500">Locked To</p>
                  <p className="mt-1 text-sm font-semibold text-white">{scopeLabel || 'Select coverage'}</p>
                </div>
                <div className="rounded-lg bg-slate-800 p-3">
                  <p className="text-xs text-slate-500">Provinces</p>
                  <p className="mt-1 text-xl font-bold text-blue-300">{coveredProvinces.length}</p>
                </div>
                <div className="rounded-lg bg-slate-800 p-3">
                  <p className="text-xs text-slate-500">Cities / Municipalities</p>
                  <p className="mt-1 text-xl font-bold text-green-300">{coveredLocalities.length}</p>
                </div>
              </div>

              <div className="rounded-lg border border-slate-700 bg-slate-950 p-3">
                <p className="text-xs font-medium text-slate-300">Dataset</p>
                <p className="mt-1 text-xs text-slate-500">{PSGC_VERSION_LABEL} · 18 regions · 82 provinces · 1,642 cities/municipalities</p>
                <p className="mt-1 text-xs text-slate-500">
                  Storage: {coveragePersistence === 'checking'
                    ? 'Checking...'
                    : coveragePersistence === 'supabase'
                    ? 'Supabase persisted'
                    : 'Unavailable — not saved'}
                </p>
              </div>

              <Button onClick={saveCoverage} disabled={savingCoverage || !canSaveCoverage || !canEditSettings || profileRole !== 'super_admin'} className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50">
                <Save className="w-4 h-4 mr-1" /> {savingCoverage ? 'Saving...' : 'Save Coverage'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Emergency Types */}
        <TabsContent value="emergency_types" className="mt-4">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white text-base">Emergency Types</CardTitle>
                  <CardDescription className="text-slate-400">Configure available emergency categories.</CardDescription>
                </div>
                <Button size="sm" disabled={!canEditSettings} className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50" onClick={() => void addEmergencyType()}>
                  <Plus className="w-4 h-4 mr-1" /> Add Type
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {emergencyTypes.map((et) => (
                  <div key={et.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ background: et.color }} />
                      <span className="text-sm text-white">{et.name}</span>
                      <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">{et.organization_id ? 'Custom' : 'Default'}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={et.is_active} disabled={!canEditSettings || !et.organization_id} onCheckedChange={async (is_active) => { if (!et.organization_id) return; await fetch(`/api/admin/emergency-types/${et.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...et, is_active }) }); void loadEmergencyTypes() }} />
                      <Button size="sm" variant="ghost" disabled={!canEditSettings || !et.organization_id} className="h-7 w-7 p-0 text-slate-400 hover:text-white disabled:opacity-50" onClick={() => toast.info('Custom type editing uses its live settings API; defaults are protected.')}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Barangays */}
        <TabsContent value="barangays" className="mt-4">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white text-base">Barangay Captains</CardTitle>
                  <CardDescription className="text-slate-400">Manage barangay list and captains. Download the template below for bulk import.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800" onClick={() => {
                    const csv = 'barangay_name,captain_name,captain_phone\nBarangay 1,Juan Dela Cruz,+639171234567\nBarangay 2,Maria Santos,+639181234567\n'
                    const blob = new Blob([csv], { type: 'text/csv' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a'); a.href = url; a.download = 'barangay_captains_template.csv'; a.click()
                    URL.revokeObjectURL(url)
                    toast.success('Template downloaded')
                  }}>
                    <Download className="w-4 h-4 mr-1" /> Download Template
                  </Button>
                  <Button size="sm" variant="outline" disabled={!canEditSettings} className="border-slate-600 text-slate-300 hover:bg-slate-800 disabled:opacity-50" onClick={() => { setShowCsvImport(true); setShowAddBarangay(false) }}>
                    <Upload className="w-4 h-4 mr-1" /> Import CSV
                  </Button>
                  <Button size="sm" disabled={!canEditSettings} className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50" onClick={() => { setShowAddBarangay(true); setShowCsvImport(false) }}>
                    <Plus className="w-4 h-4 mr-1" /> Add
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Add form */}
              {showAddBarangay && (
                <div className="p-3 bg-slate-800 rounded-lg border border-blue-600/50 space-y-2">
                  <p className="text-xs text-blue-400 font-medium">New Barangay</p>
                  <Input placeholder="Barangay name *" value={newBarangay.name} onChange={e => setNewBarangay(p => ({ ...p, name: e.target.value }))} className="bg-slate-700 border-slate-600 text-white text-sm" />
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Captain name" value={newBarangay.captain_name} onChange={e => setNewBarangay(p => ({ ...p, captain_name: e.target.value }))} className="bg-slate-700 border-slate-600 text-white text-sm" />
                    <Input placeholder="Captain phone" value={newBarangay.captain_phone} onChange={e => setNewBarangay(p => ({ ...p, captain_phone: e.target.value }))} className="bg-slate-700 border-slate-600 text-white text-sm" />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="ghost" className="text-slate-400" onClick={() => setShowAddBarangay(false)}><X className="w-3.5 h-3.5 mr-1" /> Cancel</Button>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => void addBarangay()}><Check className="w-3.5 h-3.5 mr-1" /> Save</Button>
                  </div>
                </div>
              )}

              {/* CSV Import */}
              {showCsvImport && (
                <div className="p-3 bg-slate-800 rounded-lg border border-emerald-600/50 space-y-2">
                  <p className="text-xs text-emerald-400 font-medium">Bulk CSV Import</p>
                  <p className="text-xs text-slate-400">Paste CSV with columns: name, captain_name, captain_phone (header row required)</p>
                  <textarea
                    rows={6}
                    placeholder={"name,captain_name,captain_phone\nBarangay San Jose,Juan Dela Cruz,09171234567\nBarangay Poblacion,Maria Santos,09181234567"}
                    value={csvText}
                    onChange={e => setCsvText(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 text-white text-xs rounded-md p-2 font-mono resize-y"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="ghost" className="text-slate-400" onClick={() => { setShowCsvImport(false); setCsvText('') }}><X className="w-3.5 h-3.5 mr-1" /> Cancel</Button>
                    <Button size="sm" disabled={csvImporting} className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => void importCsv()}>
                      <Upload className="w-3.5 h-3.5 mr-1" /> {csvImporting ? 'Importing…' : 'Import'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Barangay list */}
              <div className="space-y-2">
                {barangays.length === 0 && <p className="text-sm text-slate-500 text-center py-6">No barangays yet. Add individually or import from CSV.</p>}
                {barangays.map((b) => (
                  <div key={b.id} className="p-3 bg-slate-800 rounded-lg">
                    {editingBarangay?.id === b.id ? (
                      <div className="space-y-2">
                        <Input value={editingBarangay.name} onChange={e => setEditingBarangay(p => p ? { ...p, name: e.target.value } : p)} className="bg-slate-700 border-slate-600 text-white text-sm" placeholder="Barangay name" />
                        <div className="grid grid-cols-2 gap-2">
                          <Input value={editingBarangay.captain_name} onChange={e => setEditingBarangay(p => p ? { ...p, captain_name: e.target.value } : p)} className="bg-slate-700 border-slate-600 text-white text-sm" placeholder="Captain name" />
                          <Input value={editingBarangay.captain_phone} onChange={e => setEditingBarangay(p => p ? { ...p, captain_phone: e.target.value } : p)} className="bg-slate-700 border-slate-600 text-white text-sm" placeholder="Captain phone" />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="ghost" className="text-slate-400" onClick={() => setEditingBarangay(null)}><X className="w-3.5 h-3.5 mr-1" /> Cancel</Button>
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => void saveBarangayEdit()}><Check className="w-3.5 h-3.5 mr-1" /> Save</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-white">{b.name}</p>
                          <p className="text-xs text-slate-400">{b.captain_name || '—'} · {b.captain_phone || '—'}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" disabled={!canEditSettings} className="h-7 w-7 p-0 text-slate-400 hover:text-white disabled:opacity-50" onClick={() => setEditingBarangay({ id: b.id, name: b.name, captain_name: b.captain_name ?? '', captain_phone: b.captain_phone ?? '' })}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" disabled={!canEditSettings} className="h-7 w-7 p-0 text-slate-400 hover:text-red-400 disabled:opacity-50" onClick={() => void deleteBarangay(b.id, b.name)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {barangays.length > 0 && <p className="text-xs text-slate-500 text-right">{barangays.length} barangay(s)</p>}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  )
}
