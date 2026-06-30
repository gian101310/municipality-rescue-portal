export type TenantStatus = 'trial' | 'active' | 'suspended' | 'cancelled'
export type TenantPlan = 'starter' | 'professional' | 'enterprise' | 'one_time'
export type TenantAction = 'enable' | 'disable' | 'kick' | 'change_password' | 'rotate_secret' | 'edit'

export type TenantEditInput = {
  name?: unknown
  slug?: unknown
  contactEmail?: unknown
  emergencyHotline?: unknown
  adminFullName?: unknown
  adminEmail?: unknown
  municipalityCode?: unknown
  plan?: unknown
  status?: unknown
}

type EditedTenantBrandingFields = {
  plan: TenantPlan
  status: TenantStatus
  localityCode: string
  provinceCode: string | null | undefined
  regionCode: string
  municipalityName: string
}

const TENANT_PLANS: TenantPlan[] = ['starter', 'professional', 'enterprise', 'one_time']
const TENANT_STATUSES: TenantStatus[] = ['trial', 'active', 'suspended', 'cancelled']
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && Boolean(value.trim())
}

export type SettingsTabValue = 'general' | 'operations_staff' | 'coverage_lock' | 'emergency_types' | 'barangays'

export type SettingsTab = {
  label: string
  value: SettingsTabValue
  platformOnly?: boolean
}

export const SETTINGS_TABS: SettingsTab[] = [
  { label: 'General', value: 'general' },
  { label: 'Operations Staff', value: 'operations_staff' },
  { label: 'Coverage Lock', value: 'coverage_lock', platformOnly: true },
  { label: 'Emergency Types', value: 'emergency_types' },
  { label: 'Barangay Captains', value: 'barangays' },
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

export function validateTenantEditorInput(value: TenantEditInput): string | null {
  if (!isNonEmptyString(value.municipalityCode)) return 'Choose a valid city or municipality.'
  if (!isNonEmptyString(value.name)) return 'Tenant name is required.'
  if (!isNonEmptyString(value.slug)) return 'Tenant slug is required.'
  if (typeof value.contactEmail !== 'string' || !EMAIL_PATTERN.test(value.contactEmail.trim())) return 'Enter a valid contact email address.'
  if (!isNonEmptyString(value.adminFullName)) return 'Municipality admin name is required.'
  if (typeof value.adminEmail !== 'string' || !EMAIL_PATTERN.test(value.adminEmail.trim())) return 'Enter a valid municipality admin email address.'
  if (!isNonEmptyString(value.emergencyHotline)) return 'Emergency hotline is required.'
  if (typeof value.plan !== 'string' || !TENANT_PLANS.includes(value.plan as TenantPlan)) return 'Choose a valid tenant plan.'
  if (typeof value.status !== 'string' || !TENANT_STATUSES.includes(value.status as TenantStatus)) return 'Choose a valid tenant status.'
  return null
}

export function buildEditedTenantBranding(
  existing: Record<string, unknown> | null | undefined,
  fields: EditedTenantBrandingFields
) {
  return {
    ...(existing ?? {}),
    tenant_plan: fields.plan,
    tenant_status: fields.status,
    locality_code: fields.localityCode,
    province_code: fields.provinceCode,
    region_code: fields.regionCode,
    municipality_name: fields.municipalityName,
  }
}

type TenantEditWithAuthEmailOptions<T> = {
  previousEmail: string
  nextEmail: string
  updateAuthEmail: (email: string) => Promise<void>
  persistTenantEdits: () => Promise<T>
}

export async function persistTenantEditWithAuthEmail<T>({
  previousEmail,
  nextEmail,
  updateAuthEmail,
  persistTenantEdits,
}: TenantEditWithAuthEmailOptions<T>): Promise<T> {
  await updateAuthEmail(nextEmail)

  try {
    return await persistTenantEdits()
  } catch (error) {
    try {
      await updateAuthEmail(previousEmail)
    } catch (rollbackError) {
      throw new Error(
        'Tenant edit failed and the Auth email could not be restored. Manual reconciliation is required.',
        { cause: rollbackError }
      )
    }
    throw error
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
    || value === 'edit'
}
