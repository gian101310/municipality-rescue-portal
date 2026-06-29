import assert from 'node:assert/strict'
import test from 'node:test'
import type { OfflineSosRecord } from './types.ts'
import {
  canRetryOfflineSos,
  isExpiredSyncedSos,
  shouldPromptSmsFallback,
} from './offline-sos-policy.ts'

const createdAt = '2026-06-29T00:00:00.000Z'

function record(overrides: Partial<OfflineSosRecord> = {}): OfflineSosRecord {
  return {
    local_sos_id: 'sos-1',
    resident_id: 'resident-1',
    resident_name: 'Resident',
    phone: null,
    emergency_type: 'Emergency SOS',
    created_latitude: 14.1,
    created_longitude: 121.1,
    created_accuracy: 8,
    created_timestamp: createdAt,
    network_status_at_creation: 'offline',
    sync_status: 'queued_offline',
    sync_attempt_count: 0,
    last_sync_attempt: null,
    server_incident_id: null,
    sms_fallback_triggered: false,
    ...overrides,
  }
}

test('SMS fallback becomes due after ten minutes even while still offline', () => {
  const now = new Date(createdAt).getTime() + 11 * 60_000
  assert.equal(shouldPromptSmsFallback(record(), now), true)
  assert.equal(shouldPromptSmsFallback(record({ sms_fallback_triggered: true }), now), false)
})

test('failed SOS retries after a cooldown instead of remaining failed forever', () => {
  const now = new Date(createdAt).getTime() + 20 * 60_000
  assert.equal(canRetryOfflineSos(record({ sync_attempt_count: 5 }), now, false), false)
  assert.equal(canRetryOfflineSos(record({
    sync_attempt_count: 5,
    last_sync_attempt: new Date(now - 6 * 60_000).toISOString(),
  }), now, true), true)
  assert.equal(canRetryOfflineSos(record({
    sync_attempt_count: 5,
    last_sync_attempt: new Date(now - 60_000).toISOString(),
  }), now, true), false)
  assert.equal(canRetryOfflineSos(record({
    sync_status: 'syncing',
    last_sync_attempt: new Date(now - 6 * 60_000).toISOString(),
  }), now, true), true)
})

test('synced queue entries expire after 24 hours', () => {
  const now = new Date(createdAt).getTime() + 25 * 60 * 60_000
  assert.equal(isExpiredSyncedSos(record({ sync_status: 'synced' }), now), true)
  assert.equal(isExpiredSyncedSos(record(), now), false)
})
