import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildIncidentReference,
  mapEmergencyTypeToSeverityKey,
  validateIncidentSubmission,
} from './incident-submission.ts'

describe('incident submission helpers', () => {
  it('rejects an incident without a description', () => {
    const result = validateIncidentSubmission({
      emergency_type_id: 'et-fire',
      emergency_type_name: 'Fire',
      description: '   ',
      affected_count: 1,
      latitude: 14.1,
      longitude: 121.2,
    })

    assert.equal(result.ok, false)
    assert.equal(result.message, 'Describe the emergency.')
  })

  it('requires GPS coordinates', () => {
    const result = validateIncidentSubmission({
      emergency_type_id: 'et-fire',
      emergency_type_name: 'Fire',
      description: 'House fire near the market',
      affected_count: 1,
      latitude: null,
      longitude: 121.2,
    })

    assert.equal(result.ok, false)
    assert.equal(result.message, 'Share your current location before submitting.')
  })

  it('maps demo emergency type ids to severity scoring keys', () => {
    assert.equal(mapEmergencyTypeToSeverityKey('et-fire', 'Fire'), 'fire')
    assert.equal(mapEmergencyTypeToSeverityKey('et-collapse', 'Structure Collapse'), 'structure_collapse')
    assert.equal(mapEmergencyTypeToSeverityKey('unknown', 'Medical Emergency'), 'medical')
  })

  it('builds production incident reference numbers with date and six digit sequence', () => {
    const reference = buildIncidentReference(new Date('2026-06-19T08:00:00Z'), 42)

    assert.equal(reference, 'INC-20260619-000042')
  })
})

