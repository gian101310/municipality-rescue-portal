import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import test from 'node:test'
import { buildAssignmentPayload } from './incident-assignment.ts'

test('requires a rescue team id for assignment', () => {
  assert.deepEqual(buildAssignmentPayload('unit-1'), { rescueUnitId: 'unit-1' })
  assert.throws(() => buildAssignmentPayload(''))
})

test('assignment route performs one approved-staff RPC operation', () => {
  const route = readFileSync(
    new URL('../app/api/admin/incidents/[id]/assignments/route.ts', import.meta.url),
    'utf8'
  )

  assert.match(route, /registration_status !== 'approved'/)
  assert.match(route, /\.rpc\('assign_incident_team'/)
  assert.doesNotMatch(route, /\.from\('incidents'\)\.update/)
  assert.doesNotMatch(route, /\.from\('rescue_units'\)\.update/)
  assert.doesNotMatch(route, /\.from\('incident_assignments'\)\.insert/)
})

test('assignment RPC locks records and logs incident type atomically', () => {
  const directory = new URL('../../supabase/migrations/', import.meta.url)
  const file = readdirSync(directory)
    .find((name) => name.endsWith('_harden_tenant_authorization.sql'))
  assert.ok(file)
  const migration = readFileSync(new URL(file, directory), 'utf8')

  assert.match(migration, /create or replace function public\.assign_incident_team/i)
  assert.match(migration, /from public\.incidents[\s\S]*for update/i)
  assert.match(migration, /from public\.rescue_units[\s\S]*for update/i)
  assert.match(migration, /update public\.incident_assignments[\s\S]*status = 'cancelled'/i)
  assert.match(migration, /insert into public\.incident_assignments/i)
  assert.match(migration, /insert into public\.incident_status_history/i)
  assert.match(migration, /insert into public\.incident_timeline/i)
  assert.match(migration, /insert into public\.audit_logs/i)
  assert.match(migration, /'emergency_type', emergency_type_name/i)
  assert.match(migration, /previous_values, new_values, organization_id/i)
  assert.doesNotMatch(migration, /old_values/i)
  assert.match(migration, /grant execute on function public\.assign_incident_team\(uuid, uuid, uuid\) to service_role/i)
})

test('database blocks assigning a terminal incident', () => {
  const directory = new URL('../../supabase/migrations/', import.meta.url)
  const migrations = readdirSync(directory)
    .map((name) => readFileSync(new URL(name, directory), 'utf8'))
    .join('\n')

  assert.match(migrations, /prevent_terminal_incident_assignment/i)
  assert.match(migrations, /OLD\.status::TEXT IN \('resolved', 'closed', 'cancelled', 'false_alert', 'invalid', 'duplicate'\)/i)
})
