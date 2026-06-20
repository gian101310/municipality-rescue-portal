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

// Country detection helpers
export function isUAECode(code?: string): boolean {
  return !!code && code.startsWith('AE-')
}

export function getCountryForCode(code?: string): 'PH' | 'AE' {
  return isUAECode(code) ? 'AE' : 'PH'
}

export function getCountryName(code?: string): string {
  return isUAECode(code) ? 'United Arab Emirates' : 'Philippines'
}

export function getCountryForScope(scope: TenantGeographyScope = { level: 'country' }): 'PH' | 'AE' {
  const anyCode = scope.municipalityCode ?? scope.provinceCode ?? scope.regionCode
  return getCountryForCode(anyCode)
}

export const PSGC_VERSION_LABEL = geographyData.versionLabel
export const COVERAGE_LOCK_STORAGE_KEY = 'rescue-portal.coverage-lock'
export const COVERAGE_LOCK_GEOCODE_STORAGE_KEY = 'rescue-portal.coverage-lock.geocodes'
export const PH_REGIONS = geographyData.regions as RegionOption[]
export const PH_PROVINCES = geographyData.provinces as ProvinceOption[]
export const PH_LOCALITIES = geographyData.localities as LocalityOption[]

// Country-filtered helpers
export const UAE_REGIONS = PH_REGIONS.filter(r => isUAECode(r.code))
export const UAE_PROVINCES = PH_PROVINCES.filter(p => isUAECode(p.code))
export const UAE_LOCALITIES = PH_LOCALITIES.filter(l => isUAECode(l.code))
export const PH_ONLY_REGIONS = PH_REGIONS.filter(r => !isUAECode(r.code))
export const PH_ONLY_PROVINCES = PH_PROVINCES.filter(p => !isUAECode(p.code))
export const PH_ONLY_LOCALITIES = PH_LOCALITIES.filter(l => !isUAECode(l.code))

export function getRegionsForCountry(country: 'PH' | 'AE') {
  return country === 'AE' ? UAE_REGIONS : PH_ONLY_REGIONS
}
export function getProvincesForCountry(country: 'PH' | 'AE') {
  return country === 'AE' ? UAE_PROVINCES : PH_ONLY_PROVINCES
}
export function getLocalitiesForCountry(country: 'PH' | 'AE') {
  return country === 'AE' ? UAE_LOCALITIES : PH_ONLY_LOCALITIES
}

export const PHILIPPINES_MAP_CENTER = { lat: 12.8797, lng: 121.7740 }
export const UAE_MAP_CENTER = { lat: 24.4539, lng: 54.3773 }

export const REGION_MAP_CENTERS: Record<string, { lat: number; lng: number }> = {
  // Philippines regions
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
  // UAE emirates
  'AE-AZ-000000': { lat: 24.4539, lng: 54.3773 },
  'AE-DU-000000': { lat: 25.2048, lng: 55.2708 },
  'AE-SH-000000': { lat: 25.3463, lng: 55.4209 },
  'AE-AJ-000000': { lat: 25.4052, lng: 55.5136 },
  'AE-UQ-000000': { lat: 25.5647, lng: 55.5554 },
  'AE-RK-000000': { lat: 25.7895, lng: 55.9432 },
  'AE-FU-000000': { lat: 25.1288, lng: 56.3265 },
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
  // UAE localities don't use City/Municipality classification
  if (isUAECode(locality.code)) {
    return locality.name
  }
  const suffix = locality.type === 'city'
    ? locality.cityClass
      ? `City, ${locality.cityClass}`
      : 'City'
    : 'Municipality'

  return `${locality.name} (${suffix})`
}

export function getScopeLocationDetails(scope: TenantGeographyScope = { level: 'country' }) {
  const country = getCountryForScope(scope)
  const countryLabel = country === 'AE' ? 'United Arab Emirates' : 'Philippines'
  const locality = PH_LOCALITIES.find((item) => item.code === scope.municipalityCode)
  const province = PH_PROVINCES.find((item) => item.code === (scope.provinceCode ?? locality?.provinceCode))
  const region = PH_REGIONS.find((item) => item.code === (scope.regionCode ?? province?.regionCode ?? locality?.regionCode))
  const locationName = locality
    ? getLocalityLabel(locality)
    : province
    ? province.name
    : region
    ? region.name
    : countryLabel
  const organizationName = locality
    ? country === 'AE'
      ? locality.name
      : locality.name.match(/^(City|Municipality) of /i)
        ? locality.name
        : `${locality.type === 'city' ? 'City' : 'Municipality'} of ${locality.name}`
    : province
    ? country === 'AE' ? province.name : `Province of ${province.name}`
    : region
    ? region.name
    : `${countryLabel} Emergency Rescue Portal`

  return {
    region,
    province,
    locality,
    locationName,
    organizationName,
    regionName: region?.name ?? '',
    provinceName: province?.name ?? '',
    municipalityName: locality?.name ?? '',
    country,
  }
}

export function getFallbackMapCenter(scope: TenantGeographyScope = { level: 'country' }) {
  const details = getScopeLocationDetails(scope)
  const country = details.country
  const defaultCenter = country === 'AE' ? UAE_MAP_CENTER : PHILIPPINES_MAP_CENTER
  const regionCenter = details.region ? REGION_MAP_CENTERS[details.region.code] : null

  return {
    center: regionCenter ?? defaultCenter,
    zoom: scope.level === 'country'
      ? (country === 'AE' ? 7 : 6)
      : scope.level === 'region'
      ? 8
      : scope.level === 'province'
      ? 10
      : 13,
  }
}

export function getScopeGeocodeQuery(scope: TenantGeographyScope = { level: 'country' }) {
  const details = getScopeLocationDetails(scope)
  const countryLabel = details.country === 'AE' ? 'United Arab Emirates' : 'Philippines'

  if (details.locality) {
    return [
      details.locality.name,
      details.provinceName,
      details.regionName,
      countryLabel,
    ].filter(Boolean).join(', ')
  }

  if (details.province) return `${details.province.name}, ${countryLabel}`
  if (details.region) return `${details.region.name}, ${countryLabel}`
  return countryLabel
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
  return { level: 'country' }
}
