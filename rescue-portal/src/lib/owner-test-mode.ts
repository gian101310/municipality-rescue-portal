import type { RegistrationStatus, UserRole } from './types'

export type OwnerTestProfile = {
  user_id: string
  role: UserRole
  is_active: boolean
  registration_status: RegistrationStatus | null
}

export type ResidentAccess = {
  allowed: boolean
  ownerTestMode: boolean
}

export function isOwnerTestMode(searchParams: URLSearchParams) {
  return searchParams.get('owner-test-mode') === '1'
}

export function getResidentAccess(
  profile: OwnerTestProfile,
  searchParams: URLSearchParams
): ResidentAccess {
  const ownerTestMode = profile.role === 'super_admin' && profile.is_active && isOwnerTestMode(searchParams)
  const approvedResident = profile.role === 'resident' && profile.is_active && profile.registration_status === 'approved'

  return {
    allowed: ownerTestMode || approvedResident,
    ownerTestMode,
  }
}

export function getTestReportMetadata(access: ResidentAccess) {
  return access.ownerTestMode
    ? { is_drill: true, changed_by_role: 'super_admin' as const }
    : { is_drill: false, changed_by_role: 'resident' as const }
}

export function withOwnerTestMode(path: string, ownerTestMode: boolean) {
  if (!ownerTestMode) return path

  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}owner-test-mode=1`
}
