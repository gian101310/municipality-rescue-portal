import assert from 'node:assert/strict'
import test from 'node:test'
import { buildStatusUpdateRequest } from './incident-status-actions.ts'

test('builds a real dispatch status request', () => {
  assert.deepEqual(buildStatusUpdateRequest('dispatched'), { status: 'dispatched', reason: '' })
})

test('builds a real resolve status request', () => {
  assert.deepEqual(buildStatusUpdateRequest('resolved'), { status: 'resolved', reason: '' })
})
