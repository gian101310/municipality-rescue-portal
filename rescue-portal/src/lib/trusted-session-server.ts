import { createHash, randomBytes } from 'node:crypto'

export const TRUSTED_SESSION_DAYS = 90

export function createTrustedToken() {
  return randomBytes(32).toString('base64url')
}

export function hashTrustedToken(token: string) {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

export function trustedSessionExpiry() {
  const expiry = new Date()
  expiry.setDate(expiry.getDate() + TRUSTED_SESSION_DAYS)
  return expiry
}
