/**
 * Timeline event helpers for ops/admin actions.
 * Used to insert timeline entries when status changes, calls, assignments, etc. happen.
 */

import type { TimelineEventType } from '@/lib/types'

interface TimelineEventInput {
  incidentId: string
  eventType: TimelineEventType
  label: string
  description?: string
  actorId?: string
  actorName?: string
  actorRole?: string
  metadata?: Record<string, unknown>
  occurredAt?: string
}

/**
 * Build a timeline event record for insertion.
 */
export function buildTimelineEvent(input: TimelineEventInput) {
  return {
    incident_id: input.incidentId,
    event_type: input.eventType,
    label: input.label,
    description: input.description ?? null,
    actor_id: input.actorId ?? null,
    actor_name: input.actorName ?? null,
    actor_role: input.actorRole ?? null,
    metadata: input.metadata ?? {},
    occurred_at: input.occurredAt ?? new Date().toISOString(),
  }
}

/**
 * Build a timeline event for a status change.
 */
export function buildStatusChangeEvent(
  incidentId: string,
  previousStatus: string | null,
  newStatus: string,
  actor: { id: string; name: string; role: string },
  reason?: string
) {
  const statusLabels: Record<string, string> = {
    submitted: 'Submitted',
    received: 'Received by Ops',
    verification_pending: 'Verification Pending',
    verified: 'Verified',
    assigned: 'Assigned to Responder',
    accepted: 'Accepted by Responder',
    preparing: 'Preparing Response',
    dispatched: 'Dispatched',
    on_the_way: 'On The Way',
    arrived: 'Arrived On Scene',
    operation_in_progress: 'Operation In Progress',
    transporting: 'Transporting',
    resolved: 'Resolved',
    closed: 'Closed',
    false_alert: 'Marked as False Alarm',
    cancelled: 'Cancelled',
    duplicate: 'Marked as Duplicate',
    invalid: 'Marked as Invalid',
    unable_to_contact: 'Unable to Contact',
    transferred: 'Transferred',
  }

  return buildTimelineEvent({
    incidentId,
    eventType: 'status_change',
    label: statusLabels[newStatus] ?? `Status → ${newStatus}`,
    description: reason ?? `Status changed from ${previousStatus ?? 'none'} to ${newStatus}`,
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    metadata: { previous_status: previousStatus, new_status: newStatus },
  })
}

/**
 * Build a timeline event for ops calling a resident.
 */
export function buildOpsCalledEvent(
  incidentId: string,
  actor: { id: string; name: string; role: string },
  residentPhone: string
) {
  return buildTimelineEvent({
    incidentId,
    eventType: 'ops_called_resident',
    label: 'Ops Called Resident',
    description: `${actor.name} called resident at ${residentPhone}`,
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    metadata: { phone: residentPhone },
  })
}

/**
 * Build a timeline event for responder assignment.
 */
export function buildAssignmentEvent(
  incidentId: string,
  actor: { id: string; name: string; role: string },
  responderName: string,
  unitName?: string
) {
  return buildTimelineEvent({
    incidentId,
    eventType: 'responder_assigned',
    label: 'Responder Assigned',
    description: unitName
      ? `${responderName} (${unitName}) assigned by ${actor.name}`
      : `${responderName} assigned by ${actor.name}`,
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    metadata: { responder_name: responderName, unit_name: unitName },
  })
}
