/**
 * Client-side rate limiter for emergency submissions
 * Prevents abuse of the emergency report form
 */

interface RateLimitEntry {
  count: number
  firstAttempt: number
}

const STORAGE_KEY = 'rescue_portal_rate_limit'
const MAX_SUBMISSIONS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes

export function checkRateLimit(): { allowed: boolean; remaining: number; resetIn: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const entry: RateLimitEntry = raw ? JSON.parse(raw) : { count: 0, firstAttempt: Date.now() }

    // Reset if window has passed
    if (Date.now() - entry.firstAttempt > WINDOW_MS) {
      const fresh = { count: 0, firstAttempt: Date.now() }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh))
      return { allowed: true, remaining: MAX_SUBMISSIONS, resetIn: 0 }
    }

    const remaining = MAX_SUBMISSIONS - entry.count
    const resetIn = Math.ceil((WINDOW_MS - (Date.now() - entry.firstAttempt)) / 1000)

    return {
      allowed: entry.count < MAX_SUBMISSIONS,
      remaining: Math.max(0, remaining),
      resetIn,
    }
  } catch {
    return { allowed: true, remaining: MAX_SUBMISSIONS, resetIn: 0 }
  }
}

export function recordSubmission(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const entry: RateLimitEntry = raw ? JSON.parse(raw) : { count: 0, firstAttempt: Date.now() }

    if (Date.now() - entry.firstAttempt > WINDOW_MS) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ count: 1, firstAttempt: Date.now() }))
    } else {
      entry.count++
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entry))
    }
  } catch {
    // Non-critical
  }
}
