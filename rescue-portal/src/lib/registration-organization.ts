export type CoverageLookupCandidate = {
  column: 'municipality_code' | 'province_code' | 'region_code'
  value: string
}

type LocalityCoverage = {
  provinceCode?: string | null
  regionCode?: string | null
}

export function getCoverageLookupCandidates(
  municipalityCode: string,
  locality?: LocalityCoverage
): CoverageLookupCandidate[] {
  const candidates: CoverageLookupCandidate[] = [
    { column: 'municipality_code', value: municipalityCode },
  ]

  if (locality?.provinceCode) {
    candidates.push({ column: 'province_code', value: locality.provinceCode })
  }

  if (locality?.regionCode) {
    candidates.push({ column: 'region_code', value: locality.regionCode })
  }

  return candidates
}
