import assert from 'node:assert/strict'
import test from 'node:test'
import { buildEscalationPayload, buildVerificationRequest } from './incident-actions.ts'

test('builds live verification and escalation payloads', () => {
  assert.deepEqual(buildVerificationRequest(), { status: 'verified', reason: '' })
  assert.deepEqual(buildEscalationPayload('Immediate danger'), { severity: 'critical', reason: 'Immediate danger' })
})
