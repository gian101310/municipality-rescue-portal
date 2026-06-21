export const TEAM_POSITIONS = ['team_leader', 'driver', 'medic', 'responder', 'fire_specialist', 'communications'] as const
export type TeamPosition = typeof TEAM_POSITIONS[number]

export function isValidTeamPosition(position: string): position is TeamPosition {
  return TEAM_POSITIONS.includes(position as TeamPosition)
}
