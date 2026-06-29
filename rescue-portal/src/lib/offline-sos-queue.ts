/**
 * Offline SOS Queue — IndexedDB-backed queue with auto-retry
 *
 * Flow:
 * 1. Resident taps SOS → GPS captured + timestamp stored
 * 2. If online → submit immediately, record as 'live'
 * 3. If offline → store in IndexedDB with status 'queued_offline'
 * 4. When online again → auto-retry queued items
 * 5. Duplicate prevention via local_sos_id (unique per device)
 * 6. After 10 minutes offline → SMS fallback prompt
 */

import type { OfflineSosRecord, OfflineSosStatus } from '@/lib/types'
import {
  canRetryOfflineSos,
  isExpiredSyncedSos,
  shouldPromptSmsFallback,
} from '@/lib/offline-sos-policy'

const DB_NAME = 'rescue_portal_offline'
const DB_VERSION = 1
const STORE_NAME = 'sos_queue'
const RETRY_INTERVAL_MS = 15_000 // 15 seconds between retries

let dbPromise: Promise<IDBDatabase> | null = null

// ── IndexedDB Setup ────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'local_sos_id' })
        store.createIndex('sync_status', 'sync_status', { unique: false })
        store.createIndex('created_timestamp', 'created_timestamp', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      dbPromise = null
      reject(request.error)
    }
  })

  return dbPromise
}

// ── Queue Operations ───────────────────────────────────────

/**
 * Generate a unique local SOS ID for duplicate prevention.
 */
export function generateLocalSosId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).slice(2, 8)
  return `sos_${timestamp}_${random}`
}

/**
 * Add an SOS to the offline queue.
 */
export async function queueOfflineSos(record: OfflineSosRecord): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)

    // Check for duplicate first
    const getReq = store.get(record.local_sos_id)
    getReq.onsuccess = () => {
      if (getReq.result) {
        // Duplicate — skip
        resolve()
        return
      }
      const addReq = store.add(record)
      addReq.onsuccess = () => resolve()
      addReq.onerror = () => reject(addReq.error)
    }
    getReq.onerror = () => reject(getReq.error)
  })
}

/**
 * Get all pending/queued SOS records.
 */
export async function getPendingSos(): Promise<OfflineSosRecord[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const index = store.index('sync_status')

    const results: OfflineSosRecord[] = []
    const statuses: OfflineSosStatus[] = ['pending', 'queued_offline', 'syncing', 'failed']

    let completed = 0
    statuses.forEach(status => {
      const req = index.getAll(status)
      req.onsuccess = () => {
        results.push(...(req.result as OfflineSosRecord[]))
        completed++
        if (completed === statuses.length) {
          resolve(results.sort((a, b) =>
            new Date(a.created_timestamp).getTime() - new Date(b.created_timestamp).getTime()
          ))
        }
      }
      req.onerror = () => reject(req.error)
    })
  })
}

/**
 * Update the sync status of a queued SOS.
 */
export async function updateSosStatus(
  localSosId: string,
  updates: Partial<Pick<OfflineSosRecord, 'sync_status' | 'sync_attempt_count' | 'last_sync_attempt' | 'server_incident_id' | 'sms_fallback_triggered'>>
): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const getReq = store.get(localSosId)

    getReq.onsuccess = () => {
      if (!getReq.result) {
        resolve()
        return
      }
      const updated = { ...getReq.result, ...updates }
      const putReq = store.put(updated)
      putReq.onsuccess = () => resolve()
      putReq.onerror = () => reject(putReq.error)
    }
    getReq.onerror = () => reject(getReq.error)
  })
}

/**
 * Remove a successfully synced SOS from the queue.
 */
export async function removeSyncedSos(localSosId: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.delete(localSosId)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

/**
 * Get all SOS records (for history display).
 */
export async function getAllQueuedSos(): Promise<OfflineSosRecord[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result as OfflineSosRecord[])
    req.onerror = () => reject(req.error)
  })
}

async function cleanupExpiredSyncedSos(): Promise<void> {
  const records = await getAllQueuedSos()
  await Promise.all(
    records.filter((record) => isExpiredSyncedSos(record)).map((record) => removeSyncedSos(record.local_sos_id))
  )
}

// ── Sync Engine ────────────────────────────────────────────

type SyncCallback = (record: OfflineSosRecord) => Promise<{ success: boolean; incidentId?: string }>

let syncInterval: ReturnType<typeof setInterval> | null = null
let onSmsFallback: ((record: OfflineSosRecord) => void) | null = null
let onlineHandler: (() => void) | null = null
let syncRunning = false

/**
 * Start the auto-sync engine. Checks for pending items and retries on interval.
 */
export function startSyncEngine(
  submitFn: SyncCallback,
  smsFallbackFn?: (record: OfflineSosRecord) => void
): void {
  if (syncInterval) return
  onSmsFallback = smsFallbackFn ?? null

  async function syncPending() {
    if (syncRunning) return
    syncRunning = true

    try {
      await cleanupExpiredSyncedSos()
      const pending = await getPendingSos()
      const online = navigator.onLine
      for (const record of pending) {
        if (shouldPromptSmsFallback(record) && onSmsFallback) {
          onSmsFallback(record)
          await updateSosStatus(record.local_sos_id, { sms_fallback_triggered: true })
        }

        if (!canRetryOfflineSos(record, Date.now(), online)) continue

        await updateSosStatus(record.local_sos_id, {
          sync_status: 'syncing',
          sync_attempt_count: record.sync_attempt_count + 1,
          last_sync_attempt: new Date().toISOString(),
        })

        let result: { success: boolean; incidentId?: string }
        try {
          result = await submitFn(record)
        } catch {
          result = { success: false }
        }

        if (result.success) {
          await updateSosStatus(record.local_sos_id, {
            sync_status: 'synced',
            server_incident_id: result.incidentId,
          })
        } else {
          await updateSosStatus(record.local_sos_id, {
            sync_status: record.sync_attempt_count + 1 >= 5 ? 'failed' : 'queued_offline',
          })
        }
      }
    } catch {
      // IndexedDB can be temporarily unavailable (for example in private mode).
      // The next interval or online event will retry without losing the record.
    } finally {
      syncRunning = false
    }
  }

  // Initial sync
  void syncPending()

  // Periodic retry
  syncInterval = setInterval(syncPending, RETRY_INTERVAL_MS)

  // Also sync when coming back online
  if (typeof window !== 'undefined') {
    onlineHandler = () => void syncPending()
    window.addEventListener('online', onlineHandler)
  }
}

/**
 * Stop the auto-sync engine.
 */
export function stopSyncEngine(): void {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
  }
  if (typeof window !== 'undefined' && onlineHandler) {
    window.removeEventListener('online', onlineHandler)
    onlineHandler = null
  }
  onSmsFallback = null
}

// ── Network Status Helper ──────────────────────────────────

export function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true
  return navigator.onLine
}

/**
 * Check if an SOS should trigger SMS fallback based on time elapsed.
 */
export function shouldTriggerSmsFallback(createdTimestamp: string): boolean {
  return Date.now() - new Date(createdTimestamp).getTime() >= 10 * 60 * 1000
}
