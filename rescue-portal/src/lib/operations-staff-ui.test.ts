import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

test('operations staff form keeps account access separate from team duty', () => {
  const componentUrl = new URL('../components/admin/operations-staff-settings.tsx', import.meta.url)
  assert.equal(existsSync(componentUrl), true)
  const source = readFileSync(componentUrl, 'utf8')

  assert.match(source, /Account Role/)
  assert.match(source, /Rescue Team/)
  assert.match(source, /Team Position/)
  assert.match(source, /\/api\/admin\/staff/)
  assert.match(source, /md:hidden/)
  assert.match(source, /hidden md:block/)
})

test('settings page renders the operations staff panel', () => {
  const settings = readFileSync(new URL('../app/admin/settings/page.tsx', import.meta.url), 'utf8')
  assert.match(settings, /OperationsStaffSettings/)
  assert.match(settings, /TabsContent value="operations_staff"/)
})
