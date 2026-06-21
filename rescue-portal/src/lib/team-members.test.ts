import assert from 'node:assert/strict'
import test from 'node:test'
import { isValidTeamPosition } from './team-members.ts'

test('accepts the defined live rescue team positions', () => {
  for (const position of ['team_leader', 'driver', 'medic', 'responder', 'fire_specialist', 'communications']) assert.equal(isValidTeamPosition(position), true)
  assert.equal(isValidTeamPosition('boss'), false)
})
