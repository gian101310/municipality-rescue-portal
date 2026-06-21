export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export function isStrongPassword(value: string) {
  return value.length >= 8
    && /[A-Z]/.test(value)
    && /[a-z]/.test(value)
    && /\d/.test(value)
    && /[^A-Za-z0-9]/.test(value)
}

export function getPasswordRequirementText() {
  return 'Use at least 8 characters with uppercase, lowercase, number, and special character.'
}

export function requiresBarangay(municipalityCode: string) {
  return !municipalityCode.startsWith('AE-')
}
