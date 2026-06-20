type IncidentSubmissionInput = {
  emergency_type_id: string
  emergency_type_name: string
  description: string
  affected_count: number
  latitude: number | null
  longitude: number | null
}

type ValidationResult =
  | { ok: true }
  | { ok: false; message: string }

export type ReporterRole = 'victim' | 'passerby'
export type IntakeState = 'incoming' | 'details_received'

const emergencyTypeAliases: Record<string, string> = {
  'et-fire': 'fire',
  'et-flood': 'flood',
  'et-typhoon': 'typhoon',
  'et-earthquake': 'earthquake',
  'et-medical': 'medical',
  'et-vehicular': 'vehicular_accident',
  'et-landslide': 'landslide',
  'et-collapse': 'structure_collapse',
  'et-hazmat': 'hazmat',
  'et-crime': 'armed_conflict',
  'et-rescue': 'other',
  'et-other': 'other',
}

export function validateIncidentSubmission(input: IncidentSubmissionInput): ValidationResult {
  if (!input.emergency_type_id || !input.emergency_type_name) {
    return { ok: false, message: 'Choose an emergency type.' }
  }

  if (!Number.isFinite(input.latitude) || !Number.isFinite(input.longitude)) {
    return { ok: false, message: 'Share your current location before submitting.' }
  }

  if (input.affected_count < 0) {
    return { ok: false, message: 'Affected count cannot be negative.' }
  }

  return { ok: true }
}

export function validateIncomingSosLocation(input: {
  latitude: number | null
  longitude: number | null
}): ValidationResult {
  if (!Number.isFinite(input.latitude) || !Number.isFinite(input.longitude)) {
    return { ok: false, message: 'Share your current location before sending SOS.' }
  }

  return { ok: true }
}

export function mapEmergencyTypeToSeverityKey(typeId: string, typeName: string) {
  if (emergencyTypeAliases[typeId]) return emergencyTypeAliases[typeId]

  const normalizedName = typeName.toLowerCase()
  if (normalizedName.includes('fire')) return 'fire'
  if (normalizedName.includes('flood')) return 'flood'
  if (normalizedName.includes('typhoon') || normalizedName.includes('storm')) return 'typhoon'
  if (normalizedName.includes('earthquake')) return 'earthquake'
  if (normalizedName.includes('medical') || normalizedName.includes('ambulance')) return 'medical'
  if (normalizedName.includes('vehicle') || normalizedName.includes('accident')) return 'vehicular_accident'
  if (normalizedName.includes('landslide')) return 'landslide'
  if (normalizedName.includes('collapse')) return 'structure_collapse'
  if (normalizedName.includes('hazmat') || normalizedName.includes('chemical')) return 'hazmat'
  if (normalizedName.includes('crime') || normalizedName.includes('violence')) return 'armed_conflict'

  return 'other'
}

export function buildIncidentReference(date: Date, sequence: number) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const paddedSequence = String(Math.max(0, sequence)).padStart(6, '0')

  return `INC-${year}${month}${day}-${paddedSequence}`
}
