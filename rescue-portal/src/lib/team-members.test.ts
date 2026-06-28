import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'
import { isValidTeamPosition } from './team-members.ts'

test('accepts the defined live rescue team positions', () => {
  for (const position of ['team_leader', 'driver', 'medic', 'responder', 'fire_specialist', 'communications']) assert.equal(isValidTeamPosition(position), true)
  assert.equal(isValidTeamPosition('boss'), false)
})

test('database accepts every position offered by the team member form', () => {
  const migration = readFileSync(
    new URL('../../supabase/migrations/20260628011141_expand_team_member_positions.sql', import.meta.url),
    'utf8',
  )

  for (const position of ['team_leader', 'driver', 'medic', 'responder', 'fire_specialist', 'communications']) {
    assert.match(migration, new RegExp(`'${position}'`))
  }
})

test('team member picker has an authenticated organization-scoped users endpoint', () => {
  const routeUrl = new URL('../app/api/admin/users/route.ts', import.meta.url)
  assert.equal(existsSync(routeUrl), true, 'missing /api/admin/users route used by Admin -> Teams')

  const route = readFileSync(routeUrl, 'utf8')
  assert.match(route, /getUser\(\)/)
  assert.match(route, /organization_id/)
  assert.match(route, /\.eq\('organization_id', profile\.organization_id\)/)
  assert.match(route, /'responder'/)
  assert.match(route, /'team_leader'/)
  assert.match(route, /registration_status/)
  assert.match(route, /NextResponse\.json\(\{ users:/)
})

test('select popups layer above dialogs', () => {
  const select = readFileSync(new URL('../components/ui/select.tsx', import.meta.url), 'utf8')
  const dialog = readFileSync(new URL('../components/ui/dialog.tsx', import.meta.url), 'utf8')

  assert.match(dialog, /z-\[10000\]/)
  assert.match(select, /z-\[10001\]/)
})
