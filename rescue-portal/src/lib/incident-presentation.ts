type EmergencyTypeLike = {
  id: string
  name?: string | null
  icon?: string | null
  color?: string | null
  description?: string | null
}

export function attachEmergencyTypes(
  incidents: Record<string, unknown>[],
  emergencyTypes: EmergencyTypeLike[]
) {
  const emergencyTypeById = new Map(emergencyTypes.map((item) => [item.id, item]))

  return incidents.map((incident) => {
    const type = emergencyTypeById.get(String(incident.emergency_type_id ?? ''))

    return {
      ...incident,
      emergency_type: {
        id: type?.id ?? String(incident.emergency_type_id ?? 'unknown'),
        name: type?.name ?? 'Emergency',
        icon: type?.icon ?? 'AlertTriangle',
        color: type?.color ?? '#ef4444',
        description: type?.description ?? null,
      },
    }
  })
}

