import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  buildEditedTenantBranding,
  buildTenantBranding,
  getSettingsTabsForRole,
  isTenantAction,
  normalizeSecretKey,
  persistTenantEditWithAuthEmail,
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

test('rejects non-string tenant editor fields even when string coercion would look valid', () => {
  const validInput = {
    municipalityCode: '035416000',
    name: 'San Fernando Emergency Rescue Portal',
    slug: 'san-fernando-pampanga',
    contactEmail: 'contact@sanfernando.gov.ph',
    emergencyHotline: '911',
    adminFullName: 'Maria Cruz',
    adminEmail: 'admin@sanfernando.gov.ph',
    plan: 'professional',
    status: 'active',
  }

  assert.equal(
    validateTenantEditorInput({ ...validInput, municipalityCode: ['035416000'] }),
    'Choose a valid city or municipality.'
  )
  assert.equal(
    validateTenantEditorInput({ ...validInput, name: ['San Fernando Emergency Rescue Portal'] }),
    'Tenant name is required.'
  )
  assert.equal(
    validateTenantEditorInput({ ...validInput, slug: ['san-fernando-pampanga'] }),
    'Tenant slug is required.'
  )
  assert.equal(
    validateTenantEditorInput({ ...validInput, emergencyHotline: ['911'] }),
    'Emergency hotline is required.'
  )
  assert.equal(
    validateTenantEditorInput({ ...validInput, contactEmail: ['contact@sanfernando.gov.ph'] }),
    'Enter a valid contact email address.'
  )
  assert.equal(
    validateTenantEditorInput({ ...validInput, adminEmail: ['admin@sanfernando.gov.ph'] }),
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

test('does not persist tenant edits when the Auth email update fails', async () => {
  const authCalls: string[] = []
  let persisted = false

  await assert.rejects(
    persistTenantEditWithAuthEmail({
      previousEmail: 'old@municipality.gov.ph',
      nextEmail: 'new@municipality.gov.ph',
      updateAuthEmail: async (email) => {
        authCalls.push(email)
        throw new Error('Auth email update failed')
      },
      persistTenantEdits: async () => {
        persisted = true
      },
    }),
    /Auth email update failed/
  )

  assert.deepEqual(authCalls, ['new@municipality.gov.ph'])
  assert.equal(persisted, false)
})

test('restores the Auth email when later tenant persistence fails', async () => {
  const authCalls: string[] = []

  await assert.rejects(
    persistTenantEditWithAuthEmail({
      previousEmail: 'old@municipality.gov.ph',
      nextEmail: 'new@municipality.gov.ph',
      updateAuthEmail: async (email) => {
        authCalls.push(email)
      },
      persistTenantEdits: async () => {
        throw new Error('Database update failed')
      },
    }),
    /Database update failed/
  )

  assert.deepEqual(authCalls, [
    'new@municipality.gov.ph',
    'old@municipality.gov.ph',
  ])
})

test('the atomic tenant edit migration updates every database record in one RPC', () => {
  const migration = readFileSync(
    new URL('../../supabase/migrations/005_atomic_tenant_edit.sql', import.meta.url),
    'utf8'
  )

  assert.match(migration, /create or replace function public\.edit_tenant_settings/i)
  assert.match(migration, /update organizations/i)
  assert.match(migration, /insert into municipalities/i)
  assert.match(migration, /insert into organization_geo_scopes/i)
  assert.match(migration, /update user_profiles/i)
  assert.match(migration, /revoke execute on function public\.edit_tenant_settings/i)
  assert.match(migration, /grant execute on function public\.edit_tenant_settings[^;]*to service_role/i)
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

test('the user role schema supports the Staff account type offered by super admin', () => {
  const initialSchema = readFileSync(
    new URL('../../supabase/migrations/001_initial_schema.sql', import.meta.url),
    'utf8'
  )
  const generatedTypes = readFileSync(
    new URL('./supabase/database.types.ts', import.meta.url),
    'utf8'
  )

  assert.match(initialSchema, /'staff'/)
  assert.match(generatedTypes, /user_role:.*'staff'/)
})

test('the staff account endpoint rolls back Auth when profile creation fails', () => {
  const staffRoute = readFileSync(
    new URL('../app/api/super-admin/staff/route.ts', import.meta.url),
    'utf8'
  )

  assert.match(staffRoute, /let createdAuthUserId: string \| null = null/)
  assert.match(staffRoute, /admin\.auth\.admin\.deleteUser\(createdAuthUserId\)/)
})
