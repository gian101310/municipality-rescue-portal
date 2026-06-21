import type { TenantGeographyScope } from './philippines-geography'

export function getRegistrationGeoScope(qrScope?: TenantGeographyScope): TenantGeographyScope {
  return qrScope ?? { level: 'country' }
}
