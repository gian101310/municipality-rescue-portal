import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildEditedTenantBranding,
  buildTenantBranding,
  getSettingsTabsForRole,
  isTenantAction,
  normalizeSecretKey,
  validateTenantEditorInput,
  validateTenantPassword,
} from './tenant-admin.ts'

test('validates a complete editable tenant payload', () => {
  assert.equal(validateTenantEditorInput({
    name: 'City of San Fernando Emergency Rescue Portal',
    slug: 'san-fernando-pampanga',
    contactEmail: 'contact@sanfernando.gov.ph',
    emergencyHotline: '911',
    adminFullName: 'Maria Cruz',
    adminEmail: 'admin@sanfernando.gov.ph',
    municipalityCode: '035416000',
    plan: 'professional',
    status: 'active',
  }), null)
})

test('rejects an edit with no locality', () => {
  assert.equal(
    validateTenantEditorInput({ municipalityCode: '' }),
    'Choose a valid city or municipality.'
  )
})

test('rejects an edit with a malformed municipality admin email', () => {
  assert.equal(
    validateTenantEditorInput({
      municipalityCode: '035416000',
      name: 'San Fernando Emergency Rescue Portal',
      slug: 'san-fernando-pampanga',
      contactEmail: 'contact@sanfernando.gov.ph',
      emergencyHotline: '911',
      adminFullName: 'Maria Cruz',
      adminEmail: 'bad-email',
      plan: 'professional',
      status: 'active',
    }),
    'Enter a valid municipality admin email address.'
  )
})

test('preserves unrelated branding while replacing tenant editor values', () => {
  const branding = buildEditedTenantBranding({ logo_url: 'seal.svg', custom: true }, {
    plan: 'enterprise',
    status: 'active',
    localityCode: '035416000',
    provinceCode: '0354',
    regionCode: '03',
    municipalityName: 'San Fernando',
  })

  assert.equal(branding.logo_url, 'seal.svg')
  assert.equal(branding.custom, true)
  assert.equal(branding.tenant_plan, 'enterprise')
  assert.equal(branding.tenant_status, 'active')
  assert.equal(branding.locality_code, '035416000')
  assert.equal(branding.province_code, '0354')
  assert.equal(branding.region_code, '03')
  assert.equal(branding.municipality_name, 'San Fernando')
})

test('recognizes edit as a tenant action', () => {
  assert.equal(isTenantAction('edit'), true)
})

test('buildTenantBranding updates tenant status while preserving existing branding', () => {
  const branding = buildTenantBranding({ logo: 'seal.png', tenant_plan: 'starter' }, 'suspended')

  assert.equal(branding.logo, 'seal.png')
  assert.equal(branding.tenant_plan, 'starter')
  assert.equal(branding.tenant_status, 'suspended')
})

test('getSettingsTabsForRole hides coverage lock from municipality admins', () => {
  assert.deepEqual(getSettingsTabsForRole('admin').map((tab) => tab.value), [
    'general',
    'emergency_types',
    'barangays',
    'telegram',
    'notifications',
  ])
})

test('getSettingsTabsForRole keeps coverage lock visible for super admins', () => {
  assert.ok(getSettingsTabsForRole('super_admin').some((tab) => tab.value === 'coverage_lock'))
})

test('normalizeSecretKey trims custom keys and rejects short keys', () => {
  assert.equal(normalizeSecretKey('  Rescue-Ramon-2026!  '), 'Rescue-Ramon-2026!')
  assert.equal(normalizeSecretKey('short'), null)
})

test('validateTenantPassword requires strong temporary passwords', () => {
  assert.equal(validateTenantPassword('weakpass'), 'Password must include uppercase, lowercase, number, and special character.')
  assert.equal(validateTenantPassword('Rescue!Portal2026#'), null)
})
