import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('trusted-device tokens are hashed, rotated, and server-created', () => {
  const migration = readFileSync(new URL('../../supabase/migrations/20260630143000_harden_trusted_sessions.sql', import.meta.url), 'utf8')
  const createRoute = readFileSync(new URL('../app/api/auth/trusted-session/route.ts', import.meta.url), 'utf8')
  const refreshRoute = readFileSync(new URL('../app/api/auth/trusted-session-refresh/route.ts', import.meta.url), 'utf8')
  const serverHelpers = readFileSync(new URL('./trusted-session-server.ts', import.meta.url), 'utf8')
  const client = readFileSync(new URL('./trusted-session.ts', import.meta.url), 'utf8')
  const layout = readFileSync(new URL('../app/resident/layout.tsx', import.meta.url), 'utf8')

  assert.match(migration, /add column if not exists token_hash/i)
  assert.match(migration, /digest\(convert_to\(session_token, 'UTF8'\), 'sha256'\)/i)
  assert.match(migration, /revoke insert, update, delete on public\.trusted_sessions from authenticated/i)
  assert.match(serverHelpers, /randomBytes\(32\)/)
  assert.match(createRoute, /hashTrustedToken/)
  assert.match(refreshRoute, /\.eq\('token_hash', tokenHash\)/)
  assert.match(refreshRoute, /rotatedToken/)
  assert.doesNotMatch(client, /from\('trusted_sessions'\)[\s\S]{0,100}\.insert/)
  assert.match(client, /fetch\('\/api\/auth\/trusted-session'/)
  assert.match(layout, /updateStoredTrustedSession/)
})
