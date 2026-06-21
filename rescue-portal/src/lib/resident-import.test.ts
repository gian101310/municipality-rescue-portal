import assert from 'node:assert/strict'
import test from 'node:test'
import { RESIDENT_CSV_HEADER, buildResidentCsvTemplate } from './resident-import.ts'

test('creates a resident CSV template with emergency contact columns', () => {
  assert.equal(RESIDENT_CSV_HEADER, 'Full Name,Phone,Email,Barangay,Address,Emergency Contact Name,Emergency Contact Phone,Relationship')
  assert.match(buildResidentCsvTemplate(), /Emergency Contact Phone/)
})
