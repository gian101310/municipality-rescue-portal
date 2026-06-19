import { randomBytes, pbkdf2Sync } from 'crypto'

const ITERATIONS = 100_000
const KEY_LENGTH = 64
const DIGEST = 'sha512'

/**
 * Generate a random master key string (12 chars, alphanumeric + special).
 */
export function generateMasterKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%'
  const bytes = randomBytes(12)
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}

/**
 * Hash a master key using PBKDF2 with a random salt.
 * Returns "salt:hash" hex string.
 */
export function hashMasterKey(key: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = pbkdf2Sync(key, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString('hex')
  return `${salt}:${hash}`
}

/**
 * Verify a master key against a stored "salt:hash" string.
 */
export function verifyMasterKey(key: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':')
  if (!salt || !hash) return false
  const derived = pbkdf2Sync(key, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString('hex')
  // Constant-time comparison
  if (derived.length !== hash.length) return false
  let diff = 0
  for (let i = 0; i < derived.length; i++) {
    diff |= derived.charCodeAt(i) ^ hash.charCodeAt(i)
  }
  return diff === 0
}
