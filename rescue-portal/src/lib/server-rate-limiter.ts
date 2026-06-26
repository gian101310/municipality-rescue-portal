/**
 * Server-side rate limiter for API routes.
 *
 * Uses a Supabase-backed Postgres function for atomic, persistent rate limiting.
 * Unlike in-memory Maps, this survives Vercel cold starts and works across
 * all serverless function instances.
 *
 * Falls back to a permissive response if the DB call fails — we never block
 * a legitimate SOS because of a rate-limiter outage.
 */

import { createAdminClient } from '@/lib/supabase/server'

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetInSeconds: number
}

/**
 * Check and consume one request from the rate limit bucket.
 *
 * @param identifier  Unique key (e.g. "sos:1.2.3.4")
 * @param limit       Max requests allowed in the window
 * @param windowSeconds  Window duration in seconds
 */
export async function rateLimit(
  identifier: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  try {
    const admin = await createAdminClient()
    const { data, error } = await admin.rpc('check_rate_limit', {
      p_identifier: identifier,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    })

    if (error || !data) {
      console.error('Rate limit check failed:', error?.message)
      // Fail open — don't block real emergencies because the limiter is down
      return { success: true, remaining: limit, resetInSeconds: 0 }
    }

    const result = data as { success: boolean; remaining: number; reset_in_seconds: number }
    return {
      success: result.success,
      remaining: result.remaining,
      resetInSeconds: result.reset_in_seconds,
    }
  } catch (err) {
    console.error('Rate limit error:', err)
    return { success: true, remaining: limit, resetInSeconds: 0 }
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
export function rateLimitSos(ip: string): Promise<RateLimitResult> {
  return rateLimit(`sos:${ip}`, 5, 15 * 60)
}

/** Registration endpoint: 3 requests per hour per IP */
export function rateLimitRegistration(ip: string): Promise<RateLimitResult> {
  return rateLimit(`register:${ip}`, 3, 60 * 60)
}

/** Login endpoint: 10 requests per 15 minutes per IP */
export function rateLimitLogin(ip: string): Promise<RateLimitResult> {
  return rateLimit(`login:${ip}`, 10, 15 * 60)
}

/** General API: 60 requests per minute per IP */
export function rateLimitGeneral(ip: string): Promise<RateLimitResult> {
  return rateLimit(`api:${ip}`, 60, 60)
}
