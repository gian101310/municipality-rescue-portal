export type TenantStatus = 'trial' | 'active' | 'suspended' | 'cancelled'
export type TenantAction = 'enable' | 'disable' | 'kick' | 'change_password' | 'rotate_secret'

export type SettingsTabValue = 'general' | 'coverage_lock' | 'emergency_types' | 'barangays' | 'telegram' | 'notifications'

export type SettingsTab = {
  label: string
  value: SettingsTabValue
  platformOnly?: boolean
}

export const SETTINGS_TABS: SettingsTab[] = [
  { label: 'General', value: 'general' },
  { label: 'Coverage Lock', value: 'coverage_lock', platformOnly: true },
  { label: 'Emergency Types', value: 'emergency_types' },
  { label: 'Barangays', value: 'barangays' },
  { label: 'Telegram', value: 'telegram' },
  { label: 'Notifications', value: 'notifications' },
]

export const TENANT_DISABLED_BAN_DURATION = '876000h'

export function buildTenantBranding(
  branding: Record<string, unknown> | null | undefined,
  status: TenantStatus
) {
  return {
    ...(branding ?? {}),
    tenant_status: status,
  }
}

export function getSettingsTabsForRole(role: string | null | undefined) {
  return SETTINGS_TABS.filter((tab) => !tab.platformOnly || role === 'super_admin')
}

export function normalizeSecretKey(value: unknown) {
  const key = String(value ?? '').trim()
  return key.length >= 8 ? key : null
}

export function validateTenantPassword(value: unknown) {
  const password = String(value ?? '')

  if (password.length < 8) {
    return 'Password must be at least 8 characters.'
  }

  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return 'Password must include uppercase, lowercase, number, and special character.'
  }

  return null
}

export function isTenantAction(value: unknown): value is TenantAction {
  return value === 'enable'
    || value === 'disable'
    || value === 'kick'
    || value === 'change_password'
    || value === 'rotate_secret'
}
