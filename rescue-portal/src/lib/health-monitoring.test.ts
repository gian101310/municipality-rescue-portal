import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('health checks exercise real tenant-scoped dependencies', () => {
  const route = readFileSync(new URL('../app/api/admin/health/route.ts', import.meta.url), 'utf8')
  assert.match(route, /auth\.admin\.listUsers/)
  assert.match(route, /router\.project-osrm\.org/)
  assert.match(route, /status === 'SUBSCRIBED'/)
  assert.match(route, /\.eq\('organization_id', organizationId\)/)
  assert.doesNotMatch(route, /Google Maps|latency < 5 \? 8/)
})
