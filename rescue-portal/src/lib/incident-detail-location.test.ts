import assert from 'node:assert/strict'
import test from 'node:test'
import { getIncidentDetailMarker } from './incident-detail-location.ts'

test('creates a reporter pin for valid incident GPS coordinates', () => {
  assert.deepEqual(getIncidentDetailMarker({
    id: 'incident-1',
    latitude: 25.2048,
    longitude: 55.2708,
    referenceNumber: 'INC-123456',
    color: '#ef4444',
    isActive: true,
  }), {
    id: 'incident-1',
    lat: 25.2048,
    lng: 55.2708,
    label: 'Reporter location · 123456',
    color: '#ef4444',
    pulse: true,
  })
})

test('does not invent a reporter pin when GPS was not shared', () => {
  assert.equal(getIncidentDetailMarker({
    id: 'incident-1',
    latitude: null,
    longitude: null,
    referenceNumber: 'INC-123456',
    color: '#ef4444',
    isActive: true,
  }), null)
})
