import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { getGpsFreshness } from './tracking-estimate.ts'

test('marks responder GPS delayed after 45 seconds', () => {
  const now = Date.parse('2026-06-30T10:00:00.000Z')
  assert.deepEqual(getGpsFreshness('2026-06-30T09:59:30.000Z', now), { isStale: false, ageSeconds: 30 })
  assert.deepEqual(getGpsFreshness('2026-06-30T09:58:00.000Z', now), { isStale: true, ageSeconds: 120 })
  assert.deepEqual(getGpsFreshness(null, now), { isStale: true, ageSeconds: null })
})

test('tracking uses road routing when live and labels fallback and stale estimates', () => {
  const route = readFileSync(new URL('../app/api/incidents/[id]/tracking/route.ts', import.meta.url), 'utf8')
  const component = readFileSync(new URL('../components/rescue-tracking-map.tsx', import.meta.url), 'utf8')
  assert.match(route, /router\.project-osrm\.org/)
  assert.match(route, /estimate_source/)
  assert.match(route, /is_stale/)
  assert.match(component, /GPS signal delayed/)
  assert.match(component, /estimate_note/)
  assert.match(component, /escapeMapText/)
})

test('precise responder locations have an automatic retention job', () => {
  const migration = readFileSync(new URL('../../supabase/migrations/20260630144500_schedule_location_retention.sql', import.meta.url), 'utf8')
  assert.match(migration, /created_at < NOW\(\) - INTERVAL '30 days'/i)
  assert.match(migration, /cron\.schedule/i)
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.purge_expired_responder_locations/i)
})
