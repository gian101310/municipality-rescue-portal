import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('rescue team loads only missions assigned to the signed-in responder unit', () => {
  const page = readFileSync(new URL('../app/rescue-team/page.tsx', import.meta.url), 'utf8')
  const route = readFileSync(new URL('../app/api/responder/incidents/route.ts', import.meta.url), 'utf8')

  assert.match(page, /fetch\('\/api\/responder\/incidents'/)
  assert.match(route, /rescue_unit_members/)
  assert.match(route, /\.in\('assigned_unit_id', unitIds\)/)
  assert.match(route, /unitConfigured: false/)
  assert.match(page, /not linked to a rescue unit/)
})

test('rescue team broadcasts mission GPS and renders incident tracking', () => {
  const page = readFileSync(new URL('../app/rescue-team/page.tsx', import.meta.url), 'utf8')

  assert.match(page, /\/api\/responder\/location/)
  assert.match(page, /<RescueTrackingMap/)
})

test('responder status updates are restricted to incidents assigned to their unit', () => {
  const route = readFileSync(
    new URL('../app/api/admin/incidents/[id]/status/route.ts', import.meta.url),
    'utf8'
  )

  assert.match(route, /responderAccessRoles/)
  assert.match(route, /rescue_unit_members/)
  assert.match(route, /existingIncident\.assigned_unit_id/)
})

test('tracking table does not expose every responder location to every authenticated user', () => {
  const migration = readFileSync(
    new URL('../../supabase/migrations/20260627180000_responder_live_tracking.sql', import.meta.url),
    'utf8'
  )

  assert.doesNotMatch(migration, /FOR SELECT USING \(true\)/)
  assert.match(migration, /GRANT ALL ON public\.responder_locations TO service_role/)
  assert.match(migration, /REVOKE ALL ON public\.responder_locations FROM anon, authenticated/)
})

test('the reporting resident is authorized with the auth user id stored on incidents', () => {
  const route = readFileSync(new URL('../app/api/incidents/[id]/tracking/route.ts', import.meta.url), 'utf8')

  assert.match(route, /incident\.reporter_id === user\.id/)
  assert.doesNotMatch(route, /incident\.reporter_id === profile\.id/)
})
