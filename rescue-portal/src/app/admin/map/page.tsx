'use client'

import { useEffect, useMemo, useState } from 'react'
import { Crosshair, MapPin, Filter, RefreshCw, Radio } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MapView } from '@/components/map-view'
import { IncidentStatusBadge } from '@/components/incident-status-badge'
import { SeverityBadge } from '@/components/severity-badge'
import { EmergencyTypeIcon } from '@/components/emergency-type-icon'
import { DEMO_RESCUE_UNITS } from '@/lib/demo-data'
import { formatRelativeTime, getSeverityHexColor } from '@/lib/utils'
import { isActiveStatus } from '@/lib/utils'
import {
  COVERAGE_LOCK_CHANGED_EVENT,
  getBuyerDetails,
  loadCoverageLock,
  resolveCoverageMapFocus,
} from '@/lib/coverage-lock-client'
import { DEMO_TENANT_GEO_SCOPE } from '@/lib/philippines-geography'
import type { TenantGeographyScope } from '@/lib/philippines-geography'
import Link from 'next/link'
import type { DemoIncident } from '@/lib/types'
import { toast } from 'sonner'

function deterministicOffset(seed: string, axis: 'lat' | 'lng') {
  const input = `${seed}:${axis}`
  let hash = 0

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0
  }

  return ((hash % 1000) / 1000 - 0.5) * 0.035
}

