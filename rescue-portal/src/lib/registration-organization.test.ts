import assert from 'node:assert/strict'
import test from 'node:test'
import { getCoverageLookupCandidates } from './registration-organization.ts'

test('matches a Dubai registration against municipality, city, then emirate coverage', () => {
  assert.deepEqual(getCoverageLookupCandidates('AE-DU-010003', {
    provinceCode: 'AE-DU-010000',
    regionCode: 'AE-DU-000000',
  }), [
    { column: 'municipality_code', value: 'AE-DU-010003' },
    { column: 'province_code', value: 'AE-DU-010000' },
    { column: 'region_code', value: 'AE-DU-000000' },
  ])
})

test('keeps an exact Philippine municipality match ahead of broader coverage', () => {
  const candidates = getCoverageLookupCandidates('035416000', {
    provinceCode: '0354',
    regionCode: '0300000000',
  })

  assert.deepEqual(candidates[0], { column: 'municipality_code', value: '035416000' })
  assert.equal(candidates.length, 3)
})
