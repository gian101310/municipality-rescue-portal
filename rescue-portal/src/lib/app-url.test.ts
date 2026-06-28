import assert from 'node:assert/strict'
import test from 'node:test'
import { getCanonicalAppUrl } from './app-url.ts'

test('production rejects a localhost application URL', () => {
  assert.equal(
    getCanonicalAppUrl({ NODE_ENV: 'production', NEXT_PUBLIC_APP_URL: 'http://localhost:3000' } as NodeJS.ProcessEnv),
    'https://www.rescue-portal.ph',
  )
})

test('production accepts the configured Rescue Portal domain', () => {
  assert.equal(
    getCanonicalAppUrl({ NODE_ENV: 'production', NEXT_PUBLIC_APP_URL: 'https://www.rescue-portal.ph/' } as NodeJS.ProcessEnv),
    'https://www.rescue-portal.ph',
  )
})

test('invalid application URLs fall back to the production domain', () => {
  assert.equal(
    getCanonicalAppUrl({ NODE_ENV: 'production', NEXT_PUBLIC_APP_URL: 'not a URL' } as NodeJS.ProcessEnv),
    'https://www.rescue-portal.ph',
  )
})
