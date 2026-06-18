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
export const PH_REGIONS = geographyData.regions as RegionOption[]
export const PH_PROVINCES = geographyData.provinces as ProvinceOption[]
export const PH_LOCALITIES = geographyData.localities as LocalityOption[]

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
  if (level === 'province') return { level, provinceCode: code }
  if (level === 'municipality') return { level, municipalityCode: code }
  return { level: 'country' }
}
