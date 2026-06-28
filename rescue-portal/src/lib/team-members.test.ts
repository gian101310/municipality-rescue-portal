import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
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
