import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import test from 'node:test'

const migrationsDirectory = new URL('../../supabase/migrations/', import.meta.url)

function readHardeningMigration() {
  const file = readdirSync(migrationsDirectory)
    .find((name) => name.endsWith('_harden_tenant_authorization.sql'))

  assert.ok(file, 'tenant authorization hardening migration must exist')
  return readFileSync(new URL(file, migrationsDirectory), 'utf8')
}

test('resident profile writes cannot change authorization fields', () => {
  const migration = readHardeningMigration()

  assert.match(migration, /revoke\s+insert,\s*update,\s*delete\s+on\s+public\.user_profiles\s+from\s+anon,\s*authenticated/i)
  assert.match(migration, /grant\s+update\s*\([^)]*full_name[^)]*phone[^)]*\)\s+on\s+public\.user_profiles\s+to\s+authenticated/i)
  assert.doesNotMatch(migration, /grant\s+update\s*\([^)]*(role|organization_id|is_active|registration_status)/i)
  assert.match(migration, /to_regclass\('public\.'\s*\|\|\s*legacy_table\)/i)
  assert.match(migration, /ARRAY\['profiles', 'tenants', 'rescue_teams', 'shift_schedules'\]/i)
})

test('incident child policies require an active same-organization staff profile', () => {
  const migration = readHardeningMigration()
  const childTables = [
    'incident_locations',
    'incident_assignments',
    'incident_status_history',
    'incident_notes',
    'incident_attachments',
    'triage_answers',
    'false_alert_reviews',
    'incident_timeline',
  ]

  for (const table of childTables) {
    assert.match(migration, new RegExp(`create policy "${table}_staff_same_org"`, 'i'))
  }

  assert.match(migration, /profile\.organization_id\s*=\s*incident\.organization_id/i)
  assert.match(migration, /profile\.is_active\s*=\s*true/i)
  assert.match(migration, /profile\.registration_status\s*=\s*'approved'/i)
})

test('audit insertion and tenant editing are service-role only', () => {
  const migration = readHardeningMigration()

  assert.match(migration, /drop policy if exists "audit_insert_any" on public\.audit_logs/i)
  assert.match(migration, /revoke\s+insert\s+on\s+public\.audit_logs\s+from\s+anon,\s*authenticated/i)
  assert.match(migration, /grant\s+insert\s+on\s+public\.audit_logs\s+to\s+service_role/i)
  assert.match(migration, /revoke execute on function public\.edit_tenant_settings\(uuid, uuid, jsonb\) from public, anon, authenticated/i)
  assert.match(migration, /grant execute on function public\.edit_tenant_settings\(uuid, uuid, jsonb\) to service_role/i)
})

test('coverage updates require an active super admin and have no tenant fallback', () => {
  const routeUrl = new URL('../app/api/coverage-lock/route.ts', import.meta.url)
  assert.equal(existsSync(routeUrl), true)
  const route = readFileSync(routeUrl, 'utf8')

  assert.match(route, /profile\.role !== 'super_admin'/)
  assert.match(route, /!profile\.is_active/)
  assert.doesNotMatch(route, /DEMO_ORGANIZATION\.slug/)
  assert.doesNotMatch(route, /order\('created_at'/)
  assert.doesNotMatch(route, /Fall through to default lookup/)
})
