# Owner Test Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an active Super Admin test the Admin and Resident portals with one login, while ensuring test reports are always marked as drills.

**Architecture:** A small client-side helper owns the explicit `owner-test-mode` query parameter. A pure server-safe authorization helper decides whether a profile can use the resident workflow and whether created reports must be drills. The Super Admin hub starts each portal flow, and the Admin/Resident shells expose a safe return to the hub.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict mode, Supabase SSR, Node built-in test runner, Tailwind CSS, shadcn/ui, Lucide React.

## Global Constraints

- Do not modify ordinary approved-resident access or the existing Super Admin permission map.
- Owner Test Mode is active only when the URL has `owner-test-mode=1` and the authenticated profile is an active Super Admin.
- Reports submitted in Owner Test Mode must use `is_drill: true` and preserve `super_admin` in their status-history audit row.
- Do not add packages; use the existing Node built-in test runner and installed UI libraries.
- Do not change the existing tenant “Login as Admin” magic-link flow.

---

## File Structure

- Create `rescue-portal/src/lib/owner-test-mode.ts` — query-parameter parsing and pure authorization/audit decisions.
- Create `rescue-portal/src/lib/owner-test-mode.test.ts` — regression coverage for Super Admin test access and normal resident access.
- Modify `rescue-portal/src/app/api/resident/incidents/route.ts` — consume the helper for GET and POST, filtering owner drill reports and writing the correct audit metadata.
- Modify `rescue-portal/src/app/super-admin/page.tsx` — add the Portal Testing card with direct Admin and Resident Test links.
- Modify `rescue-portal/src/app/admin/incidents/page.tsx` — visibly label drill reports in the full incident list.
- Modify `rescue-portal/src/app/admin/layout.tsx` — show a “Return to Super Admin” action only to a Super Admin.
- Modify `rescue-portal/src/app/resident/layout.tsx` — show an Owner Test Mode notice and return action only for a Super Admin visiting with the explicit query parameter.

### Task 1: Define and test Owner Test Mode authorization

**Files:**
- Create: `rescue-portal/src/lib/owner-test-mode.ts`
- Create: `rescue-portal/src/lib/owner-test-mode.test.ts`

**Interfaces:**
- Produces: `isOwnerTestMode(searchParams: URLSearchParams): boolean`
- Produces: `getResidentAccess(profile: OwnerTestProfile, searchParams: URLSearchParams): ResidentAccess`

- [ ] **Step 1: Write the failing test**

~~~ts
import assert from 'node:assert/strict'
import test from 'node:test'
import { getResidentAccess } from './owner-test-mode.ts'

