/**
 * Server-side in-memory rate limiter for API routes.
 *
 * Uses a sliding-window counter per IP address.
 * Resets automatically — no cleanup cron needed because entries are
 * lazily evicted on the next request after the window expires.
 *
 * NOTE: This is per-instance. On Vercel Serverless each function cold-start
 * gets its own memory, so the effective limit is PER FUNCTION INSTANCE.
 * For a stricter global limit, swap to Upstash Redis Rate Limit later.
 * Even per-instance, this catches rapid-fire abuse (10 SOS/sec from one IP).
 */

interface WindowEntry {
  count: number
  windowStart: number
}

const store = new Map<string, WindowEntry>()

// Evict stale entries every 5 minutes to prevent memory leak
const EVICT_INTERVAL = 5 * 60 * 1000
let lastEvict = Date.now()

function evictStale(windowMs: number) {
  const now = Date.now()
  if (now - lastEvict < EVICT_INTERVAL) return
  lastEvict = now
  for (const [key, entry] of store) {
    if (now - entry.windowStart > windowMs * 2) {
      store.delete(key)
    }
  }
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetInSeconds: number
}

/**
 * Check and consume one request from the rate limit bucket.
 *
 * @param identifier  Unique key (usually IP + route prefix, e.g. "1.2.3.4:/api/resident/incidents/sos")
 * @param limit       Max requests allowed in the window
 * @param windowMs    Window duration in milliseconds
 */
export function rateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  evictStale(windowMs)

  const now = Date.now()
  const entry = store.get(identifier)

  // No existing entry or window expired — start fresh
  if (!entry || now - entry.windowStart > windowMs) {
    store.set(identifier, { count: 1, windowStart: now })
    return { success: true, remaining: limit - 1, resetInSeconds: Math.ceil(windowMs / 1000) }
  }

  // Within window — check count
  if (entry.count >= limit) {
    const resetInSeconds = Math.ceil((windowMs - (now - entry.windowStart)) / 1000)
    return { success: false, remaining: 0, resetInSeconds }
  }

  entry.count++
  return {
    success: true,
    remaining: limit - entry.count,
    resetInSeconds: Math.ceil((windowMs - (now - entry.windowStart)) / 1000),
  }
}

/**
 * Extract the client IP from Next.js request headers.
 * Works on Vercel (x-forwarded-for) and locally (falls back to 127.0.0.1).
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    // x-forwarded-for can be "client, proxy1, proxy2" — take the first
    return forwarded.split(',')[0].trim()
  }
  return headers.get('x-real-ip') ?? '127.0.0.1'
}

// ─── Preset configurations ────────────────────────────────────

/** SOS endpoint: 5 requests per 15 minutes per IP */
export function rateLimitSos(ip: string): RateLimitResult {
  return rateLimit(`sos:${ip}`, 5, 15 * 60 * 1000)
}

/** Registration endpoint: 3 requests per hour per IP */
export function rateLimitRegistration(ip: string): RateLimitResult {
  return rateLimit(`register:${ip}`, 3, 60 * 60 * 1000)
}

/** Login endpoint: 10 requests per 15 minutes per IP */
export function rateLimitLogin(ip: string): RateLimitResult {
  return rateLimit(`login:${ip}`, 10, 15 * 60 * 1000)
}

/** General API: 60 requests per minute per IP */
export function rateLimitGeneral(ip: string): RateLimitResult {
  return rateLimit(`api:${ip}`, 60, 60 * 1000)
}
