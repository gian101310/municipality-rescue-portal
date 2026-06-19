import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildTenantBranding,
  getSettingsTabsForRole,
  normalizeSecretKey,
  validateTenantPassword,
} from './tenant-admin.ts'

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