const superAdmin = {
  user_id: 'owner-1', role: 'super_admin' as const,
  is_active: true, registration_status: 'approved' as const,
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

test('keeps approved resident access and audit behavior unchanged', () => {
  const resident = { ...superAdmin, role: 'resident' as const }
  const access = getResidentAccess(resident, new URLSearchParams())
  assert.deepEqual(access, { allowed: true, ownerTestMode: false })
})
~~~

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --experimental-strip-types src/lib/owner-test-mode.test.ts`

Expected: FAIL because `owner-test-mode.ts` does not exist.

- [ ] **Step 3: Write the minimal implementation**

~~~ts
import type { RegistrationStatus, UserRole } from './types'

export type OwnerTestProfile = {
  user_id: string
  role: UserRole
  is_active: boolean
  registration_status: RegistrationStatus | null
}

export type ResidentAccess = { allowed: boolean; ownerTestMode: boolean }

export function isOwnerTestMode(searchParams: URLSearchParams) {
  return searchParams.get('owner-test-mode') === '1'
}

export function getResidentAccess(profile: OwnerTestProfile, searchParams: URLSearchParams): ResidentAccess {
  const ownerTestMode = profile.role === 'super_admin' && profile.is_active && isOwnerTestMode(searchParams)
  const approvedResident = profile.role === 'resident' && profile.is_active && profile.registration_status === 'approved'
  return { allowed: ownerTestMode || approvedResident, ownerTestMode }
}

~~~

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --experimental-strip-types src/lib/owner-test-mode.test.ts`

Expected: PASS for both tests.

- [ ] **Step 5: Commit**

~~~bash
git add rescue-portal/src/lib/owner-test-mode.ts rescue-portal/src/lib/owner-test-mode.test.ts
git commit -m "feat: add owner test mode access rules"
~~~

### Task 2: Apply owner authorization to resident incidents

**Files:**
- Modify: `rescue-portal/src/app/api/resident/incidents/route.ts:4-79, 112-138, 236-270`

**Interfaces:**
- Consumes: `getResidentAccess(profile, new URL(request.url).searchParams)` from `@/lib/owner-test-mode`
- Produces: `getTestReportMetadata(access: ResidentAccess): { is_drill: boolean; changed_by_role: UserRole }` from `@/lib/owner-test-mode`
- Produces: Owner test GET results containing only the owner’s reports; Owner test POST reports with `is_drill: true`.

- [ ] **Step 1: Write the failing test**

~~~ts
import { getTestReportMetadata } from './owner-test-mode.ts'

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
~~~

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --experimental-strip-types src/lib/owner-test-mode.test.ts`

Expected: FAIL because `getTestReportMetadata` does not exist.

- [ ] **Step 3: Implement the API integration**

~~~ts
// Add to owner-test-mode.ts:
export function getTestReportMetadata(access: ResidentAccess) {
  return access.ownerTestMode
    ? { is_drill: true, changed_by_role: 'super_admin' as const }
    : { is_drill: false, changed_by_role: 'resident' as const }
}

// In requireApprovedResident(request: Request)
const access = getResidentAccess(profile, new URL(request.url).searchParams)
if (profileError || !profile || !access.allowed) {
  return { error: NextResponse.json({ message: 'Approved resident or Owner Test Mode access required.' }, { status: 403 }) }
}
return { profile, access }

// In GET, retain the reporter_id filter; it already scopes reports to auth.profile.user_id.

// In POST, before incidentPayload:
const reportMetadata = getTestReportMetadata(auth.access)

// Add to incidentPayload:
is_drill: reportMetadata.is_drill,

// Replace the status-history actor role:
changed_by_role: reportMetadata.changed_by_role,
reason: auth.access.ownerTestMode
  ? 'Super Admin submitted an Owner Test Mode emergency report.'
  : 'Resident submitted emergency report.',
~~~

- [ ] **Step 4: Run authorization and build checks**

Run: `node --experimental-strip-types src/lib/owner-test-mode.test.ts && pnpm build`

Expected: PASS tests and a successful Next.js production build.

- [ ] **Step 5: Commit**

~~~bash
git add rescue-portal/src/app/api/resident/incidents/route.ts rescue-portal/src/lib/owner-test-mode.test.ts
git commit -m "feat: allow owner drill submissions"
~~~

### Task 3: Make drill reports unmistakable in the Admin incident list

**Files:**
- Modify: `rescue-portal/src/app/admin/incidents/page.tsx:176-195`

**Interfaces:**
- Consumes: `inc.is_drill: boolean` from the existing `DemoIncident` type.
- Produces: An amber **TEST DRILL** label beside the report reference number when `is_drill` is true.

- [ ] **Step 1: Write the failing rendered check**

Run the Admin incidents page with a known drill row and require **TEST DRILL** to appear in the row that has `is_drill: true`.

- [ ] **Step 2: Run the check to verify it fails**

Run: Start `pnpm dev`, open `/admin/incidents` with an authenticated Super Admin session, and inspect the rendered incident row.

Expected: FAIL because drill rows have no visual distinction.

- [ ] **Step 3: Implement the drill label**

~~~tsx
<td className="px-4 py-3">
  <div className="flex items-center gap-2">
    <Link href={`/admin/incidents/${inc.id}`} className="font-mono text-xs text-blue-400 hover:text-blue-300">
      {inc.reference_number}
    </Link>
    {inc.is_drill && (
      <Badge className="border-amber-500/40 bg-amber-500/15 text-[10px] text-amber-300">
        TEST DRILL
      </Badge>
    )}
  </div>
</td>
~~~

- [ ] **Step 4: Re-run the rendered check**

Run: Reload the same Admin incidents page and inspect the row plus console logs.

Expected: PASS; the drill row visibly says **TEST DRILL** with no relevant console errors.

- [ ] **Step 5: Commit**

~~~bash
git add rescue-portal/src/app/admin/incidents/page.tsx
git commit -m "feat: label owner test drills"
~~~

### Task 4: Add the Super Admin portal-testing hub

**Files:**
- Modify: `rescue-portal/src/app/super-admin/page.tsx:3-12, 386-404`

**Interfaces:**
- Produces: Super Admin-only direct links to `/admin` and `/resident?owner-test-mode=1`.
- Does not alter: the existing per-tenant magic-link Login as Admin action.

- [ ] **Step 1: Write the failing test**

Create a rendered smoke-test checklist that requires the new labels **Portal Testing**, **Open Admin Portal**, and **Open Resident Test Portal** to be visible after an authenticated Super Admin page load.

- [ ] **Step 2: Run the failing rendered check**

Run: Start `pnpm dev`, then use the in-app Browser to load `/super-admin` with an authenticated Super Admin session.

Expected: FAIL because the three labels are absent.

- [ ] **Step 3: Implement the portal-testing card**

~~~tsx
<Card className="border-amber-500/30 bg-amber-500/5">
  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <p className="font-semibold text-white">Portal Testing</p>
      <p className="text-sm text-slate-400">Open either portal with your owner account. Resident reports are marked as drills.</p>
    </div>
    <div className="flex gap-2">
      <Button variant="outline" render={<Link href="/admin" />}>Open Admin Portal</Button>
      <Button className="bg-amber-600 hover:bg-amber-700" render={<Link href="/resident?owner-test-mode=1" />}>Open Resident Test Portal</Button>
    </div>
  </CardContent>
</Card>
~~~

- [ ] **Step 4: Re-run the rendered check**

Run: Reload the authenticated `/super-admin` page in the in-app Browser and inspect the DOM snapshot, console errors, and screenshot.

Expected: All three labels appear, the resident button URL includes `owner-test-mode=1`, and there are no relevant console errors.

- [ ] **Step 5: Commit**

~~~bash
git add rescue-portal/src/app/super-admin/page.tsx
git commit -m "feat: add super admin portal testing hub"
~~~

### Task 5: Surface testing context and return navigation

**Files:**
- Modify: `rescue-portal/src/app/admin/layout.tsx:1-24, 183-266`
- Modify: `rescue-portal/src/app/resident/layout.tsx:3-17, 28-91`

**Interfaces:**
- Consumes: authenticated profile from the existing Supabase browser client.
- Consumes: `owner-test-mode=1` from `useSearchParams()` in the resident layout.
- Produces: “Return to Super Admin” controls only for active Super Admin sessions; an owner-test banner only when the resident route is in Owner Test Mode.

- [ ] **Step 1: Write the failing rendered checks**

Use two authenticated Super Admin browser flows:

~~~text
/admin -> “Return to Super Admin” is visible
/resident?owner-test-mode=1 -> owner-testing notice and “Return to Super Admin” are visible
/resident -> owner-testing notice is absent
~~~

- [ ] **Step 2: Run the checks to verify they fail**

Run: Navigate the three routes in the in-app Browser and record DOM snapshots.

Expected: FAIL because the controls and notice are not yet rendered.

- [ ] **Step 3: Implement the minimum UI state**

~~~tsx
// after loading the browser profile in each layout
const isSuperAdmin = adminProfile?.role === 'super_admin'

// link for both layouts
{isSuperAdmin && <DropdownMenuItem render={<Link href="/super-admin" />}>Return to Super Admin</DropdownMenuItem>}

// resident-only banner; isOwnerTestMode is pathname/search-param derived
{isOwnerTestMode && isSuperAdmin && (
  <div className="bg-amber-100 px-4 py-2 text-center text-xs font-medium text-amber-900">
    Owner Test Mode — reports from this portal are saved as drills.
  </div>
)}
~~~

- [ ] **Step 4: Verify desktop and mobile rendering**

Run: Reload `/admin` at 1440px and `/resident?owner-test-mode=1` at 390px in the in-app Browser; check title, DOM snapshot, console logs, screenshots, and the Return action navigation.

Expected: PASS, no error overlay or relevant console error, clear testing notice on mobile, and both return actions land on `/super-admin`.

- [ ] **Step 5: Commit**

~~~bash
git add rescue-portal/src/app/admin/layout.tsx rescue-portal/src/app/resident/layout.tsx
git commit -m "feat: show owner test mode navigation"
~~~

### Task 6: Full-flow verification

**Files:**
- Modify: none unless verification reveals a defect.

**Interfaces:**
- Verifies: Super Admin hub → Resident Test Portal → drill submission → Admin incident visibility → Super Admin return.

- [ ] **Step 1: Run unit and production checks**

Run: `node --experimental-strip-types src/lib/owner-test-mode.test.ts && pnpm lint && pnpm build`

Expected: all checks pass without TypeScript or lint errors.

- [ ] **Step 2: Run the full browser flow**

Run: Using the in-app Browser with an authenticated Super Admin session, click **Open Resident Test Portal**, submit a complete incident with test-safe GPS values, then open **Open Admin Portal** and confirm the incident displays as a drill.

Expected: the submission succeeds; the Admin portal displays the new incident; the incident is identified as a drill; both portal shells expose Return to Super Admin.

- [ ] **Step 3: Capture QA evidence**

Collect: desktop screenshot of the hub, mobile screenshot of the resident test banner, and Admin screenshot showing the submitted drill; confirm page identity, non-blank content, absence of a framework overlay, relevant console-health state, and interaction proof.

- [ ] **Step 4: Handle any verified defect**

If a check fails, return to the task that owns the affected file, add a regression test or rendered check there, apply the minimal fix, rerun this full-flow verification, and use that task’s exact commit command.
