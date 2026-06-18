import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { IncidentStatus, SeverityLevel } from './types'

// ============================================================
// TAILWIND CLASS MERGER
// ============================================================

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============================================================
// DATE / TIME FORMATTING
// ============================================================

/**
 * Format a date string or Date object as a localized date string.
 * Example: "June 18, 2024"
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date))
}

/**
 * Format a date string or Date object as a localized date + time string.
 * Example: "June 18, 2024, 2:30 PM"
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(date))
}

/**
 * Format a date string or Date object as a time-only string.
 * Example: "2:30 PM"
 */
export function formatTime(date: string | Date | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(date))
}

/**
 * Format a date as a relative time string (e.g., "5 minutes ago", "2 hours ago").
 * Falls back to the absolute date/time for dates older than 7 days.
 */
export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
  return formatDateTime(d)
}

/**
 * Format a duration in minutes to a human-readable string.
 * Example: 90 → "1 hr 30 min"
 */
export function formatDuration(minutes: number): string {
  if (minutes < 1) return '< 1 min'
  if (minutes < 60) return `${Math.round(minutes)} min`
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return m > 0 ? `${h} hr ${m} min` : `${h} hr`
}

/**
 * Calculate the elapsed minutes between two dates. Returns null if either is missing.
 */
export function elapsedMinutes(
  start: string | Date | null | undefined,
  end: string | Date | null | undefined = new Date()
): number | null {
  if (!start) return null
  const startMs = new Date(start as string | Date).getTime()
  const endMs = new Date((end ?? new Date()) as string | Date).getTime()
  return Math.max(0, (endMs - startMs) / 60000)
}

// ============================================================
// REFERENCE NUMBER
// ============================================================

/**
 * Generate a unique incident reference number.
 * Format: INC-YYYY-NNNNNN (e.g., INC-2024-001042)
 */
export function generateReferenceNumber(sequence: number): string {
  const year = new Date().getFullYear()
  const seq = String(sequence).padStart(6, '0')
  return `INC-${year}-${seq}`
}

/**
 * Generate a random demo reference number for preview purposes.
 */
export function generateDemoReferenceNumber(): string {
  const year = new Date().getFullYear()
  const seq = String(Math.floor(Math.random() * 999999) + 1).padStart(6, '0')
  return `INC-${year}-${seq}`
}

// ============================================================
// STATUS COLORS
// ============================================================

/** Returns a Tailwind CSS background + text class pair for an incident status badge. */
export function getStatusColor(status: IncidentStatus): string {
  const map: Record<IncidentStatus, string> = {
    submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    received: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
    verification_pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    verified: 'bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-300',
    assigned: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
    accepted: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
    preparing: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    dispatched: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    on_the_way: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    arrived: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
    operation_in_progress: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
    transporting: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    resolved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    closed: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    duplicate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    invalid: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
    false_alert: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    cancelled: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
    unable_to_contact: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    transferred: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/30 dark:text-fuchsia-300',
  }
  return map[status] ?? 'bg-gray-100 text-gray-700'
}

/** Human-readable label for an incident status. */
export function getStatusLabel(status: IncidentStatus): string {
  const map: Record<IncidentStatus, string> = {
    submitted: 'Submitted',
    received: 'Received',
    verification_pending: 'Pending Verification',
    verified: 'Verified',
    assigned: 'Assigned',
    accepted: 'Accepted',
    preparing: 'Preparing',
    dispatched: 'Dispatched',
    on_the_way: 'On the Way',
    arrived: 'Arrived',
    operation_in_progress: 'In Progress',
    transporting: 'Transporting',
    resolved: 'Resolved',
    closed: 'Closed',
    duplicate: 'Duplicate',
    invalid: 'Invalid',
    false_alert: 'False Alert',
    cancelled: 'Cancelled',
    unable_to_contact: 'Unable to Contact',
    transferred: 'Transferred',
  }
  return map[status] ?? status
}

/** Returns true if the incident is still active (not in a terminal state). */
export function isActiveStatus(status: IncidentStatus): boolean {
  const terminal: IncidentStatus[] = [
    'resolved', 'closed', 'duplicate', 'invalid',
    'false_alert', 'cancelled', 'unable_to_contact', 'transferred',
  ]
  return !terminal.includes(status)
}

// ============================================================
// SEVERITY COLORS
// ============================================================

/** Returns Tailwind classes for a severity level badge. */
export function getSeverityColor(severity: SeverityLevel): string {
  const map: Record<SeverityLevel, string> = {
    critical: 'bg-red-600 text-white dark:bg-red-700',
    high: 'bg-orange-500 text-white dark:bg-orange-600',
    medium: 'bg-yellow-400 text-yellow-900 dark:bg-yellow-500 dark:text-yellow-950',
    low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    info: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  }
  return map[severity] ?? 'bg-gray-100 text-gray-700'
}

/** Returns just a hex color for charts / map pins. */
export function getSeverityHexColor(severity: SeverityLevel): string {
  const map: Record<SeverityLevel, string> = {
    critical: '#dc2626',
    high: '#f97316',
    medium: '#eab308',
    low: '#3b82f6',
    info: '#6b7280',
  }
  return map[severity] ?? '#6b7280'
}

// ============================================================
// EMERGENCY TYPE COLOR
// ============================================================

/** Returns Tailwind background class for an emergency type by its color string. */
export function getEmergencyTypeColor(color: string): string {
  // color is stored as a hex string; wrap it for inline style usage
  return color
}

// ============================================================
// PHONE FORMATTING
// ============================================================

/**
 * Format a PH phone number for display.
 * Accepts 09XXXXXXXXX or +639XXXXXXXXX formats.
 * Example: "09171234567" → "0917-123-4567"
 */
export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '—'
  const digits = phone.replace(/\D/g, '')
  // Handle +63 prefix
  const local = digits.startsWith('63') ? '0' + digits.slice(2) : digits
  if (local.length === 11) {
    return `${local.slice(0, 4)}-${local.slice(4, 7)}-${local.slice(7)}`
  }
  return phone
}

// ============================================================
// ID MASKING
// ============================================================

/**
 * Mask an ID number for privacy, showing only the last 4 characters.
 * Example: "1234-5678-9012-3456" → "****-****-****-3456"
 */
export function maskIdNumber(idNumber: string | null | undefined): string {
  if (!idNumber) return '—'
  if (idNumber.startsWith('****')) return idNumber // already masked
  const visible = idNumber.slice(-4)
  const masked = idNumber.slice(0, -4).replace(/[^-\s]/g, '*')
  return masked + visible
}

// ============================================================
// DISTANCE CALCULATION (Haversine)
// ============================================================

const EARTH_RADIUS_KM = 6371

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Calculate the straight-line distance between two geographic coordinates
 * using the Haversine formula.
 *
 * @returns Distance in kilometers.
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_KM * c
}

/**
 * Returns a human-readable distance string.
 * Example: 0.45 → "450 m", 2.3 → "2.3 km"
 */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}

// ============================================================
// STRING UTILITIES
// ============================================================

/**
 * Capitalize the first letter of each word.
 */
export function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase())
}

/**
 * Convert snake_case to Title Case.
 * Example: "on_the_way" → "On the Way"
 */
export function snakeToTitle(str: string): string {
  return toTitleCase(str.replace(/_/g, ' '))
}

/**
 * Truncate a string to the given max length, appending "…" if truncated.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 1) + '…'
}

// ============================================================
// NUMBER UTILITIES
// ============================================================

/**
 * Format a number with thousand separators.
 */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-PH').format(n)
}

/**
 * Clamp a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
