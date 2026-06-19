import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getResidentAccess,
  getTestReportMetadata,
  withOwnerTestMode,
} from './owner-test-mode.ts'

const superAdmin = {
  user_id: 'owner-1',
  role: 'super_admin' as const,
  is_active: true,
  registration_status: 'approved' as const,
}

test('permits an active super admin only with owner test mode enabled', () => {
  assert.deepEqual(
    getResidentAccess(superAdmin, new URLSearchParams('owner-test-mode=1')),
    { allowed: true, ownerTestMode: true }
  )
  assert.deepEqual(
    getResidentAccess(superAdmin, new URLSearchParams()),
    { allowed: false, ownerTestMode: false }
  )
})

test('keeps approved resident access unchanged', () => {
  const resident = { ...superAdmin, role: 'resident' as const }

  assert.deepEqual(
    getResidentAccess(resident, new URLSearchParams()),
    { allowed: true, ownerTestMode: false }
  )
})

test('forces owner test submissions to remain drills and audit as super admin', () => {
  assert.deepEqual(
    getTestReportMetadata({ allowed: true, ownerTestMode: true }),
    { is_drill: true, changed_by_role: 'super_admin' }
  )
})

test('keeps ordinary resident submissions live and audited as residents', () => {
  assert.deepEqual(
    getTestReportMetadata({ allowed: true, ownerTestMode: false }),
    { is_drill: false, changed_by_role: 'resident' }
  )
})

test('preserves owner test mode in resident route and API URLs', () => {
  assert.equal(withOwnerTestMode('/resident/history', true), '/resident/history?owner-test-mode=1')
  assert.equal(withOwnerTestMode('/api/resident/incidents?limit=5', true), '/api/resident/incidents?limit=5&owner-test-mode=1')
  assert.equal(withOwnerTestMode('/resident', false), '/resident')
})
