import type { IncidentStatus } from './types'

export function buildStatusUpdateRequest(status: IncidentStatus) {
  return { status, reason: '' }
}
