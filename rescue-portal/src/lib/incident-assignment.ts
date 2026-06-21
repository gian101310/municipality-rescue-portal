export function buildAssignmentPayload(rescueUnitId: string) {
  if (!rescueUnitId.trim()) throw new Error('Choose a rescue team.')
  return { rescueUnitId }
}
