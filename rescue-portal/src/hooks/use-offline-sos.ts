'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import {
  generateLocalSosId,
  queueOfflineSos,
  startSyncEngine,
  stopSyncEngine,
  isOnline,
  getPendingSos,
} from '@/lib/offline-sos-queue'
import type { OfflineSosRecord } from '@/lib/types'

interface SosSubmitParams {
  residentId: string
  residentName: string
  phone: string | null
  emergencyType: string
  latitude: number
  longitude: number
  accuracy: number | null
}

interface UseOfflineSosReturn {
  /** Submit an SOS — queues offline or sends immediately */
  submitSos: (params: SosSubmitParams) => Promise<{
    success: boolean
    isOffline: boolean
    localSosId: string
    incidentId?: string
    referenceNumber?: string
  }>
  /** Current network status */
  online: boolean
  /** Number of pending offline SOS */
  pendingCount: number
  /** SMS fallback record (set when 10min offline threshold hit) */
  smsFallbackRecord: OfflineSosRecord | null
  /** Dismiss SMS fallback prompt */
  dismissSmsFallback: () => void
}

export function useOfflineSos(): UseOfflineSosReturn {
  const [online, setOnline] = useState(isOnline())
  const [pendingCount, setPendingCount] = useState(0)
  const [smsFallbackRecord, setSmsFallbackRecord] = useState<OfflineSosRecord | null>(null)
  const engineStarted = useRef(false)

  // Track online/offline status
  useEffect(() => {
    function handleOnline() { setOnline(true) }
    function handleOffline() { setOnline(false) }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Start sync engine
  useEffect(() => {
    if (engineStarted.current) return
    engineStarted.current = true

    const submitToServer = async (record: OfflineSosRecord) => {
      try {
        const res = await fetch('/api/resident/incidents/sos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: record.created_latitude,
            longitude: record.created_longitude,
            gps_accuracy: record.created_accuracy,
            local_sos_id: record.local_sos_id,
            created_timestamp: record.created_timestamp,
            network_status: record.network_status_at_creation,
          }),
        })

        if (!res.ok) return { success: false }

        const data = await res.json()
        return {
          success: true,
          incidentId: data.incident?.id,
        }
      } catch {
        return { success: false }
      }
    }

    startSyncEngine(submitToServer, (record) => {
      setSmsFallbackRecord(record)
    })

    return () => {
      stopSyncEngine()
      engineStarted.current = false
    }
  }, [])

  // Refresh pending count periodically
  useEffect(() => {
    async function refresh() {
      try {
        const pending = await getPendingSos()
        setPendingCount(pending.length)
      } catch { /* ignore */ }
    }
    refresh()
    const interval = setInterval(refresh, 5000)
    return () => clearInterval(interval)
  }, [])

  const submitSos = useCallback(async (params: SosSubmitParams) => {
    const localSosId = generateLocalSosId()
    const now = new Date().toISOString()

    if (isOnline()) {
      // Online — submit directly
      try {
        const res = await fetch('/api/resident/incidents/sos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: params.latitude,
            longitude: params.longitude,
            gps_accuracy: params.accuracy,
            local_sos_id: localSosId,
            created_timestamp: now,
            network_status: 'online',
          }),
        })

        if (res.ok) {
          const data = await res.json()
          return {
            success: true,
            isOffline: false,
            localSosId,
            incidentId: data.incident?.id,
            referenceNumber: data.referenceNumber,
          }
        }

        // Server error — queue offline as fallback
        throw new Error('Server error')
      } catch {
        // Fall through to offline queue
      }
    }

    // Offline or server error — queue locally
    const record: OfflineSosRecord = {
      local_sos_id: localSosId,
      resident_id: params.residentId,
      resident_name: params.residentName,
      phone: params.phone,
      emergency_type: params.emergencyType,
      created_latitude: params.latitude,
      created_longitude: params.longitude,
      created_accuracy: params.accuracy,
      created_timestamp: now,
      network_status_at_creation: 'offline',
      sync_status: 'queued_offline',
      sync_attempt_count: 0,
      last_sync_attempt: null,
      server_incident_id: null,
      sms_fallback_triggered: false,
    }

    await queueOfflineSos(record)
    setPendingCount(prev => prev + 1)

    return {
      success: true,
      isOffline: true,
      localSosId,
    }
  }, [])

  const dismissSmsFallback = useCallback(() => {
    setSmsFallbackRecord(null)
  }, [])

  return {
    submitSos,
    online,
    pendingCount,
    smsFallbackRecord,
    dismissSmsFallback,
  }
}
