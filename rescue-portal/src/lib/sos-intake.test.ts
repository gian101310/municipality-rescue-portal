import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import test from 'node:test'

const migrationsDirectory = new URL('../../supabase/migrations/', import.meta.url)

function readHardeningMigration() {
  const file = readdirSync(migrationsDirectory)
    .find((name) => name.endsWith('_harden_tenant_authorization.sql'))
  assert.ok(file)
  return readFileSync(new URL(file, migrationsDirectory), 'utf8')
}

test('SOS intake is one authenticated idempotent database operation', () => {
  const route = readFileSync(
    new URL('../app/api/resident/incidents/sos/route.ts', import.meta.url),
    'utf8'
  )

  assert.match(route, /\.rpc\('create_resident_sos'/)
  assert.match(route, /local_sos_id: localSosId/)
  assert.doesNotMatch(route, /\.from\('incidents'\)[\s\S]*?\.insert\(/)
  assert.doesNotMatch(route, /\.from\('incident_locations'\)[\s\S]*?\.insert\(/)
  assert.doesNotMatch(route, /\.from\('incident_status_history'\)[\s\S]*?\.insert\(/)
})

test('SOS RPC serializes retries and commits all emergency records together', () => {
  const migration = readHardeningMigration()

  assert.match(migration, /create or replace function public\.create_resident_sos\(p_payload jsonb\)/i)
  assert.match(migration, /pg_advisory_xact_lock\(hashtextextended\(requested_local_sos_id, 0\)\)/i)
  assert.match(migration, /where incident\.local_sos_id = requested_local_sos_id/i)
  assert.match(migration, /'created', false/i)
  assert.match(migration, /insert into public\.incidents/i)
  assert.match(migration, /insert into public\.incident_locations/i)
  assert.match(migration, /insert into public\.incident_status_history/i)
  assert.match(migration, /insert into public\.incident_timeline/i)
  assert.match(migration, /insert into public\.audit_logs/i)
  assert.match(migration, /revoke execute on function public\.create_resident_sos\(jsonb\) from public, anon/i)
  assert.match(migration, /grant execute on function public\.create_resident_sos\(jsonb\) to authenticated/i)
  assert.doesNotMatch(migration, /current_time\s+TIMESTAMPTZ/i)
})
