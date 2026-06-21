export type IncidentDetailLocation = {
  id: string
  latitude: number | null
  longitude: number | null
  referenceNumber: string | null
  color: string
  isActive: boolean
}

export function getIncidentDetailMarker(location: IncidentDetailLocation) {
  if (
    typeof location.latitude !== 'number'
    || typeof location.longitude !== 'number'
    || !Number.isFinite(location.latitude)
    || !Number.isFinite(location.longitude)
  ) return null

  return {
    id: location.id,
    lat: location.latitude,
    lng: location.longitude,
    label: `Reporter location · ${location.referenceNumber?.slice(-6) ?? 'incident'}`,
    color: location.color,
    pulse: location.isActive,
  }
}
