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

export function selectHistoryActorId(profile: { id: string }) {
  return profile.id
}

type IncomingSosLocation = {
  latitude: number
  longitude: number
  gpsAccuracy: number | null
}

type IncomingSosContext = {
  organizationId: string
  reporterId: string
  reporterName: string
  reporterPhone: string | null
  emergencyTypeId: string
  referenceNumber: string
  createdAt: string
}

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

export function buildIncomingSosPayload(location: IncomingSosLocation, context: IncomingSosContext) {
  return {
    reference_number: context.referenceNumber,
    organization_id: context.organizationId,
    reporter_id: context.reporterId,
    reporter_name: context.reporterName,
    reporter_phone: context.reporterPhone,
    emergency_type_id: context.emergencyTypeId,
    severity: 'critical',
    status: 'submitted',
    intake_state: 'incoming',
    description: '',
    affected_count: 1,
    has_unconscious: false,
    has_fire: false,
    has_flooding: false,
    has_violence: false,
    latitude: location.latitude,
    longitude: location.longitude,
    gps_accuracy: location.gpsAccuracy,
    is_anonymous: false,
    is_drill: false,
    created_at: context.createdAt,
    updated_at: context.createdAt,
  }
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
  if (normalizedName.includes('domestic abuse')) return 'domestic_abuse'
  if (normalizedName.includes('kidnap')) return 'kidnapping'
  if (normalizedName.includes('hostage')) return 'hostage_situation'
  if (normalizedName.includes('bank robbery')) return 'bank_robbery'
  if (normalizedName.includes('stabbing') || normalizedName.includes('stabbed')) return 'stabbing'
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
