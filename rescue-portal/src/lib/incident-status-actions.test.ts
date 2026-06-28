import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { buildStatusUpdateRequest } from './incident-status-actions.ts'
import type { IncidentStatus } from './types.ts'

test('builds a real dispatch status request', () => {
  assert.deepEqual(buildStatusUpdateRequest('dispatched'), { status: 'dispatched', reason: '' })
})

test('builds a real resolve status request', () => {
  assert.deepEqual(buildStatusUpdateRequest('resolved'), { status: 'resolved', reason: '' })
})

test('normalizes the false alarm action to the database false_alert status', () => {
  assert.deepEqual(
    buildStatusUpdateRequest('false_alarm' as IncidentStatus),
    { status: 'false_alert', reason: 'Marked as false alarm' }
  )
})

test('status history and audit records retain the incident type', () => {
  const route = readFileSync(
    new URL('../app/api/admin/incidents/[id]/status/route.ts', import.meta.url),
    'utf8'
  )

  assert.match(route, /metadata: \{ emergency_type_id: existingIncident\.emergency_type_id \}/)
  assert.match(route, /newValues: \{ status, reason: reason \|\| null, emergencyTypeId: existingIncident\.emergency_type_id \}/)
})

test('production schema includes the cancelled timestamp written by terminal statuses', () => {
  const migration = readFileSync(
    new URL('../../supabase/migrations/20260627182619_add_incident_cancelled_at.sql', import.meta.url),
    'utf8'
  )

  assert.match(migration, /ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ/)
})

test('audit logs use the user_profiles primary key required by the actor foreign key', () => {
  const incidentStatus = readFileSync(
    new URL('../app/api/admin/incidents/[id]/status/route.ts', import.meta.url),
    'utf8'
  )
  const residentStatus = readFileSync(
    new URL('../app/api/admin/residents/[id]/status/route.ts', import.meta.url),
    'utf8'
  )
  const secureLogout = readFileSync(
    new URL('../app/api/admin/secure-logout/route.ts', import.meta.url),
    'utf8'
  )

  assert.match(incidentStatus, /actorId: auth\.profile\.id/)
  assert.match(residentStatus, /actorId: auth\.profile\.id/)
  assert.match(secureLogout, /actorId: profile\?\.id \?\? null/)
  assert.doesNotMatch(incidentStatus, /actorId: auth\.profile\.user_id/)
  assert.doesNotMatch(residentStatus, /actorId: auth\.profile\.user_id/)
  assert.doesNotMatch(secureLogout, /actorId: user\.id/)
})
