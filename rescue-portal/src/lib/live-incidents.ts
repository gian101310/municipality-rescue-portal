export function mergeLiveIncident<T extends { id: string }>(existing: T[], incoming: Partial<T> & { id: string }): T[] {
  const matchingIncident = existing.find((incident) => incident.id === incoming.id)

  if (matchingIncident) {
    return existing.map((incident) => (
      incident.id === incoming.id ? { ...incident, ...incoming } : incident
    ))
  }

  return [incoming as T, ...existing]
}
