'use client'

import {
  COVERAGE_LOCK_GEOCODE_STORAGE_KEY,
  COVERAGE_LOCK_STORAGE_KEY,
  DEMO_TENANT_GEO_SCOPE,
  getFallbackMapCenter,
  getScopeGeocodeQuery,
  getScopeLocationDetails,
} from '@/lib/philippines-geography'
import type { TenantGeographyScope } from '@/lib/philippines-geography'

export const COVERAGE_LOCK_CHANGED_EVENT = 'coverage-lock-changed'

export type CoveragePersistence = 'checking' | 'supabase' | 'demo'

export function readLocalCoverageLock() {
  try {
    const stored = window.localStorage.getItem(COVERAGE_LOCK_STORAGE_KEY)
    return stored ? JSON.parse(stored) as TenantGeographyScope : null
  } catch {
    return null
  }
}

export function writeLocalCoverageLock(scope: TenantGeographyScope) {
  window.localStorage.setItem(COVERAGE_LOCK_STORAGE_KEY, JSON.stringify(scope))
  window.dispatchEvent(new CustomEvent(COVERAGE_LOCK_CHANGED_EVENT, { detail: scope }))
}

export async function loadCoverageLock() {
  try {
    const response = await fetch('/api/coverage-lock', { cache: 'no-store' })
    const payload = await response.json()

    if (response.ok && payload.scope) {
      return {
        scope: payload.scope as TenantGeographyScope,
        persistence: 'supabase' as CoveragePersistence,
      }
    }
  } catch {
    // Local fallback below keeps the demo usable without configured Supabase.
  }

  return {
    scope: readLocalCoverageLock() ?? DEMO_TENANT_GEO_SCOPE,
    persistence: 'demo' as CoveragePersistence,
  }
}

export async function saveCoverageLock(scope: TenantGeographyScope) {
  try {
    const response = await fetch('/api/coverage-lock', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope }),
    })
    const payload = await response.json()

    if (!response.ok) {
      throw new Error(payload.message ?? 'Unable to save coverage lock.')
    }

    return {
      scope: payload.scope as TenantGeographyScope,
      persistence: 'supabase' as CoveragePersistence,
    }
  } catch {
    writeLocalCoverageLock(scope)
    return {
      scope,
      persistence: 'demo' as CoveragePersistence,
    }
  }
}

export function getBuyerDetails(scope: TenantGeographyScope) {
  const details = getScopeLocationDetails(scope)
  const map = getFallbackMapCenter(scope)

  return {
    ...details,
    mapCenter: map.center,
    mapZoom: map.zoom,
    address: details.locality
      ? `${details.locality.name}, ${details.provinceName}`
      : details.province
      ? details.province.name
      : details.regionName || 'Philippines',
  }
}

type CachedGeocode = {
  lat: number
  lng: number
}

function readGeocodeCache() {
  try {
    const stored = window.localStorage.getItem(COVERAGE_LOCK_GEOCODE_STORAGE_KEY)
    return stored ? JSON.parse(stored) as Record<string, CachedGeocode> : {}
  } catch {
    return {}
  }
}

function writeGeocodeCache(cache: Record<string, CachedGeocode>) {
  window.localStorage.setItem(COVERAGE_LOCK_GEOCODE_STORAGE_KEY, JSON.stringify(cache))
}

export async function resolveCoverageMapFocus(scope: TenantGeographyScope) {
  const fallback = getFallbackMapCenter(scope)
  const query = getScopeGeocodeQuery(scope)
  const cache = readGeocodeCache()

  if (cache[query]) {
    return { center: cache[query], zoom: fallback.zoom, source: 'cache' as const, query }
  }

  try {
    const params = new URLSearchParams({
      format: 'jsonv2',
      limit: '1',
      q: query,
    })
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: { Accept: 'application/json' },
    })
    const results = await response.json() as Array<{ lat?: string; lon?: string }>
    const first = results[0]

    if (first?.lat && first?.lon) {
      const center = { lat: Number(first.lat), lng: Number(first.lon) }
      writeGeocodeCache({ ...cache, [query]: center })
      return { center, zoom: fallback.zoom, source: 'geocoded' as const, query }
    }
  } catch {
    // Map can still focus on the regional fallback center.
  }

  return { center: fallback.center, zoom: fallback.zoom, source: 'fallback' as const, query }
}
