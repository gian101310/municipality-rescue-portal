import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('proxy exports a statically analyzable matcher', () => {
  const source = readFileSync(new URL('./proxy.ts', import.meta.url), 'utf8')

  assert.match(source, /export const config = \{[\s\S]*matcher:/)
  assert.match(source, /_next\/static/)
})
