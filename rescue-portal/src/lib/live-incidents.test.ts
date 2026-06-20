import assert from 'node:assert/strict'
import test from 'node:test'
import { mergeLiveIncident } from './live-incidents.ts'

test('places a newly received incident at the top without duplicates', () => {
  const existing = [{ id: 'existing', status: 'received' }]
  const incoming = { id: 'incoming', status: 'submitted' }

  assert.deepEqual(mergeLiveIncident(existing, incoming), [incoming, existing[0]])
  assert.deepEqual(mergeLiveIncident([incoming, existing[0]], incoming), [incoming, existing[0]])
})

test('merges a live status update into its existing incident', () => {
  const existing = [{ id: 'incident-1', status: 'received', reference_number: 'INC-1' }]

  assert.deepEqual(
    mergeLiveIncident(existing, { id: 'incident-1', status: 'dispatched' }),
    [{ id: 'incident-1', status: 'dispatched', reference_number: 'INC-1' }],
  )
})
