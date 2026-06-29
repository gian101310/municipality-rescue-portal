import type { OfflineSosRecord } from './types'

export const SMS_FALLBACK_THRESHOLD_MS = 10 * 60 * 1000
export const RETRY_COOLDOWN_MS = 5 * 60 * 1000
export const SYNCED_RETENTION_MS = 24 * 60 * 60 * 1000

export function shouldPromptSmsFallback(record: OfflineSosRecord, nowMs = Date.now()): boolean {
  if (record.sms_fallback_triggered || record.sync_status === 'synced') return false
  return nowMs - new Date(record.created_timestamp).getTime() >= SMS_FALLBACK_THRESHOLD_MS
}

export function canRetryOfflineSos(
  record: OfflineSosRecord,
  nowMs = Date.now(),
  online = typeof navigator === 'undefined' ? true : navigator.onLine
): boolean {
  if (!online || record.sync_status === 'synced') return false
  if (record.sync_status === 'syncing' && record.last_sync_attempt) {
    return nowMs - new Date(record.last_sync_attempt).getTime() >= RETRY_COOLDOWN_MS
  }
  if (record.sync_attempt_count < 5) return true
  if (!record.last_sync_attempt) return true
  return nowMs - new Date(record.last_sync_attempt).getTime() >= RETRY_COOLDOWN_MS
}

export function isExpiredSyncedSos(record: OfflineSosRecord, nowMs = Date.now()): boolean {
  if (record.sync_status !== 'synced') return false
  const completedAt = record.last_sync_attempt ?? record.created_timestamp
  return nowMs - new Date(completedAt).getTime() >= SYNCED_RETENTION_MS
}
