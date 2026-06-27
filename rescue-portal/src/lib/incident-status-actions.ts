import type { IncidentStatus } from './types'

export function normalizeIncidentStatus(status: IncidentStatus | 'false_alarm'): IncidentStatus {
  return status === 'false_alarm' ? 'false_alert' : status
}

export function buildStatusUpdateRequest(status: IncidentStatus | 'false_alarm') {
  const normalizedStatus = normalizeIncidentStatus(status)
  return {
    status: normalizedStatus,
    reason: normalizedStatus === 'false_alert' ? 'Marked as false alarm' : '',
  }
}
