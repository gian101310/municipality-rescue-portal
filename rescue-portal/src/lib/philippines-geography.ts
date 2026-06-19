import geographyData from './philippines-geography-data.json'

export type GeoScopeLevel = 'country' | 'region' | 'province' | 'municipality'

export interface RegionOption {
  code: string
  name: string
}

export interface ProvinceOption {
  code: string
  name: string
  regionCode: string
}

export interface LocalityOption {
  code: string
  name: string
  type: 'city' | 'municipality'
  cityClass: string | null
  regionCode: string
  provinceCode: string | null
}

export interface TenantGeographyScope {
  level: GeoScopeLevel
  regionCode?: string
  provinceCode?: string
  municipalityCode?: string
}

export const PSGC_VERSION_LABEL = geographyData.versionLabel
export const COVERAGE_LOCK_STORAGE_KEY = 'rescue-portal.coverage-lock'
export const COVERAGE_LOCK_GEOCODE_STORAGE_KEY = 'rescue-portal.coverage-lock.geocodes'
export const PH_REGIONS = geographyData.regions as RegionOption[]
export const PH_PROVINCES = geographyData.provinces as ProvinceOption[]
export const PH_LOCALITIES = geographyData.localities as LocalityOption[]

export const PHILIPPINES_MAP_CENTER = { lat: 12.8797, lng: 121.7740 }

export const REGION_MAP_CENTERS: Record<string, { lat: number; lng: number }> = {
  '1300000000': { lat: 14.5995, lng: 120.9842 },
  '1400000000': { lat: 17.3513, lng: 121.1719 },
  '0100000000': { lat: 16.0832, lng: 120.6199 },
  '0200000000': { lat: 17.6132, lng: 121.7270 },
  '0300000000': { lat: 15.4828, lng: 120.7120 },
  '0400000000': { lat: 14.1008, lng: 121.0794 },
  '1700000000': { lat: 12.6051, lng: 121.0794 },
  '0500000000': { lat: 13.4210, lng: 123.4137 },
  '0600000000': { lat: 11.0050, lng: 122.5373 },
  '1800000000': { lat: 10.2926, lng: 123.0247 },
  '0700000000': { lat: 10.3157, lng: 123.8854 },
  '0800000000': { lat: 11.2446, lng: 125.0388 },
  '0900000000': { lat: 7.8383, lng: 123.2967 },
  '1000000000': { lat: 8.0202, lng: 124.6857 },
  '1100000000': { lat: 7.1907, lng: 125.4553 },
  '1200000000': { lat: 6.2707, lng: 124.6857 },
  '1600000000': { lat: 8.8015, lng: 125.7407 },
  '1900000000': { lat: 6.9568, lng: 124.2422 },
}

export const DEMO_TENANT_GEO_SCOPE: TenantGeographyScope = {
  level: 'country',
}

export function getRegionName(code?: string) {
  return PH_REGIONS.find((region) => region.code === code)?.name ?? ''
}

export function getProvinceName(code?: string) {
  return PH_PROVINCES.find((province) => province.code === code)?.name ?? ''
}

export function getLocalityName(code?: string) {
  return PH_LOCALITIES.find((locality) => locality.code === code)?.name ?? ''
}

export function getLocalityLabel(locality: LocalityOption) {
  const suffix = locality.type === 'city'
    ? locality.cityClass
      ? `City, ${locality.cityClass}`
      : 'City'
    : 'Municipality'

  return `${locality.name} (${suffix})`
}

export function getScopeLocationDetails(scope: TenantGeographyScope = { level: 'country' }) {
  const locality = PH_LOCALITIES.find((item) => item.code === scope.municipalityCode)
  const province = PH_PROVINCES.find((item) => item.code === (scope.provinceCode ?? locality?.provinceCode))
  const region = PH_REGIONS.find((item) => item.code === (scope.regionCode ?? province?.regionCode ?? locality?.regionCode))
  const locationName = locality
    ? getLocalityLabel(locality)
    : province
    ? province.name
    : region
    ? region.name
    : 'Philippines'
  const organizationName = locality
    ? locality.name.match(/^(City|Municipality) of /i)
      ? locality.name
      : `${locality.type === 'city' ? 'City' : 'Municipality'} of ${locality.name}`
    : province
    ? `Province of ${province.name}`
    : region
    ? region.name
    : 'Philippines Emergency Rescue Portal'

  return {
    region,
    province,
    locality,
    locationName,
    organizationName,
    regionName: region?.name ?? '',
    provinceName: province?.name ?? '',
    municipalityName: locality?.name ?? '',
  }
}

