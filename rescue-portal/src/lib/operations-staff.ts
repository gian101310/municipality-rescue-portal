import type { UserRole } from './types'

export const OPERATIONS_ROLES = ['dispatcher', 'team_leader', 'responder', 'staff'] as const
export const TEAM_POSITIONS = ['team_leader', 'driver', 'medic', 'responder', 'fire_specialist', 'communications'] as const
export const MAX_STAFF_PER_TENANT = 10

export type OperationsRole = (typeof OPERATIONS_ROLES)[number]
export type TeamPosition = (typeof TEAM_POSITIONS)[number]

export function validateOperationsRole(value: unknown): OperationsRole | null {
  return typeof value === 'string' && OPERATIONS_ROLES.includes(value as OperationsRole)
    ? value as OperationsRole
    : null
}

export function validateTeamPosition(value: unknown): TeamPosition | null {
  return typeof value === 'string' && TEAM_POSITIONS.includes(value as TeamPosition)
    ? value as TeamPosition
    : null
}

export function validateTeamAssignment(teamValue: unknown, positionValue: unknown) {
  const teamId = String(teamValue ?? '').trim()
  const position = String(positionValue ?? '').trim()

  if (!teamId && !position) return { teamId: null, position: null }
  if (!teamId) throw new Error('Choose a rescue team for this position.')

  const validPosition = validateTeamPosition(position)
  if (!validPosition) throw new Error('Choose a valid team position.')

  return { teamId, position: validPosition }
}

export function canManageOperationsStaff(role: UserRole) {
  return role === 'admin' || role === 'super_admin'
}
