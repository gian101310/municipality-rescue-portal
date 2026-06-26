/**
 * Audit logger — writes to the audit_logs table for critical actions.
 *
 * Uses the admin (service_role) client to bypass RLS.
 * Fire-and-forget by default: never blocks the main response.
 */

import { createAdminClient } from '@/lib/supabase/server'

export type AuditAction =
  | 'create' | 'update' | 'delete'
  | 'login' | 'logout'
  | 'assign' | 'unassign'
  | 'status_change'
  | 'approve' | 'reject' | 'verify'
  | 'export' | 'view'

export interface AuditEntry {
  /** The user performing the action */
  actorId: string | null
  actorName: string
  actorRole: string
  /** What happened */
  action: AuditAction
  /** What type of entity was affected */
  entityType: string
  /** The ID of the affected entity */
  entityId?: string | null
  /** State before the change */
  previousValues?: Record<string, unknown> | null
  /** State after the change */
  newValues?: Record<string, unknown> | null
  /** Request metadata */
  ipAddress?: string | null
  userAgent?: string | null
  organizationId?: string | null
}

/**
 * Log an audit entry. Non-blocking — errors are logged to console, never thrown.
 */
export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    const admin = await createAdminClient() as unknown as {
      from(table: string): { insert(values: Record<string, unknown>): Promise<{ error: { message: string } | null }> }
    }
    const { error } = await admin.from('audit_logs').insert({
      actor_id: entry.actorId,
      actor_name: entry.actorName,
      actor_role: entry.actorRole,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId ?? null,
      previous_values: entry.previousValues ?? null,
      new_values: entry.newValues ?? null,
      ip_address: entry.ipAddress ?? null,
      user_agent: entry.userAgent ?? null,
      organization_id: entry.organizationId ?? null,
    })
    if (error) {
      console.error('Audit log write failed:', error.message)
    }
  } catch (err) {
    console.error('Audit logger error:', err)
  }
}

/**
 * Convenience: extract IP and user-agent from request headers.
 */
export function auditRequestMeta(headers: Headers) {
  const forwarded = headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : headers.get('x-real-ip') ?? null
  return {
    ipAddress: ip,
    userAgent: headers.get('user-agent')?.slice(0, 500) ?? null,
  }
}