export function getFallbackMapCenter(scope: TenantGeographyScope = { level: 'country' }) {
  const details = getScopeLocationDetails(scope)
  const regionCenter = details.region ? REGION_MAP_CENTERS[details.region.code] : null

  return {
    center: regionCenter ?? PHILIPPINES_MAP_CENTER,
    zoom: scope.level === 'country'
      ? 6
      : scope.level === 'region'
      ? 8
      : scope.level === 'province'
      ? 10
      : 13,
  }
}

export function getScopeGeocodeQuery(scope: TenantGeographyScope = { level: 'country' }) {
  const details = getScopeLocationDetails(scope)

  if (details.locality) {
    return [
      details.locality.name,
      details.provinceName,
      details.regionName,
      'Philippines',
    ].filter(Boolean).join(', ')
  }

  if (details.province) return `${details.province.name}, Philippines`
  if (details.region) return `${details.region.name}, Philippines`
  return 'Philippines'
}

export function getScopedRegions(scope: TenantGeographyScope = { level: 'country' }) {
  if (scope.level === 'country') return PH_REGIONS

  const regionCode = scope.regionCode
    ?? PH_PROVINCES.find((province) => province.code === scope.provinceCode)?.regionCode
    ?? PH_LOCALITIES.find((locality) => locality.code === scope.municipalityCode)?.regionCode

  return PH_REGIONS.filter((region) => region.code === regionCode)
}

export function getScopedProvinces(scope: TenantGeographyScope = { level: 'country' }) {
  if (scope.level === 'country') return PH_PROVINCES
  if (scope.level === 'region') {
    return PH_PROVINCES.filter((province) => province.regionCode === scope.regionCode)
  }
  if (scope.level === 'province') {
    return PH_PROVINCES.filter((province) => province.code === scope.provinceCode)
  }

  const locality = PH_LOCALITIES.find((item) => item.code === scope.municipalityCode)
  if (!locality?.provinceCode) return []

  return PH_PROVINCES.filter((province) => province.code === locality.provinceCode)
}

export function getScopedLocalities(scope: TenantGeographyScope = { level: 'country' }) {
  if (scope.level === 'country') return PH_LOCALITIES
  if (scope.level === 'region') {
    return PH_LOCALITIES.filter((locality) => locality.regionCode === scope.regionCode)
  }
  if (scope.level === 'province') {
    return PH_LOCALITIES.filter((locality) => locality.provinceCode === scope.provinceCode)
  }

  return PH_LOCALITIES.filter((locality) => locality.code === scope.municipalityCode)
}

export function getLocalitiesForProvince(provinceCode: string, scope: TenantGeographyScope = { level: 'country' }) {
  const scopedLocalities = getScopedLocalities(scope)
  return scopedLocalities.filter((locality) => locality.provinceCode === provinceCode)
}

export function getLocalitiesForRegionWithoutProvince(regionCode: string, scope: TenantGeographyScope = { level: 'country' }) {
  const scopedLocalities = getScopedLocalities(scope)
  return scopedLocalities.filter((locality) => locality.regionCode === regionCode && !locality.provinceCode)
}

export function makeTenantScope(level: GeoScopeLevel, code?: string): TenantGeographyScope {
  if (level === 'region') return { level, regionCode: code }
  if (level === 'province') {
    const province = PH_PROVINCES.find((item) => item.code === code)
    return { level, regionCode: province?.regionCode, provinceCode: code }
  }
  if (level === 'municipality') {
    const locality = PH_LOCALITIES.find((item) => item.code === code)
    return {
      level,
      regionCode: locality?.regionCode,
      provinceCode: locality?.provinceCode ?? undefined,
      municipalityCode: code,
    }
  }
  return { level: 'cou