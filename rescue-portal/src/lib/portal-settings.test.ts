import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('authenticated users load settings from their own organization', () => {
  const route = readFileSync(new URL('../app/api/portal-settings/route.ts', import.meta.url), 'utf8')
  const context = readFileSync(new URL('./settings-context.tsx', import.meta.url), 'utf8')

  assert.match(route, /auth\.getUser\(\)/)
  assert.match(route, /\.eq\('user_id', user\.id\)/)
  assert.match(route, /\.eq\('id', profile\.organization_id\)/)
  assert.match(route, /emergency_hotline/)
  assert.match(context, /fetch\('\/api\/portal-settings'/)
  assert.doesNotMatch(context, /hotline: DEMO_ORGANIZATION\.emergency_hotline/)
})
