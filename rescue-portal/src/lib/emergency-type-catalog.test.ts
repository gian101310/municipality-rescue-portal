import test from 'node:test'
import assert from 'node:assert/strict'
import { getEmergencyTypeScopeFilter, isEmergencyTypeAvailableToOrganization } from './emergency-type-catalog.ts'

test('limits the shared catalogue to global types for anonymous requests', () => {
  assert.equal(getEmergencyTypeScopeFilter(), 'organization_id.is.null')
})

test('includes only the current tenant custom types alongside global types', () => {
  assert.equal(
    getEmergencyTypeScopeFilter('tenant-a'),
    'organization_id.is.null,organization_id.eq.tenant-a'
  )
})

test('does not allow a tenant to use another tenant custom type', () => {
  assert.equal(isEmergencyTypeAvailableToOrganization(null, 'tenant-a'), true)
  assert.equal(isEmergencyTypeAvailableToOrganization('tenant-a', 'tenant-a'), true)
  assert.equal(isEmergencyTypeAvailableToOrganization('tenant-b', 'tenant-a'), false)
})
