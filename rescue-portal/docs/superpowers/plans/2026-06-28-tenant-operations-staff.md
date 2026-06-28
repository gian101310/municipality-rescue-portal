# Tenant Operations Staff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let tenant Admins securely create and manage their own operations staff, optionally assign responders to rescue teams, repair dialog dropdowns, and prevent production Admin Portal links from redirecting to localhost.

**Architecture:** Add tenant-scoped `/api/admin/staff` endpoints backed by a small validation/service module; reuse `user_profiles` and `rescue_unit_members` rather than adding schema. Add an Operations Staff settings panel that consumes those APIs. Centralize canonical application URL validation and correct the shared Select portal layer.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Base UI/shadcn components, Supabase Auth/Postgres, Node test runner, Vercel.

## Global Constraints

- Tenant Admin may manage only `dispatcher`, `team_leader`, `responder`, and `staff` in its own `organization_id`.
- Tenant Admin may never create or mutate `admin`, `super_admin`, or `resident` accounts.
- Account role and rescue-team position remain separate.
- Preserve existing tenant staff limits and audit every account/membership mutation.
- Use `user_profiles.id` for audit `actor_id`.
- No duplicate staff table or automatic team assignment based only on account role.
- Production authentication redirects must never use localhost, `127.0.0.1`, or port 3000.

---

### Task 1: Dropdown layering and canonical redirect

**Files:**
- Modify: `src/components/ui/select.tsx`
- Create: `src/lib/app-url.ts`
- Modify: `src/app/api/super-admin/login-as-admin/route.ts`
- Create: `src/lib/app-url.test.ts`
- Modify: `src/lib/team-members.test.ts`

**Interfaces:**
- Produces: `getCanonicalAppUrl(env: NodeJS.ProcessEnv): string`
- Produces: Select portal layer above the dialog's `z-[10000]` layer.

- [ ] **Step 1: Write failing redirect and layer tests**

```ts
test('production rejects a localhost application URL', () => {
  assert.equal(getCanonicalAppUrl({ NODE_ENV: 'production', NEXT_PUBLIC_APP_URL: 'http://localhost:3000' } as NodeJS.ProcessEnv), 'https://www.rescue-portal.ph')
})

test('select popup layers above dialogs', () => {
  assert.match(selectSource, /z-\[10001\]/)
})
```

- [ ] **Step 2: Run tests and confirm RED**

Run: `node --test --experimental-strip-types src/lib/app-url.test.ts src/lib/team-members.test.ts`
Expected: FAIL because `app-url.ts` and `z-[10001]` do not exist.

- [ ] **Step 3: Implement canonical URL validation and layer repair**

```ts
const PRODUCTION_APP_URL = 'https://www.rescue-portal.ph'
export function getCanonicalAppUrl(env: NodeJS.ProcessEnv = process.env) {
  const configured = env.NEXT_PUBLIC_APP_URL?.trim()
  if (!configured) return PRODUCTION_APP_URL
  try {
    const url = new URL(configured)
    const loopback = ['localhost', '127.0.0.1', '::1'].includes(url.hostname) || url.port === '3000'
    if (env.NODE_ENV === 'production' && loopback) return PRODUCTION_APP_URL
    return url.origin
  } catch { return PRODUCTION_APP_URL }
}
```

Use `${getCanonicalAppUrl()}/admin` in `login-as-admin` and raise both Select positioner/popup layers to `z-[10001]`.

- [ ] **Step 4: Run targeted tests and confirm GREEN**

Run: `node --test --experimental-strip-types src/lib/app-url.test.ts src/lib/team-members.test.ts`
Expected: all tests pass.

### Task 2: Tenant operations staff API

**Files:**
- Create: `src/lib/operations-staff.ts`
- Create: `src/lib/operations-staff.test.ts`
- Create: `src/app/api/admin/staff/route.ts`
- Create: `src/app/api/admin/staff/[id]/route.ts`
- Modify: `src/lib/audit-logger.ts` only if an existing action type must be extended.

**Interfaces:**
- Produces: `OPERATIONS_ROLES`, `TEAM_POSITIONS`, `validateOperationsRole`, `validateTeamAssignment`, `MAX_STAFF_PER_TENANT`.
- Produces: `GET/POST /api/admin/staff` and `PATCH /api/admin/staff/[id]`.

- [ ] **Step 1: Write failing authorization and source contract tests**

```ts
test('tenant admins cannot create privileged roles', () => {
  assert.equal(validateOperationsRole('admin'), null)
  assert.equal(validateOperationsRole('responder'), 'responder')
})

test('tenant staff routes enforce organization scope and rollback', () => {
  assert.match(createRoute, /organization_id/)
  assert.match(createRoute, /deleteUser/)
  assert.match(updateRoute, /\.eq\('organization_id', auth\.profile\.organization_id\)/)
})
```

