/**
 * Trusted Resident Session — 90-day persistent login
 *
 * Flow:
 * 1. Resident logs in → prompted with "Trust this device?"
 * 2. If yes → a trusted_sessions row is created, token stored in localStorage
 * 3. On return visit, if Supabase session expired but trusted token exists:
 *    - Validate token against DB
 *    - Refresh the Supabase session silently
 * 4. Token auto-refreshes on each visit (sliding window)
 * 5. Residents can revoke sessions from their profile
 */

import type { SupabaseBrowserClient } from '@/lib/supabase/client'

const TRUSTED_TOKEN_KEY = 'rp_trusted_session'
const TRUSTED_EXPIRY_DAYS = 90

interface StoredTrustedSession {
  token: string
  userId: string
  expiresAt: string
}

// ── Local storage helpers ──────────────────────────────────

export function getStoredTrustedSession(): StoredTrustedSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(TRUSTED_TOKEN_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredTrustedSession
    if (new Date(parsed.expiresAt) < new Date()) {
      localStorage.removeItem(TRUSTED_TOKEN_KEY)
      return null
    }
    return parsed
  } catch {
    localStorage.removeItem(TRUSTED_TOKEN_KEY)
    return null
  }
}

function storeTrustedSession(session: StoredTrustedSession) {
  if (typeof window === 'undefined') return
  localStorage.setItem(TRUSTED_TOKEN_KEY, JSON.stringify(session))
}

export function clearTrustedSession() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TRUSTED_TOKEN_KEY)
}

// ── Device fingerprint (lightweight, non-invasive) ─────────

function getDeviceFingerprint(): string {
  if (typeof window === 'undefined') return 'server'
  const nav = window.navigator
  const parts = [
    nav.userAgent,
    nav.language,
    screen.width + 'x' + screen.height,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ]
  // Simple hash
  let hash = 0
  const str = parts.join('|')
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + ch
    hash |= 0
  }
  return 'df_' + Math.abs(hash).toString(36)
}

function getDeviceName(): string {
  if (typeof window === 'undefined') return 'Unknown'
  const ua = navigator.userAgent
  if (/iPhone/i.test(ua)) return 'iPhone'
  if (/iPad/i.test(ua)) return 'iPad'
  if (/Android/i.test(ua)) return 'Android'
  if (/Windows/i.test(ua)) return 'Windows PC'
  if (/Mac/i.test(ua)) return 'Mac'
  if (/Linux/i.test(ua)) return 'Linux PC'
  return 'Web Browser'
}

// ── Core API ───────────────────────────────────────────────

/**
 * Create a trusted session after successful resident login.
 * Stores the token locally and inserts a row in trusted_sessions.
 */
export async function createTrustedSession(
  supabase: SupabaseBrowserClient,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const token = crypto.randomUUID()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + TRUSTED_EXPIRY_DAYS)

  const { error } = await supabase.from('trusted_sessions').insert({
    user_id: userId,
    session_token: token,
    device_fingerprint: getDeviceFingerprint(),
    device_name: getDeviceName(),
    platform: 'web',
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 500) : null,
    expires_at: expiresAt.toISOString(),
    last_refreshed_at: new Date().toISOString(),
  })

  if (error) {
    return { success: false, error: error.message }
  }

  storeTrustedSession({
    token,
    userId,
    expiresAt: expiresAt.toISOString(),
  })

  return { success: true }
}

/**
 * Validate and refresh a trusted session.
 * Returns the user_id if valid, null if expired/revoked.
 */
export async function validateTrustedSession(
  supabase: SupabaseBrowserClient
): Promise<{ userId: string } | null> {
  const stored = getStoredTrustedSession()
  if (!stored) return null

  const { data, error } = await supabase
    .from('trusted_sessions')
    .select('id, user_id, expires_at, is_revoked')
    .eq('session_token', stored.token)
    .eq('is_revoked', false)
    .single()

  if (error || !data) {
    clearTrustedSession()
    return null
  }

  if (new Date(data.expires_at) < new Date()) {
    clearTrustedSession()
    return null
  }

  // Sliding window refresh: extend by 90 days on each validated visit
  const newExpiry = new Date()
  newExpiry.setDate(newExpiry.getDate() + TRUSTED_EXPIRY_DAYS)

  await supabase
    .from('trusted_sessions')
    .update({
      last_refreshed_at: new Date().toISOString(),
      expires_at: newExpiry.toISOString(),
    })
    .eq('id', data.id)

  // Update local storage with new expiry
  storeTrustedSession({
    ...stored,
    expiresAt: newExpiry.toISOString(),
  })

  return { userId: data.user_id }
}

/**
 * Revoke a specific trusted session.
 */
export async function revokeTrustedSession(
  supabase: SupabaseBrowserClient,
  sessionId: string
): Promise<void> {
  await supabase
    .from('trusted_sessions')
    .update({ is_revoked: true, revoked_reason: 'user_revoked' })
    .eq('id', sessionId)
}

/**
 * Revoke ALL trusted sessions for the current user (e.g., on password change or logout-all).
 */
export async function revokeAllTrustedSessions(
  supabase: SupabaseBrowserClient,
  userId: string
): Promise<void> {
  await supabase
    .from('trusted_sessions')
    .update({ is_revoked: true, revoked_reason: 'revoke_all' })
    .eq('user_id', userId)
    .eq('is_revoked', false)

  clearTrustedSession()
}

/**
 * List active trusted sessions for a user (for profile management UI).
 */
export async function listTrustedSessions(
  supabase: SupabaseBrowserClient,
  userId: string
) {
  const { data, error } = await supabase
    .from('trusted_sessions')
    .select('id, device_name, platform, last_refreshed_at, expires_at, created_at')
    .eq('user_id', userId)
    .eq('is_revoked', false)
    .gt('expires_at', new Date().toISOString())
    .order('last_refreshed_at', { ascending: false })

  return { sessions: data ?? [], error }
}

/**
 * Check if current device has a trusted session stored.
 */
export function hasTrustedSession(): boolean {
  return getStoredTrustedSession() !== null
}
