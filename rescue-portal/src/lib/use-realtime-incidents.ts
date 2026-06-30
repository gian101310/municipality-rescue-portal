'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type {
  RealtimePostgresInsertPayload,
  RealtimePostgresUpdatePayload,
  RealtimeChannel,
} from '@supabase/supabase-js'

type UseRealtimeIncidentsOptions = {
  onNewIncident?: (payload: RealtimePostgresInsertPayload<Record<string, unknown>>) => void
  onIncidentUpdate?: (payload: RealtimePostgresUpdatePayload<Record<string, unknown>>) => void
  enabled?: boolean
}

export function useRealtimeIncidents(options: UseRealtimeIncidentsOptions): { isConnected: boolean } {
  const { onNewIncident, onIncidentUpdate, enabled = true } = options
  const [isConnected, setIsConnected] = useState(false)

  // Keep callbacks in refs so channel doesn't need to re-subscribe on every render
  const onNewRef = useRef(onNewIncident)
  const onUpdateRef = useRef(onIncidentUpdate)

  useEffect(() => {
    onNewRef.current = onNewIncident
    onUpdateRef.current = onIncidentUpdate
  }, [onNewIncident, onIncidentUpdate])

  useEffect(() => {
    if (!enabled) {
      return
    }

    const supabase = createClient()
    let channel: RealtimeChannel | null = null

    channel = supabase
      .channel('incidents-realtime')
      .on<Record<string, unknown>>(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'incidents' },
        (payload) => {
          onNewRef.current?.(payload as RealtimePostgresInsertPayload<Record<string, unknown>>)
        }
      )
      .on<Record<string, unknown>>(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'incidents' },
        (payload) => {
          onUpdateRef.current?.(payload as RealtimePostgresUpdatePayload<Record<string, unknown>>)
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
      setIsConnected(false)
    }
  }, [enabled])

  return { isConnected: enabled && isConnected }
}