- [ ] **Step 2: Run tests and confirm RED**

Run: `node --test --experimental-strip-types src/lib/operations-staff.test.ts`
Expected: FAIL because helpers/routes do not exist.

- [ ] **Step 3: Implement authenticated tenant-scoped CRUD**

`GET` returns approved/active and inactive operational profiles plus team memberships and team choices for the caller's organization. `POST` validates role, email, password, staff limit, same-tenant team, creates Auth with metadata, upserts the approved profile, optionally upserts membership, and deletes the Auth user on failure. `PATCH` loads the target by both profile ID and caller organization, validates allowed changes, updates Auth password/email when requested, updates the profile, deactivates rather than deletes, and replaces the active team membership when team data changes.

All successful mutations call `writeAuditLog` with the caller profile primary key and organization.

- [ ] **Step 4: Run targeted tests and confirm GREEN**

Run: `node --test --experimental-strip-types src/lib/operations-staff.test.ts`
Expected: all tests pass.

### Task 3: Operations Staff settings UI

**Files:**
- Modify: `src/lib/tenant-admin.ts`
- Modify: `src/lib/tenant-admin.test.ts`
- Create: `src/components/admin/operations-staff-settings.tsx`
- Modify: `src/app/admin/settings/page.tsx`
- Create: `src/lib/operations-staff-ui.test.ts`

**Interfaces:**
- Consumes: staff endpoints from Task 2.
- Produces: `OperationsStaffSettings` component and `operations_staff` settings tab.

- [ ] **Step 1: Write failing tab and UI contract tests**

```ts
test('tenant admins see Operations Staff settings', () => {
  assert.ok(getSettingsTabsForRole('admin').some(tab => tab.value === 'operations_staff'))
})

test('staff form keeps account role separate from team position', () => {
  assert.match(source, /Account Role/)
  assert.match(source, /Team Position/)
  assert.match(source, /Rescue Team/)
})
```

- [ ] **Step 2: Run tests and confirm RED**

Run: `node --test --experimental-strip-types src/lib/tenant-admin.test.ts src/lib/operations-staff-ui.test.ts`
Expected: FAIL because the tab and component are absent.

- [ ] **Step 3: Implement responsive staff directory and form**

Add a settings tab visible to Admin and Super Admin. The component loads `/api/admin/staff`, displays used/max seats, filters by search/role/team/state, and renders mobile cards plus a desktop table. Add/edit dialogs collect name, email, phone, operational role, optional team, optional team position, and password. API error messages render in the dialog; empty teams and empty staff receive actionable explanations.

- [ ] **Step 4: Run targeted tests and confirm GREEN**

Run: `node --test --experimental-strip-types src/lib/tenant-admin.test.ts src/lib/operations-staff-ui.test.ts`
Expected: all tests pass.

### Task 4: Full verification, environment correction, deployment

**Files:**
- Modify: `docs/superpowers/plans/2026-06-28-tenant-operations-staff.md` checkboxes only.

- [ ] **Step 1: Run complete local gates**

Run: `npm test && npm run build && git diff --check`
Expected: zero test failures, successful optimized build, no whitespace errors.

- [ ] **Step 2: Correct Vercel production environment**

Inspect with `vercel env ls`; replace production `NEXT_PUBLIC_APP_URL` with `https://www.rescue-portal.ph` without exposing secret values. Confirm the resulting production deployment receives the corrected value.

- [ ] **Step 3: Commit and push**

```bash
git add src docs/superpowers/plans/2026-06-28-tenant-operations-staff.md
git commit -m "add-tenant-operations-staff-management"
git push origin main
```

- [ ] **Step 4: Wait for Vercel production READY**

Run: `vercel ls rescue-portal --yes`, then `vercel inspect <new-url> --wait --timeout 3m`.
Expected: production deployment `READY` with aliases `www.rescue-portal.ph` and `rescue-portal.ph`.

- [ ] **Step 5: Production E2E and cleanup**

Use isolated drill data to authenticate a tenant Admin, create a temporary responder with a selected team/position, confirm the membership, login as responder, and remove all drill records. Generate a Super Admin tenant portal link and assert its decoded `redirect_to` and final destination are `https://www.rescue-portal.ph/admin`. Verify selectors visually in the dialog at mobile width.

- [ ] **Step 6: Scan runtime logs and repository state**

Run: `vercel logs <deployment-id> --level error --since 30m --limit 100 --json`, `git status --short --branch`, and compare `HEAD` with `origin/main`.
Expected: no new error logs, clean worktree, identical commit IDs.