export default function LiveMapPage() {
  const [selectedIncident, setSelectedIncident] = useState<DemoIncident | null>(null)
  const [filterSeverity, setFilterSeverity] = useState<string>('all')
  const [refreshing, setRefreshing] = useState(false)
  const [coverageScope, setCoverageScope] = useState<TenantGeographyScope>(DEMO_TENANT_GEO_SCOPE)
  const [mapCenter, setMapCenter] = useState({ lat: 12.8797, lng: 121.7740 })
  const [mapZoom, setMapZoom] = useState(6)
  const [focusSource, setFocusSource] = useState('Loading focus')
  const [incidents, setIncidents] = useState<DemoIncident[]>([])
  const [loadingIncidents, setLoadingIncidents] = useState(true)

  const activeIncidents = incidents.filter((i) => isActiveStatus(i.status))
  const filteredIncidents = activeIncidents.filter((i) =>
    filterSeverity === 'all' || i.severity === filterSeverity
  )

  const buyerDetails = getBuyerDetails(coverageScope)

  useEffect(() => {
    let cancelled = false

    async function applyScope(scope: TenantGeographyScope) {
      setCoverageScope(scope)
      const focus = await resolveCoverageMapFocus(scope)
      if (cancelled) return

      setMapCenter(focus.center)
      setMapZoom(focus.zoom)
      setFocusSource(focus.source === 'geocoded'
        ? 'Focused from map search'
        : focus.source === 'cache'
        ? 'Focused from saved map search'
        : 'Focused from regional fallback')
    }

    async function loadFocus() {
      const result = await loadCoverageLock()
      await applyScope(result.scope)
    }

    function handleCoverageChange(event: Event) {
      const customEvent = event as CustomEvent<TenantGeographyScope>
      if (customEvent.detail) void applyScope(customEvent.detail)
    }

    loadFocus()
    window.addEventListener(COVERAGE_LOCK_CHANGED_EVENT, handleCoverageChange)

    return () => {
      cancelled = true
      window.removeEventListener(COVERAGE_LOCK_CHANGED_EVENT, handleCoverageChange)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/admin/incidents', { cache: 'no-store' })
        const payload = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(payload?.message ?? 'Unable to load incidents.')
        }

        setIncidents((payload?.incidents ?? []) as DemoIncident[])
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Unable to load incidents.')
        setIncidents([])
      } finally {
        setLoadingIncidents(false)
      }
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  const markers = useMemo(() => [
    {
      id: 'coverage-focus',
      lat: mapCenter.lat,
      lng: mapCenter.lng,
      color: '#38bdf8',
      label: `Focus: ${buyerDetails.locationName}`,
    },
    ...filteredIncidents.map((inc) => ({
      id: inc.id,
      lat: typeof inc.latitude === 'number' ? inc.latitude : mapCenter.lat + deterministicOffset(inc.id, 'lat'),
      lng: typeof inc.longitude === 'number' ? inc.longitude : mapCenter.lng + deterministicOffset(inc.id, 'lng'),
      color: getSeverityHexColor(inc.severity),
      label: inc.reference_number,
      severity: inc.severity,
    })),
  ], [buyerDetails.locationName, filteredIncidents, mapCenter.lat, mapCenter.lng])

  async function handleRefresh() {
    setRefreshing(true)
    await new Promise((r) => setTimeout(r, 1200))
    setRefreshing(false)
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MapPin className="w-6 h-6 text-blue-400" />
            Live Incident Map
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Focused on {buyerDetails.locationName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 animate-pulse">
            <Radio className="w-3 h-3 mr-1" /> LIVE
          </Badge>
          <Button
            size="sm"
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-slate-400" />
        <Select value={filterSeverity} onValueChange={(v) => { if (v) setFilterSeverity(v) }}>
          <SelectTrigger className="w-40 bg-slate-800 border-slate-600 text-slate-200 h-8">
            <SelectValue placeholder="All Severities" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-600">
            <SelectItem value="all" className="text-slate-200">All Severities</SelectItem>
            <SelectItem value="critical" className="text-red-400">Critical</SelectItem>
            <SelectItem value="high" className="text-orange-400">High</SelectItem>
            <SelectItem value="medium" className="text-yellow-400">Medium</SelectItem>
            <SelectItem value="low" className="text-green-400">Low</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-slate-400 text-sm">
          {loadingIncidents ? 'Loading incidents...' : `${filteredIncidents.length} active incident${filteredIncidents.length !== 1 ? 's' : ''}`}
        </span>
        <Badge variant="outline" className="border-blue-500/30 text-blue-300 bg-blue-500/10">
          <Crosshair className="w-3 h-3 mr-1" />
          {focusSource}
        </Badge>
      </div>

      {/* Map + Sidebar layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Map */}
        <div className="lg:col-span-2">
          <Card className="bg-slate-900 border-slate-700 overflow-hidden">
            <MapView
              center={mapCenter}
              zoom={mapZoom}
              markers={markers}
              selectedMarkerId={selectedIncident?.id}
              onMarkerClick={(id) => {
                const inc = filteredIncidents.find((i) => i.id === id)
                setSelectedIncident(inc ?? null)
              }}
              height="520px"
              className="w-full"
            />
          </Card>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 px-1">
            {[
              { color: '#ef4444', label: 'Critical' },
              { color: '#f97316', label: 'High' },
              { color: '#eab308', label: 'Medium' },
              { color: '#22c55e', label: 'Low' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-xs text-slate-400">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Incident list sidebar */}
        <div className="space-y-3">
          {/* Selected incident detail */}
          {selectedIncident && (
            <Card className="bg-blue-950/50 border-blue-500/40">
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-sm text-blue-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  Selected Incident
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-2">
                <div className="flex items-center gap-2">
                  <EmergencyTypeIcon
                    iconName={selectedIncident.emergency_type?.icon ?? 'AlertTriangle'}
                    className="w-4 h-4 shrink-0"
                    style={{ color: selectedIncident.emergency_type?.color ?? '#6b7280' }}
                  />
                  <span className="text-sm font-semibold text-white">{selectedIncident.emergency_type?.name}</span>
                </div>
                <p className="text-xs font-mono text-slate-300">{selectedIncident.reference_number}</p>
                <div className="flex gap-2">
                  <IncidentStatusBadge status={selectedIncident.status} />
                  <SeverityBadge severity={selectedIncident.severity} />
                </div>
                <p className="text-xs text-slate-400">{selectedIncident.address || selectedIncident.barangay}</p>
                <p className="text-xs text-slate-500">{formatRelativeTime(selectedIncident.created_at)}</p>
                <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white h-7 text-xs mt-1" render={<Link href={`/admin/incidents/${selectedIncident.id}`} />}>
                  View Details
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Active incidents list */}
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-sm text-slate-300">Active Incidents</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 space-y-2">
              {filteredIncidents.length === 0 && (
                <p className="text-slate-500 text-xs text-center py-4">No active incidents</p>
              )}
              {filteredIncidents.map((inc) => (
                <button
                  key={inc.id}
                  onClick={() => setSelectedIncident(selectedIncident?.id === inc.id ? null : inc)}
                  className={`w-full text-left p-2.5 rounded-lg border transition-colors ${
                    selectedIncident?.id === inc.id
                      ? 'border-blue-500/50 bg-blue-950/30'
                      : 'border-slate-700 bg-slate-800/50 hover:bg-slate-700/50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div
                      className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                      style={{ backgroundColor: getSeverityHexColor(inc.severity) }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-200 truncate">{inc.emergency_type.name}</p>
                      <p className="text-xs text-slate-500 font-mono">{inc.reference_number}</p>
                      <p className="text-xs text-slate-500 truncate">{inc.barangay}</p>
                    </div>
                    <IncidentStatusBadge status={inc.status} />
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Rescue units */}
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-sm text-slate-300">Rescue Units</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 space-y-2">
              {DEMO_RESCUE_UNITS.map((unit) => (
                <div key={unit.id} className="flex items-center justify-between p-2 bg-slate-800 rounded-lg">
                  <div>
                    <p className="text-xs font-semibold text-slate-200">{unit.code}</p>
                    <p className="text-xs text-slate-500 truncate max-w-[120px]">{unit.team_leader_name}</p>
                  </div>
                  <Badge
                    className={`text-xs border-0 ${
                      unit.status === 'available'
                        ? 'bg-green-500/20 text-green-400'
                        : unit.status === 'dispatched'
                        ? 'bg-amber-500/20 text-amber-400'
                        : unit.status === 'on_scene'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-slate-600/40 text-slate-400'
                    }`}
                  >
                    {unit.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
