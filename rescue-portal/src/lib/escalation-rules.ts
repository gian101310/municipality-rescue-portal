export interface EscalationRule {
  id: string
  triggerStatus: string
  thresholdMinutes: number
  targetSeverity: 'critical' | 'high' | 'medium' | null
  description: string
}

export const DEFAULT_ESCALATION_RULES: EscalationRule[] = [
  {
    id: 'esc-submitted-critical',
    triggerStatus: 'submitted',
    thresholdMinutes: 5,
    targetSeverity: null,
    description: 'Incident unacknowledged for 5+ minutes — severity auto-escalated',
  },
  {
    id: 'esc-submitted-urgent',
    triggerStatus: 'submitted',
    thresholdMinutes: 15,
    targetSeverity: 'critical',
    description: 'Incident unacknowledged for 15+ minutes — escalated to CRITICAL',
  },
  {
    id: 'esc-assigned-no-accept',
    triggerStatus: 'assigned',
    thresholdMinutes: 10,
    targetSeverity: null,
    description: 'Assigned unit has not accepted for 10+ minutes — severity bumped',
  },
  {
    id: 'esc-dispatched-no-arrival',
    triggerStatus: 'dispatched',
    thresholdMinutes: 30,
    targetSeverity: 'high',
    description: 'Dispatched unit has not arrived for 30+ minutes — escalated to HIGH',
  },
]

const SEVERITY_ORDER: string[] = ['info', 'low', 'medium', 'high', 'critical']

export function bumpSeverity(current: string): string {
  const idx = SEVERITY_ORDER.indexOf(current)
  if (idx === -1 || idx >= SEVERITY_ORDER.length - 1) return 'critical'
  return SEVERITY_ORDER[idx + 1]
}

export interface EscalationResult {
  incidentId: string
  ruleId: string
  previousSeverity: string
  newSeverity: string
  description: string
  minutesElapsed: number
}

export function checkEscalations(
  incidents: Array<{
    id: string
    status: string
    severity: string
    created_at: string
    updated_at: string
  }>,
  rules: EscalationRule[] = DEFAULT_ESCALATION_RULES,
  now: Date = new Date()
): EscalationResult[] {
  const results: EscalationResult[] = []

  for (const incident of incidents) {
    const statusEnteredAt = new Date(incident.updated_at)
    const minutesInStatus = (now.getTime() - statusEnteredAt.getTime()) / 60000

    for (const rule of rules) {
      if (incident.status !== rule.triggerStatus) continue
      if (minutesInStatus < rule.thresholdMinutes) continue

      const newSeverity = rule.targetSeverity ?? bumpSeverity(incident.severity)
      if (SEVERITY_ORDER.indexOf(newSeverity) <= SEVERITY_ORDER.indexOf(incident.severity)) continue

      results.push({
        incidentId: incident.id,
        ruleId: rule.id,
        previousSeverity: incident.severity,
        newSeverity,
        description: rule.description,
        minutesElapsed: Math.round(minutesInStatus),
      })
      break
    }
  }

  return results
}
