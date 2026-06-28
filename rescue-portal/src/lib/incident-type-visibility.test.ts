import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('operations table keeps the incident type visible on mobile', () => {
  const page = readFileSync(new URL('../app/admin/page.tsx', import.meta.url), 'utf8')

  assert.match(page, /text-xs text-slate-300 truncate max-w-\[80px\]/)
  assert.doesNotMatch(page, /text-xs text-slate-300 hidden sm:block truncate max-w-\[80px\]/)
})

test('reports table and exports include the incident type', () => {
  const reports = readFileSync(new URL('../app/admin/reports/page.tsx', import.meta.url), 'utf8')

  assert.match(reports, /<th[^>]*>Type<\/th>/)
  assert.match(reports, /inc\.emergency_type\?\.name/)
  assert.match(reports, /\['Reference', 'Type', 'Severity'/)
})

test('production schema includes the emergency type description selected by incident APIs', () => {
  const migration = readFileSync(
    new URL('../../supabase/migrations/20260627182104_add_emergency_type_description.sql', import.meta.url),
    'utf8'
  )

  assert.match(migration, /ADD COLUMN IF NOT EXISTS description TEXT/)
})

test('team dispatch renders the emergency type name instead of the joined object', () => {
  const teams = readFileSync(new URL('../app/admin/teams/page.tsx', import.meta.url), 'utf8')

  assert.match(teams, /incident\.emergency_type\?\.name/)
  assert.doesNotMatch(teams, /\{incident\.emergency_type \|\| incident\.type/)
})
