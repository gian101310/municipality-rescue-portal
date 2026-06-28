import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'
import {
  MAX_STAFF_PER_TENANT,
  validateOperationsRole,
  validateTeamAssignment,
} from './operations-staff.ts'

test('tenant admins cannot create privileged roles', () => {
  assert.equal(validateOperationsRole('admin'), null)
  assert.equal(validateOperationsRole('super_admin'), null)
  assert.equal(validateOperationsRole('resident'), null)
  assert.equal(validateOperationsRole('responder'), 'responder')
  assert.equal(validateOperationsRole('team_leader'), 'team_leader')
})

test('team assignment requires both a team and valid position', () => {
  assert.deepEqual(validateTeamAssignment('', ''), { teamId: null, position: null })
  assert.equal(validateTeamAssignment('team-1', 'medic').position, 'medic')
  assert.throws(() => validateTeamAssignment('team-1', ''), /position/i)
  assert.throws(() => validateTeamAssignment('', 'driver'), /team/i)
  assert.throws(() => validateTeamAssignment('team-1', 'boss'), /position/i)
})

test('staff limit remains bounded per tenant', () => {
  assert.equal(MAX_STAFF_PER_TENANT, 10)
})

test('tenant staff routes enforce organization scope, rollback and audit identity', () => {
  const createUrl = new URL('../app/api/admin/staff/route.ts', import.meta.url)
  const updateUrl = new URL('../app/api/admin/staff/[id]/route.ts', import.meta.url)
  assert.equal(existsSync(createUrl), true)
  assert.equal(existsSync(updateUrl), true)

  const createRoute = readFileSync(createUrl, 'utf8')
  const updateRoute = readFileSync(updateUrl, 'utf8')

  assert.match(createRoute, /\.eq\('organization_id', auth\.profile\.organization_id\)/)
  assert.match(createRoute, /deleteUser\(createdAuthUserId\)/)
  assert.match(createRoute, /actorId: auth\.profile\.id/)
  assert.match(updateRoute, /\.eq\('organization_id', auth\.profile\.organization_id\)/)
  assert.match(updateRoute, /actorId: auth\.profile\.id/)
  assert.doesNotMatch(createRoute, /user_metadata.*authorization/i)
})
