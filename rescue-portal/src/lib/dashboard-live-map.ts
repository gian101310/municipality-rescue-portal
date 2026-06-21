import type { SeverityLevel } from './types'

type DashboardMapIncident = {
  id: string
  latitude: number | null
  longitude: number | null
  reference_number: string | null
  severity: SeverityLevel
  status: string
}

const CLOSED_STATUSES = new Set([
  'resolved', 'closed', 'duplicate', 'invalid', 'false_alert', 'cancelled', 'unable_to_contact', 'transferred',
])

export function buildDashboardIncidentMarkers(incidents: DashboardMapIncident[]) {
  return incidents.flatMap((incident) => {
    if (
      CLOSED_STATUSES.has(incident.status)
      || typeof incident.latitude !== 'number'
      || typeof incident.longitude !== 'number'
      || !Number.isFinite(incident.latitude)
      || !Number.isFinite(incident.longitude)
    ) return []

    return [{
      id: incident.id,
      lat: incident.latitude,
      lng: incident.longitude,
      label: incident.reference_number ?? 'Incoming SOS',
      severity: incident.severity,
      pulse: true,
    }]
  })
}
