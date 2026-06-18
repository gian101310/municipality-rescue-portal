/**
 * Automated Severity Scoring Engine
 * Calculates severity score (0-100) based on emergency type, hazards, and affected count.
 * Used to auto-triage incoming incidents.
 */

export interface SeverityInput {
  emergencyType: string
  hazards: string[]
  affectedCount: number
  description?: string
}

export interface SeverityResult {
  score: number          // 0-100
  level: 'critical' | 'high' | 'medium' | 'low'
  color: string
  label: string
  factors: string[]      // Human-readable explanation
}

// Base scores by emergency type
const TYPE_SCORES: Record<string, number> = {
  fire: 70,
  flood: 60,
  typhoon: 65,
  earthquake: 75,
  medical: 55,
  vehicular_accident: 50,
  landslide: 70,
  structure_collapse: 80,
  hazmat: 75,
  armed_conflict: 85,
  missing_person: 40,
  other: 30,
}

// Hazard multipliers
const HAZARD_SCORES: Record<string, number> = {
  unconscious: 15,
  fire_present: 12,
  flooding: 10,
  violence: 18,
  trapped: 20,
  hazmat: 15,
  children_involved: 12,
  elderly_involved: 10,
  structural_damage: 8,
  no_access: 10,
  power_lines: 12,
  gas_leak: 15,
}

// Keywords in description that increase severity
const CRITICAL_KEYWORDS = [
  'dying', 'dead', 'death', 'killed', 'critical', 'bleeding',
  'not breathing', 'unconscious', 'collapsed', 'explosion',
  'patay', 'namatay', 'dumudugo', 'hindi humihinga', 'gumuho',
]

export function calculateSeverity(input: SeverityInput): SeverityResult {
  const factors: string[] = []
  let score = 0

  // Base type score
  const baseScore = TYPE_SCORES[input.emergencyType] ?? TYPE_SCORES.other
  score += baseScore
  factors.push(`Emergency type "${input.emergencyType}": +${baseScore}`)

  // Hazard additions
  for (const hazard of input.hazards) {
    const hazardScore = HAZARD_SCORES[hazard] ?? 5
    score += hazardScore
    factors.push(`Hazard "${hazard}": +${hazardScore}`)
  }

  // Affected count factor
  if (input.affectedCount >= 10) {
    score += 20
    factors.push(`Mass casualty (${input.affectedCount}+ affected): +20`)
  } else if (input.affectedCount >= 5) {
    score += 12
    factors.push(`Multiple affected (${input.affectedCount}): +12`)
  } else if (input.affectedCount >= 2) {
    score += 5
    factors.push(`${input.affectedCount} people affected: +5`)
  }

  // Description keyword analysis
  if (input.description) {
    const lower = input.description.toLowerCase()
    const matched = CRITICAL_KEYWORDS.filter((kw) => lower.includes(kw))
    if (matched.length > 0) {
      const kwScore = Math.min(matched.length * 8, 20)
      score += kwScore
      factors.push(`Critical keywords detected: +${kwScore}`)
    }
  }

  // Clamp to 0-100
  score = Math.min(100, Math.max(0, score))

  // Determine level
  let level: SeverityResult['level']
  let color: string
  let label: string

  if (score >= 80) {
    level = 'critical'
    color = '#dc2626'
    label = 'CRITICAL'
  } else if (score >= 60) {
    level = 'high'
    color = '#f97316'
    label = 'HIGH'
  } else if (score >= 40) {
    level = 'medium'
    color = '#eab308'
    label = 'MEDIUM'
  } else {
    level = 'low'
    color = '#3b82f6'
    label = 'LOW'
  }

  return { score, level, color, label, factors }
}

/** Visual component helper — returns the score ring SVG data */
export function getSeverityRingProps(score: number) {
  const circumference = 2 * Math.PI * 40 // radius=40
  const offset = circumference - (score / 100) * circumference
  return { circumference, offset }
}
