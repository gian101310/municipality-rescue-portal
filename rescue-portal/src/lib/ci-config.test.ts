import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('main and pull requests run the complete verification pipeline', () => {
  const workflow = readFileSync(new URL('../../../.github/workflows/verify.yml', import.meta.url), 'utf8')
  assert.match(workflow, /pull_request:/)
  assert.match(workflow, /branches: \[main\]/)
  assert.match(workflow, /npm ci --legacy-peer-deps/)
  assert.match(workflow, /npm audit --omit=dev --audit-level=moderate/)
  assert.match(workflow, /npm test/)
  assert.match(workflow, /npm run lint/)
  assert.match(workflow, /npm run build/)
})
