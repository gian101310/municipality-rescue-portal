import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

test('super admin access uses a public one-time token handoff before protected admin routes', () => {
  const route = readFileSync(new URL('../app/api/super-admin/login-as-admin/route.ts', import.meta.url), 'utf8')
  const handoffUrl = new URL('../app/auth/admin-access/page.tsx', import.meta.url)

  assert.equal(existsSync(handoffUrl), true)
  assert.match(route, /properties\?\.hashed_token/)
  assert.match(route, /\/auth\/admin-access\?token_hash=/)
  assert.doesNotMatch(route, /properties\?\.action_link/)

  const handoff = readFileSync(handoffUrl, 'utf8')
  assert.match(handoff, /verifyOtp\(/)
  assert.match(handoff, /type: 'magiclink'/)
  assert.match(handoff, /window\.location\.replace\('\/admin'\)/)
})
