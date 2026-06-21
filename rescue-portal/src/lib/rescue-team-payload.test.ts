import assert from 'node:assert/strict'
import test from 'node:test'
import { buildStarterTeams } from './rescue-team-payload.ts'

test('creates four editable starter teams for an organization', () => {
  assert.deepEqual(buildStarterTeams('org-1').map((team) => team.name), ['Alpha Rescue', 'Bravo Medical', 'Charlie Fire Support', 'Delta Rapid Response'])
})
