export const GPS_STALE_AFTER_SECONDS = 45

export function getGpsFreshness(lastUpdated: string | null, nowMs = Date.now()) {
  if (!lastUpdated) return { isStale: true, ageSeconds: null }
  const updatedMs = Date.parse(lastUpdated)
  if (!Number.isFinite(updatedMs)) return { isStale: true, ageSeconds: null }
  const ageSeconds = Math.max(0, Math.floor((nowMs - updatedMs) / 1000))
  return { isStale: ageSeconds > GPS_STALE_AFTER_SECONDS, ageSeconds }
}

export function formatGpsAge(ageSeconds: number | null) {
  if (ageSeconds == null) return 'time unavailable'
  if (ageSeconds < 60) return `${ageSeconds}s ago`
  const minutes = Math.floor(ageSeconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  return `${Math.floor(minutes / 60)}h ago`
}
