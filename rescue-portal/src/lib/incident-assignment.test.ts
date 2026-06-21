import assert from 'node:assert/strict'
import test from 'node:test'
import { buildAssignmentPayload } from './incident-assignment.ts'

test('requires a rescue team id for assignment', () => {
  assert.deepEqual(buildAssignmentPayload('unit-1'), { rescueUnitId: 'unit-1' })
  assert.throws(() => buildAssignmentPayload(''))
})
