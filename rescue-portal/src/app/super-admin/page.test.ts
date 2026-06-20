import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const page = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8')

test('super admin tenant editor exposes the editable settings without credentials', () => {
  assert.match(page, /Edit Client Municipality/)
  assert.match(page, /action: 'edit'/)
  assert.match(page, /emergency_hotline/)
  assert.match(page, /admin_full_name/)
  assert.match(page, /openTenantEditor/)
  assert.match(page, /Pencil/)
  assert.match(page, /!editingTenant && \(/)
})
