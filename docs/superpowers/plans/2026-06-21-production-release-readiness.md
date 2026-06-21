# Production Release Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Release the municipality rescue portal with staff dispatch access, a runnable regression suite, and Next.js 16-compatible request protection.

**Architecture:** Keep the existing Supabase-backed authorization model. Complete the `staff` role everywhere the shared role helpers are authoritative, replace the deprecated Next.js middleware convention with an equivalent `proxy.ts`, and use Node's built-in TypeScript test runner for the existing unit tests.

**Tech Stack:** Next.js 16.2, React 19, TypeScript, Supabase SSR, Node.js 24 test runner, Vercel.

## Global Constraints

- Do not change Supabase schema, RLS policies, or production data during this release.
- Do not weaken authorization; staff permissions must match the routes explicitly opened to staff in commit `da62706`.
- Do not expose Supabase service-role credentials to the browser.
- Production release is from `main`, as explicitly authorized by the user.

---

### Task 1: Complete the staff role contract

**Files:**
- Modify: `rescue-portal/src/lib/auth.ts`
- Test: production `pnpm build`

**Interfaces:**
- Consumes: `UserRole` from `rescue-portal/src/lib/types.ts`
- Produces: total `ROLE_PERMISSIONS: Record<UserRole, Permission[]>`, staff login routing, and staff authorization through `requireStaff()`.

- [ ] **Step 1: Verify the pre-fix build failure**

Run: `pnpm build`

Expected before the fix: TypeScript reports that `ROLE_PERMISSIONS` is missing the `staff` key.

- [ ] **Step 2: Add only the permissions enabled by the current dispatch routes**

Add this entry before `resident`:

```ts
  staff: [
    'incidents:view_all', 'incidents:create', 'incidents:update_status',
    'incidents:assign_unit', 'incidents:verify', 'incidents:close',
    'residents:view_all',
    'units:view_all', 'units:manage', 'units:update_status',
    'dashboard:view_admin',
  ],
```

Add `case 'staff': return '/admin'` to `getDefaultRoute`, and include `staff` in `requireStaff()`.

- [ ] **Step 3: Verify the fix**

Run: `pnpm build`

Expected: exit code 0 with all pages and route handlers generated.

### Task 2: Make request protection Next.js 16-compatible and testable

**Files:**
- Create: `rescue-portal/src/proxy.ts`
- Create: `rescue-portal/src/proxy.test.ts`
- Delete: `rescue-portal/src/middleware.ts`
- Modify: `rescue-portal/package.json`

**Interfaces:**
- Consumes: `NextRequest` and Supabase SSR session cookies.
- Produces: `proxy(request: NextRequest)` and `config.matcher` with the same protected route behavior as the existing middleware.

- [ ] **Step 1: Write the failing proxy matcher test**

Create `src/proxy.test.ts`:

```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import { unstable_doesProxyMatch } from 'next/experimental/testing/server'
import { config } from './proxy.ts'

test('proxy protects dashboard routes and skips static assets', () => {
  assert.equal(unstable_doesProxyMatch({ config, nextConfig: {}, url: '/admin' }), true)
  assert.equal(unstable_doesProxyMatch({ config, nextConfig: {}, url: '/_next/static/chunk.js' }), false)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test --experimental-strip-types src/proxy.test.ts`

Expected: fail because `./proxy.ts` does not exist.

- [ ] **Step 3: Rename the convention without changing behavior**

Move the content of `src/middleware.ts` to `src/proxy.ts` and rename only the exported function:

```ts
export async function proxy(request: NextRequest) {
```

Keep `config.matcher`, protected prefixes, session refresh, and redirect behavior unchanged. Delete `src/middleware.ts`.

Add this package script:

```json
"test": "node --test --experimental-strip-types \"src/**/*.test.ts\""
```

- [ ] **Step 4: Verify the proxy and full suite**

Run: `pnpm test`

Expected: the proxy matcher test and all existing tests pass.

### Task 3: Preflight and publish the production release

**Files:**
- Modify: files from Tasks 1-2 only

**Interfaces:**
- Consumes: Vercel project link in `rescue-portal/.vercel/project.json`, production environment configuration, and GitHub remote `origin`.
- Produces: a pushed `main` commit and an inspected Vercel production deployment.

- [ ] **Step 1: Confirm production configuration without reading secret values**

Run: `vercel env ls production` and verify that the Supabase URL, Supabase anon key, service-role key, app URL, and municipality configuration variables exist.

- [ ] **Step 2: Run the release gate**

Run: `pnpm test && pnpm build && git diff --check`

Expected: all commands exit 0.

- [ ] **Step 3: Commit and push the release**

Run:

```bash
git add rescue-portal/src/lib/auth.ts rescue-portal/src/proxy.ts rescue-portal/src/proxy.test.ts rescue-portal/src/middleware.ts rescue-portal/package.json docs/superpowers/plans/2026-06-21-production-release-readiness.md
git commit -m "fix: complete staff dispatch release"
git push origin main
```

Expected: the `main` branch is pushed, which triggers Vercel's Git production deployment.

- [ ] **Step 4: Inspect the deployment and production response**

Run: `vercel ls`, then `vercel inspect <production-url>` and `Invoke-WebRequest <production-url>`.

Expected: Vercel reports `READY`, and the production root response is HTTP 200.
