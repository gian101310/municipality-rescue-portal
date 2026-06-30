import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import test from 'node:test'

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8')
}

test('operational mission pages visibly report refresh failures', () => {
  for (const path of ['../app/dispatch/page.tsx', '../app/rescue-team/page.tsx']) {
    const page = source(path)
    assert.match(page, /dataError/)
    assert.match(page, /Live updates are delayed/)
    assert.doesNotMatch(page, /if \(!res\.ok\) return/)
    assert.doesNotMatch(page, /catch \{ \/\* silent \*\/ \}/)
  }
})

test('QR poster generation has an actionable failure state', () => {
  const page = source('../app/admin/qr-posters/page.tsx')
  assert.match(page, /qrError/)
  assert.match(page, /Retry QR generation/)
  assert.match(page, /throw new Error/)
})

test('operations map never initializes from demo tenant geography', () => {
  const page = source('../app/admin/map/page.tsx')
  assert.doesNotMatch(page, /DEMO_TENANT_GEO_SCOPE/)
  assert.match(page, /useState<TenantGeographyScope \| null>\(null\)/)
})

test('production CSP does not permit unsafe eval', () => {
  const config = source('../../next.config.ts')
  assert.match(config, /process\.env\.NODE_ENV === ['"]development['"]/)
  assert.match(config, /scriptSrc/)
})

test('incident note author can be nulled when a staff profile is removed', () => {
  const migrations = new URL('../../supabase/migrations/', import.meta.url)
  const sql = readdirSync(migrations)
    .filter((name) => name.endsWith('.sql'))
    .map((name) => readFileSync(new URL(name, migrations), 'utf8'))
    .join('\n')
  assert.match(sql, /ALTER TABLE public\.incident_notes\s+ALTER COLUMN user_id DROP NOT NULL/i)
})

test('global error page does not claim nonexistent external logging', () => {
  const page = source('../app/error.tsx')
  assert.doesNotMatch(page, /This has been logged/)
  assert.match(page, /Error ID/)
})

test('legacy responder URL redirects to the canonical rescue-team portal', () => {
  const page = source('../app/responder/page.tsx')
  assert.match(page, /redirect\(['"]\/rescue-team['"]\)/)
  assert.doesNotMatch(page, /setInterval|navigator\.geolocation|\/api\/responder\/location/)
})

test('unused production demo fixture bundle is removed', () => {
  assert.equal(existsSync(new URL('./demo-data.ts', import.meta.url)), false)
})

test('generated Android build output is excluded from source linting', () => {
  const config = source('../../eslint.config.mjs')
  assert.match(config, /android\/\*\*\/build\/\*\*/)
})
