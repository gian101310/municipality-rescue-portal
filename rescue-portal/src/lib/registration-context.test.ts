import assert from 'node:assert/strict'
import test from 'node:test'
import { getRegistrationGeoScope } from './registration-context.ts'

test('keeps the public registration link globally selectable', () => {
  assert.deepEqual(getRegistrationGeoScope(), { level: 'country' })
})

test('uses the municipality scope only for a QR registration context', () => {
  const qrScope = { level: 'municipality' as const, regionCode: 'AE-DU-000000', municipalityCode: 'AE-DU-001' }

  assert.deepEqual(getRegistrationGeoScope(qrScope), qrScope)
})
