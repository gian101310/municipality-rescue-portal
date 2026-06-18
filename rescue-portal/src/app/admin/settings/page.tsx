'use client'

import { useEffect, useState } from 'react'
import { Save, Plus, Edit2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DEMO_ORGANIZATION, DEMO_EMERGENCY_TYPES, DEMO_BARANGAYS } from '@/lib/demo-data'
import {
  DEMO_TENANT_GEO_SCOPE,
  PH_LOCALITIES,
  PH_PROVINCES,
  PH_REGIONS,
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
import { useSettings } from '@/lib/settings-context'
import { toast } from 'sonner'

const SCOPE_LEVEL_LABELS: Record<GeoScopeLevel, string> = {
  country: 'Entire Philippines',
  region: 'Single Region',
  province: 'Single Province',
  municipality: 'Single City / Municipality',
}

export default function SettingsPage() {
  const { settings, updateSettings } = useSettings()
  const [showToken, setShowToken] = useState(false)
  const [savingCoverage, setSavingCoverage] = useState(false)
  const [coveragePersistence, setCoveragePersistence] = useState<'checking' | 'supabase' | 'demo'>('checking')
  const [orgName, setOrgName] = useState(settings.municipalityName || DEMO_ORGANIZATION.name)
  const [hotline, setHotline] = useState(settings.hotline || DEMO_ORGANIZATION.emergency_hotline)
  const [secondaryHotline, setSecondaryHotline] = useState(settings.secondaryHotline || DEMO_ORGANIZATION.secondary_hotline || '')
  const [email, setEmail] = useState(settings.email || DEMO_ORGANIZATION.email || '')
  const [province, setProvince] = useState(DEMO_ORGANIZATION.province)
  const [region, setRegion] = useState(DEMO_ORGANIZATION.region)
  const [municipality, setMunicipality] = useState('Bayani')
  const [mapLat, setMapLat] = useState(String(settings.mapCenterLat || DEMO_ORGANIZATION.map_center.lat))
  const [mapLng, setMapLng] = useState(String(settings.mapCenterLng || DEMO_ORGANIZATION.map_center.lng))
  const [scopeLevel, setScopeLevel] = useState<GeoScopeLevel>(DEMO_TENANT_GEO_SCOPE.level)
  const [scopeRegionCode, setScopeRegionCode] = useState(DEMO_TENANT_GEO_SCOPE.regionCode ?? '')
  const [scopeProvinceCode, setScopeProvinceCode] = useState(DEMO_TENANT_GEO_SCOPE.provinceCode ?? '')
  const [scopeMunicipalityCode, setScopeMunicipalityCode] = useState(DEMO_TENANT_GEO_SCOPE.municipalityCode ?? '')

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
  const scopeLabel = scopeLevel === 'country'
    ? 'Entire Philippines'
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

    async function loadSavedCoverageLock() {
      const result = await loadCoverageLock()
      if (cancelled) return

      applyCoverageScope(result.scope)
      setCoveragePersistence(result.persistence)
    }

    loadSavedCoverageLock()

    return () => {
      cancelled = true
    }
  }, [])

  function save() {
    updateSettings({
      municipalityName: orgName,
      hotline,
      secondaryHotline,
      email,
      mapCenterLat: parseFloat(mapLat) || 0,
      mapCenterLng: parseFloat(mapLng) || 0,
    })
    toast.success('Settings saved — changes reflected across the portal')
  }

  async function saveCoverage() {
    if (!canSaveCoverage) {
      toast.error('Choose the required location before saving.')
      return
    }

    setSavingCoverage(true)

    try {
      const result = await saveCoverageLock(currentScope)
      applyCoverageScope(result.scope)
      setCoveragePersistence(result.persistence)
      toast.success(result.persistence === 'supabase'
        ? 'Coverage lock saved to Supabase'
        : 'Coverage lock saved for testing')
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
          {['General', 'Coverage Lock', 'Emergency Types', 'Barangays', 'Telegram', 'Notifications'].map((t) => (
            <TabsTrigger key={t} value={t.toLowerCase().replace(' ', '_')} className="data-[active]:bg-slate-700 data-[active]:text-white text-slate-400 text-sm">
              {t}
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
                  <Input value={province} onChange={(e) => setProvince(e.target.value)} className="bg-slate-800 border-slate-600 text-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300">Region</Label>
                  <Input value={region} onChange={(e) => setRegion(e.target.value)} className="bg-slate-800 border-slate-600 text-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300">City / Municipality</Label>
                  <Input value={municipality} onChange={(e) => setMunicipality(e.target.value)} placeholder="Entire province / region" className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500" />
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-slate-300">Map Center Latitude</Label>
                  <Input value={mapLat} onChange={(e) => setMapLat(e.target.value)} type="number" className="bg-slate-800 border-slate-600 text-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300">Map Center Longitude</Label>
                  <Input value={mapLng} onChange={(e) => setMapLng(e.target.value)} type="number" className="bg-slate-800 border-slate-600 text-white" />
                </div>
              </div>
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-3">
                <p className="text-xs font-semibold text-blue-200">Location follows Coverage Lock</p>
                <p className="mt-1 text-xs text-blue-100/80">
                  Save a region, province, or city/municipality in Coverage Lock to update these General details and the live map focus.
                </p>
              </div>
              <div className="border-2 border-dashed border-slate-700 rounded-lg p-8 text-center">
                <p className="text-slate-500 text-sm">Logo Upload</p>
                <p className="text-slate-600 text-xs mt-1">Click to upload organization logo (PNG, SVG)</p>
              </div>
              <Button onClick={save} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Save className="w-4 h-4 mr-1" /> Save Changes
              </Button>
            </CardContent>
          </Card>
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
                    : 'Demo fallback'}
                </p>
              </div>

              <Button onClick={saveCoverage} disabled={savingCoverage || !canSaveCoverage} className="bg-blue-600 hover:bg-blue-700 text-white">
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
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => toast.info('Demo: Add type dialog')}>
                  <Plus className="w-4 h-4 mr-1" /> Add Type
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {DEMO_EMERGENCY_TYPES.map((et) => (
                  <div key={et.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ background: et.color }} />
                      <span className="text-sm text-white">{et.name}</span>
                      <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">{et.triage_questions.length} questions</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={et.is_active} onCheckedChange={() => toast.info('Demo: Toggle type')} />
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-white" onClick={() => toast.info('Demo: Edit type')}>
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
                  <CardTitle className="text-white text-base">Barangays</CardTitle>
                  <CardDescription className="text-slate-400">Manage barangay list and captains.</CardDescription>
                </div>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => toast.info('Demo: Add barangay')}>
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {DEMO_BARANGAYS.map((b) => (
                  <div key={b.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                    <div>
                      <p className="text-sm text-white">{b.name}</p>
                      <p className="text-xs text-slate-400">{b.captain_name} · {b.captain_phone}</p>
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-white" onClick={() => toast.info('Demo: Edit barangay')}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Telegram */}
        <TabsContent value="telegram" className="mt-4">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-base">Telegram Integration</CardTitle>
              <CardDescription className="text-slate-400">Configure Telegram bot for team notifications.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-slate-300">Bot Token</Label>
                <div className="relative">
                  <Input
                    type={showToken ? 'text' : 'password'}
                    defaultValue="1234567890:ABCDefGHIjklMNOpqRSTuvWXyz"
                    className="bg-slate-800 border-slate-600 text-white pr-10"
                  />
                  <button
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-slate-500">Get your bot token from @BotFather on Telegram</p>
              </div>
              <Separator className="bg-slate-800" />
              <div>
                <p className="text-sm text-slate-300 mb-2">Team Chat IDs</p>
                <div className="space-y-2">
                  {['-1001000000001', '-1001000000002', '-1001000000003', '-1001000000004'].map((id, idx) => (
                    <div key={id} className="flex items-center gap-3 p-2.5 bg-slate-800 rounded-lg">
                      <span className="text-xs font-mono text-slate-300">{id}</span>
                      <span className="text-xs text-slate-500">Team {['Alpha', 'Bravo', 'Charlie', 'Delta'][idx]}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => toast.success('Demo: Test message sent to all chats')} className="bg-blue-600 hover:bg-blue-700 text-white">
                  Test Connection
                </Button>
                <Button onClick={save} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800">
                  <Save className="w-4 h-4 mr-1" /> Save
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="mt-4">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-base">Notification Settings</CardTitle>
              <CardDescription className="text-slate-400">Configure when and how notifications are sent.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: 'New incident submitted', desc: 'Alert dispatchers when a new incident is received', on: true },
                { label: 'Critical incident alert', desc: 'Send urgent notifications for critical severity incidents', on: true },
                { label: 'Team dispatch confirmation', desc: 'Notify reporter when a rescue team is dispatched', on: true },
                { label: 'Incident resolved', desc: 'Notify reporter when their incident is resolved', on: true },
                { label: 'Registration approved', desc: 'Notify resident when their account is verified', on: true },
                { label: 'Registration rejected', desc: 'Notify resident when their account is rejected', on: false },
                { label: 'Team status updates', desc: 'Notify dispatcher when team status changes', on: true },
                { label: 'System health alerts', desc: 'Alert admins when system health degrades', on: false },
              ].map((item) => (
                <div key={item.label} className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-white">{item.label}</p>
                    <p className="text-xs text-slate-400">{item.desc}</p>
                  </div>
                  <Switch defaultChecked={item.on} onCheckedChange={() => toast.info('Demo: Toggle notification')} />
                </div>
              ))}
              <Button onClick={save} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Save className="w-4 h-4 mr-1" /> Save Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
