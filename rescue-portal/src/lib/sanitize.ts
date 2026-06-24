/**
 * Input sanitization utilities for the Rescue Portal.
 *
 * All user-facing text inputs should be sanitized before storage.
 * These functions strip dangerous patterns while preserving legitimate content.
 */

/**
 * Strip HTML tags and script patterns from user input.
 * Does NOT encode entities — use this for data going into the database.
 */
export function sanitizeText(input: string | null | undefined): string {
  if (!input) return ''
  return input
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove script-related patterns
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    // Remove null bytes
    .replace(/\0/g, '')
    // Trim whitespace
    .trim()
}

/**
 * Sanitize and limit length of a text field.
 */
export function sanitizeField(input: string | null | undefined, maxLength = 500): string {
  return sanitizeText(input).slice(0, maxLength)
}

/**
 * Sanitize a phone number — allow only digits, +, spaces, dashes, parens.
 */
export function sanitizePhone(input: string | null | undefined): string {
  if (!input) return ''
  return input.replace(/[^\d+\s\-()]/g, '').trim().slice(0, 20)
}

/**
 * Sanitize an email address — basic validation + lowercase.
 */
export function sanitizeEmail(input: string | null | undefined): string {
  if (!input) return ''
  const cleaned = input.trim().toLowerCase().slice(0, 254)
  // Basic email pattern check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) return ''
  return cleaned
}

/**
 * Sanitize a name — allow only letters, spaces, hyphens, periods, apostrophes.
 */
export function sanitizeName(input: string | null | undefined): string {
  if (!input) return ''
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/[^\p{L}\p{M}\s.\-']/gu, '')
    .trim()
    .slice(0, 100)
}

/**
 * Sanitize a description/notes field — more permissive but still safe.
 */
export function sanitizeDescription(input: string | null | undefined): string {
  return sanitizeField(input, 2000)
}

/**
 * Sanitize coordinates — ensure valid lat/lng range.
 */
export function sanitizeCoordinate(value: unknown, type: 'lat' | 'lng'): number | null {
  const num = Number(value)
  if (isNaN(num)) return null
  if (type === 'lat' && (num < -90 || num > 90)) return null
  if (type === 'lng' && (num < -180 || num > 180)) return null
  return Math.round(num * 1000000) / 1000000 // 6 decimal places
}
