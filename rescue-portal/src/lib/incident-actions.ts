export function buildVerificationRequest() {
  return { status: 'verified' as const, reason: '' }
}

export function buildEscalationPayload(reason: string) {
  return { severity: 'critical', reason: reason.trim() }
}
