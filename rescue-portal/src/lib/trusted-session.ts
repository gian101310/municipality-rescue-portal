/** Browser storage and API helpers for the optional trusted-resident-device flow. */

const TRUSTED_TOKEN_KEY = 'rp_trusted_session'
const TRUSTED_COOKIE_FLAG = 'rp_ts'

interface StoredTrustedSession {
  token: string
  userId: string
  expiresAt: string
}

function setTrustedCookieFlag(expiresAt: Date) {
  if (typeof document === 'undefined') return
  const maxAge = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
  document.cookie = `${TRUSTED_COOKIE_FLAG}=1; path=/; max-age=${maxAge}; SameSite=Lax; Secure`
}

function clearTrustedCookieFlag() {
  if (typeof document === 'undefined') return
  document.cookie = `${TRUSTED_COOKIE_FLAG}=; path=/; max-age=0; SameSite=Lax; Secure`
}

export function getStoredTrustedSession(): StoredTrustedSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(TRUSTED_TOKEN_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredTrustedSession
    if (!parsed.token || !parsed.userId || new Date(parsed.expiresAt) <= new Date()) {
      clearTrustedSession()
      return null
    }
    return parsed
  } catch {
    clearTrustedSession()
    return null
  }
}

export function updateStoredTrustedSession(token: string, userId: string, expiresAt: string) {
  if (typeof window === 'undefined') return
  const session = { token, userId, expiresAt }
  localStorage.setItem(TRUSTED_TOKEN_KEY, JSON.stringify(session))
  setTrustedCookieFlag(new Date(expiresAt))
}

export function clearTrustedSession() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TRUSTED_TOKEN_KEY)
  clearTrustedCookieFlag()
}

function getDeviceName() {
  if (typeof window === 'undefined') return 'Web Browser'
  const ua = navigator.userAgent
  if (/iPhone/i.test(ua)) return 'iPhone'
  if (/iPad/i.test(ua)) return 'iPad'
  if (/Android/i.test(ua)) return 'Android'
  if (/Windows/i.test(ua)) return 'Windows PC'
  if (/Mac/i.test(ua)) return 'Mac'
  if (/Linux/i.test(ua)) return 'Linux PC'
  return 'Web Browser'
}

export async function createTrustedSession(userId: string): Promise<{ success: boolean; error?: string }> {
  const response = await fetch('/api/auth/trusted-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceName: getDeviceName(), platform: 'web' }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !payload.token || !payload.expiresAt) {
    return { success: false, error: payload.message ?? 'Unable to trust this device.' }
  }
  updateStoredTrustedSession(payload.token, payload.userId ?? userId, payload.expiresAt)
  return { success: true }
}

export async function validateTrustedSession(): Promise<{ userId: string } | null> {
  const stored = getStoredTrustedSession()
  if (!stored) return null
  const response = await fetch('/api/auth/trusted-session-refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: stored.token }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !payload.trusted_token || !payload.expires_at) {
    clearTrustedSession()
    return null
  }
  updateStoredTrustedSession(payload.trusted_token, payload.user_id ?? stored.userId, payload.expires_at)
  return { userId: payload.user_id ?? stored.userId }
}

export async function revokeTrustedSession(sessionId: string): Promise<void> {
  const response = await fetch('/api/auth/trusted-session', {
    method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId }),
  })
  if (!response.ok) throw new Error('Unable to revoke trusted device.')
}

export async function revokeAllTrustedSessions(): Promise<void> {
  const response = await fetch('/api/auth/trusted-session', {
    method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ all: true }),
  })
  if (!response.ok) throw new Error('Unable to revoke trusted devices.')
  clearTrustedSession()
}

export async function listTrustedSessions() {
  const response = await fetch('/api/auth/trusted-session', { cache: 'no-store' })
  const payload = await response.json().catch(() => ({}))
  return { sessions: response.ok ? payload.sessions ?? [] : [], error: response.ok ? null : new Error(payload.message ?? 'Unable to load trusted devices.') }
}

export function hasTrustedSession() {
  return getStoredTrustedSession() !== null
}
