'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { AlertTriangle, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import { checkEscalations } from '@/lib/escalation-rules'
import type { EscalationResult } from '@/lib/escalation-rules'
import { playAdminNotificationSound } from '@/lib/notification-sound'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface EscalationMonitorProps {
  incidents: Array<{
    id: string
    status: string
    severity: string
    created_at: string
    updated_at: string
    reference_number?: string
    emergency_type?: { name?: string } | null
  }>
  onEscalate?: (result: EscalationResult) => void
  enabled?: boolean
}

export function EscalationMonitor({ incidents, onEscalate, enabled = true }: EscalationMonitorProps) {
  const [pendingEscalations, setPendingEscalations] = useState<(EscalationResult & { reference_number?: string; type_name?: string })[]>([])
  const processedRef = useRef<Set<string>>(new Set())

  const runCheck = useCallback(() => {
    if (!enabled || incidents.length === 0) return

    const results = checkEscalations(incidents)
    const newResults = results.filter(r => !processedRef.current.has(`${r.incidentId}-${r.ruleId}`))

    if (newResults.length > 0) {
      const enriched = newResults.map(r => {
        const incident = incidents.find(i => i.id === r.incidentId)
        return {
          ...r,
          reference_number: incident?.reference_number,
          type_name: incident?.emergency_type?.name,
        }
      })
      setPendingEscalations(prev => [...enriched, ...prev].slice(0, 20))

      for (const r of newResults) {
        processedRef.current.add(`${r.incidentId}-${r.ruleId}`)
        const incident = incidents.find(i => i.id === r.incidentId)
        toast.warning(
          `Auto-escalation: ${incident?.reference_number ?? r.incidentId.slice(0, 8)} → ${r.newSeverity.toUpperCase()}`,
          { description: r.description, duration: 10000 }
        )
        playAdminNotificationSound()
        onEscalate?.(r)
      }
    }
  }, [incidents, enabled, onEscalate])

  useEffect(() => {
    runCheck()
    const interval = setInterval(runCheck, 60000)
    return () => clearInterval(interval)
  }, [runCheck])

  if (pendingEscalations.length === 0) return null

  return (
    <Card className="bg-amber-950/30 border-amber-700/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-amber-300 text-sm flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Auto-Escalation Alerts
          <Badge className="bg-amber-600 text-white text-xs ml-auto">{pendingEscalations.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {pendingEscalations.slice(0, 5).map((esc, i) => (
          <div key={`${esc.incidentId}-${esc.ruleId}-${i}`} className="flex items-start gap-2 text-xs">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-amber-200 font-medium">
                {esc.reference_number ?? esc.incidentId.slice(0, 8)}
              </span>
              <span className="text-slate-400"> {esc.type_name ?? ''} </span>
              <span className="text-amber-400">
                {esc.previousSeverity} → {esc.newSeverity}
              </span>
              <p className="text-slate-500 mt-0.5">{esc.description}</p>
            </div>
          </div>
        ))}
        {pendingEscalations.length > 5 && (
          <p className="text-xs text-slate-500">+{pendingEscalations.length - 5} more</p>
        )}
      </CardContent>
    </Card>
  )
}
