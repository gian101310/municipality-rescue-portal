import assert from 'node:assert/strict'
import test from 'node:test'
import { requiresBarangay } from './auth-validation.ts'

test('does not require a barangay for a UAE municipality', () => {
  assert.equal(requiresBarangay('AE-DU-001'), false)
})

test('requires a barangay for a Philippine municipality', () => {
  assert.equal(requiresBarangay('035416000'), true)
})
