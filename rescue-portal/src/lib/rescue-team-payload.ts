export type RescueTeamPayload = {
  organization_id: string
  name: string
  code: string
  status: 'available'
  is_active: boolean
  equipment: string[]
  specializations: string[]
}

export function buildStarterTeams(organizationId: string): RescueTeamPayload[] {
  return [
    ['Alpha Rescue', 'ALPHA', ['First aid kit', 'Rescue ropes'], ['Search and rescue']],
    ['Bravo Medical', 'BRAVO', ['Trauma kit', 'Stretcher'], ['Medical response']],
    ['Charlie Fire Support', 'CHARLIE', ['Fire extinguisher', 'Breathing masks'], ['Fire support']],
    ['Delta Rapid Response', 'DELTA', ['Flashlights', 'Radio'], ['Rapid response']],
  ].map(([name, code, equipment, specializations]) => ({
    organization_id: organizationId,
    name: name as string,
    code: `${code}-${organizationId.slice(0, 6).toUpperCase()}`,
    status: 'available' as const,
    is_active: true,
    equipment: equipment as string[],
    specializations: specializations as string[],
  }))
}
