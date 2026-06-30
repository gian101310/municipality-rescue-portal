import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('audit page loads tenant-scoped live records', () => {
  const page = readFileSync(new URL('../app/admin/audit/page.tsx', import.meta.url), 'utf8')
  const route = readFileSync(new URL('../app/api/admin/audit/route.ts', import.meta.url), 'utf8')

  assert.doesNotMatch(page, /DEMO_AUDIT_LOGS/)
  assert.match(page, /fetch\('\/api\/admin\/audit'/)
  assert.match(route, /\.eq\('organization_id', profile\.organization_id\)/)
  assert.match(route, /\.order\('created_at', \{ ascending: false \}\)/)
})

test('resident and admin notification surfaces do not use fixtures', () => {
  const residentLayout = readFileSync(new URL('../app/resident/layout.tsx', import.meta.url), 'utf8')
  const center = readFileSync(new URL('../components/notification-center.tsx', import.meta.url), 'utf8')
  const route = readFileSync(new URL('../app/api/notifications/route.ts', import.meta.url), 'utf8')

  assert.doesNotMatch(residentLayout, /DEMO_NOTIFICATIONS/)
  assert.doesNotMatch(center, /DEMO_NOTIFICATIONS/)
  assert.match(route, /\.eq\('user_id', profile\.id\)/)
  assert.match(route, /is_read/)
})

test('shift schedule uses persisted tenant data', () => {
  const page = readFileSync(new URL('../app/admin/teams/shifts/page.tsx', import.meta.url), 'utf8')
  const route = readFileSync(new URL('../app/api/admin/shifts/route.ts', import.meta.url), 'utf8')

  assert.doesNotMatch(page, /DEMO_RESCUE_UNITS|generateDemoShifts|demo mode/i)
  assert.match(page, /fetch\(`\/api\/admin\/shifts\?week=/)
  assert.match(route, /rescue_unit_shifts/)
  assert.match(route, /\.eq\('organization_id', organizationId\)/)
})

test('incident attachments are authenticated and persisted to storage', () => {
  const route = readFileSync(new URL('../app/api/resident/incidents/attachments/route.ts', import.meta.url), 'utf8')
  const page = readFileSync(new URL('../app/resident/emergency/page.tsx', import.meta.url), 'utf8')

  assert.doesNotMatch(route, /TODO|Attachment received/)
  assert.match(route, /auth\.getUser\(\)/)
  assert.match(route, /\.storage\.from\('incident-attachments'\)\.upload/)
  assert.match(route, /\.from\('incident_attachments'\)\.insert/)
  assert.match(route, /\.storage\.from\('incident-attachments'\)\.remove/)
  assert.match(page, /if \(!upload\.ok\)/)
})

test('team member removal calls a real tenant-scoped endpoint', () => {
  const page = readFileSync(new URL('../app/admin/teams/page.tsx', import.meta.url), 'utf8')
  const route = readFileSync(new URL('../app/api/admin/teams/[id]/members/route.ts', import.meta.url), 'utf8')
  assert.doesNotMatch(page, /would be removed|pending member removal endpoint/)
  assert.match(page, /method: 'DELETE'/)
  assert.match(route, /export async function DELETE/)
  assert.match(route, /left_at/)
})

test('operations map consumes the live team API response', () => {
  const page = readFileSync(new URL('../app/admin/map/page.tsx', import.meta.url), 'utf8')
  assert.match(page, /payload\?\.teams/)
  assert.doesNotMatch(page, /Team data will appear here|placeholder until teams/i)
})

test('organization settings contain no simulated controls and persist editable fields', () => {
  const page = readFileSync(new URL('../app/admin/settings/page.tsx', import.meta.url), 'utf8')
  const settingsRoute = readFileSync(new URL('../app/api/admin/organization-settings/route.ts', import.meta.url), 'utf8')
  const logoRoute = readFileSync(new URL('../app/api/admin/organization-logo/route.ts', import.meta.url), 'utf8')

  assert.doesNotMatch(page, /Demo:|ABCDefGHIjklMNOpqRSTuvWXyz|-1001000000001/)
  assert.doesNotMatch(page, /Click to upload organization logo/)
  assert.match(page, /\/api\/admin\/organization-logo/)
  assert.match(settingsRoute, /const name = String\(body\.name/)
  assert.match(settingsRoute, /email:/)
  assert.match(settingsRoute, /map_center_lat:/)
  assert.match(logoRoute, /\.storage\s*\.from\('organization-assets'\)\s*\.upload/)
  assert.match(logoRoute, /logo_url/)

  const coverageApplication = page.match(/function applyCoverageScope[\s\S]*?\n  }/)?.[0] ?? ''
  assert.doesNotMatch(coverageApplication, /setOrgName/)
})

test('dispatch does not advertise or confirm unsupported municipality transfers', () => {
  const page = readFileSync(new URL('../app/dispatch/page.tsx', import.meta.url), 'utf8')

  assert.doesNotMatch(page, /transferToMunicipality|Transfer to (Nearest|Another) Municipality/)
  assert.doesNotMatch(page, /Transfer request sent|Incident forwarded|\bBETA\b/)
})

test('resident verification describes only identity data that was actually submitted', () => {
  const page = readFileSync(new URL('../app/admin/verification/page.tsx', import.meta.url), 'utf8')

  assert.doesNotMatch(page, /ID scan would be shown here in production/)
  assert.match(page, /No ID document was uploaded/)
})

test('incident internal notes are saved through a tenant-scoped endpoint', () => {
  const page = readFileSync(new URL('../app/admin/incidents/[id]/page.tsx', import.meta.url), 'utf8')
  const route = readFileSync(new URL('../app/api/admin/incidents/[id]/notes/route.ts', import.meta.url), 'utf8')

  assert.match(page, /fetch\(`\/api\/admin\/incidents\/\$\{incident\.id\}\/notes`/)
  assert.match(page, /method: 'POST'/)
  assert.match(route, /organization_id/)
  assert.match(route, /\.from\('incident_notes'\)/)
  assert.match(route, /is_internal: true/)
  assert.doesNotMatch(page, /function handleAddNote\(\) \{\s*if \(!note\.trim\(\)\) return\s*toast\.success/s)
})

test('QR posters never render a decorative non-scannable fallback', () => {
  const page = readFileSync(new URL('../app/admin/qr-posters/page.tsx', import.meta.url), 'utf8')

  assert.doesNotMatch(page, /generateQRMatrix|QRCodeSVG/)
  assert.match(page, /QRCode\.toDataURL/)
  assert.match(page, /Generating secure QR code/)
})

test('incident detail loads the assigned rescue unit from live tenant data', () => {
  const page = readFileSync(new URL('../app/admin/incidents/[id]/page.tsx', import.meta.url), 'utf8')

  assert.doesNotMatch(page, /const assignedUnit = null/)
  assert.match(page, /fetch\('\/api\/admin\/teams'/)
  assert.match(page, /setAssignedUnit/)
})
