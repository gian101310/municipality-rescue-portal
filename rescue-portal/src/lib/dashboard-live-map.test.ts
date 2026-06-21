import assert from 'node:assert/strict'
import test from 'node:test'
import { buildDashboardIncidentMarkers } from './dashboard-live-map.ts'

test('uses every active incident with GPS coordinates as a dashboard map pin', () => {
  const markers = buildDashboardIncidentMarkers([
    { id: 'gps-incident', latitude: 14.5995, longitude: 120.9842, reference_number: 'INC-1', severity: 'critical', status: 'submitted' },
    { id: 'no-gps', latitude: null, longitude: null, reference_number: 'INC-2', severity: 'high', status: 'submitted' },
    { id: 'resolved', latitude: 14.61, longitude: 121, reference_number: 'INC-3', severity: 'medium', status: 'resolved' },
  ])

  assert.deepEqual(markers, [{
    id: 'gps-incident',
    lat: 14.5995,
    lng: 120.9842,
    label: 'INC-1',
    severity: 'critical',
    pulse: true,
  }])
})
