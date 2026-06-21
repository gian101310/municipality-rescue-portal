# Live Dispatch Actions and Rescue Teams Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make operational incident controls and rescue-team management live, organization-scoped, and auditable.

**Architecture:** Browser audio uses a persistent mandatory Web Audio siren armed on first interaction. Authenticated admin APIs own team CRUD, organization-scoped sample-team seeding, team membership, escalation, and assignment writes. The existing incident status endpoint remains the canonical source for verification and dispatch transitions.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase Auth/Postgres/Realtime, node:test, Tailwind/shadcn.

## Global Constraints

- Do not create test SOS incidents in production.
- Alarm controls must not offer mute or disable; browser interaction is required only to satisfy autoplay rules.
- Each organization with no rescue units receives four editable starter units exactly once.
- `incident_status_history.changed_by` and `incident_assignments.assigned_by` use `user_profiles.id`, not `auth.users.id`.
- All staff actions must enforce organization ownership, except super-admin scope.

---

### Task 1: Mandatory emergency siren

**Files:**
- Modify: `rescue-portal/src/lib/notification-sound.ts`
- Modify: `rescue-portal/src/lib/notification-sound.test.ts`
- Modify: `rescue-portal/src/components/admin-sound-toggle.tsx`

**Produces:** A mandatory, repeating siren pattern with no off path.

- [ ] Write a failing test for `getMandatoryIncidentSirenPattern()` expecting twelve alternating low/high tones and `isIncidentAlarmMandatory()` expecting `true`.
- [ ] Run `node --test --experimental-strip-types src/lib/notification-sound.test.ts` and verify the missing exports fail.
- [ ] Implement `getMandatoryIncidentSirenPattern()` with `[520, 960, 520, 960, 520, 960, 520, 960, 520, 960, 520, 960]`, schedule 0.28-second tones at 0.12 gain, and remove the mute/off UI.
- [ ] Keep the first interaction listener to arm the single AudioContext; after it is armed, every incoming incident plays the siren.
- [ ] Re-run the focused test and commit `feat: require emergency incident siren`.

### Task 2: Real incident verification and escalation

**Files:**
- Create: `rescue-portal/src/app/api/admin/incidents/[id]/escalate/route.ts`
- Create: `rescue-portal/src/lib/incident-actions.ts`
- Create: `rescue-portal/src/lib/incident-actions.test.ts`
- Modify: `rescue-portal/src/app/admin/incidents/[id]/page.tsx`

**Produces:** Verify calls the status API; Escalate updates severity to critical and records history.

- [ ] Write failing tests for `buildVerificationRequest()` returning `{ status: 'verified', reason: '' }` and `buildEscalationPayload(reason)` returning `{ severity: 'critical', reason }`.
- [ ] Run the new test and verify it fails before implementation.
- [ ] Implement the two payload helpers and wire Verify to `applyStatus('verified')`.
- [ ] Implement escalation API authentication/organization checks, update the incident severity to `critical`, add an `incident_status_history` row with `reason`, and return the hydrated incident.
- [ ] Replace the Escalate demo toast with a confirmation dialog that requires an escalation reason and refreshes incident state from the API response.
- [ ] Run focused tests and `pnpm build`; commit `feat: make incident verification and escalation live`.

### Task 3: Rescue-unit API with organization-owned starter teams

**Files:**
- Create: `rescue-portal/src/app/api/admin/teams/route.ts`
- Create: `rescue-portal/src/app/api/admin/teams/[id]/route.ts`
- Create: `rescue-portal/src/lib/rescue-team-payload.ts`
- Create: `rescue-portal/src/lib/rescue-team-payload.test.ts`

**Produces:** Team list/create/update API and four editable starter teams only when an organization has none.

- [ ] Write a failing test for `buildStarterTeams(organizationId)` returning Alpha Rescue, Bravo Medical, Charlie Fire Support, and Delta Rapid Response with organization-specific codes.
- [ ] Run it and verify it fails.
- [ ] Implement authorization shared by admin/dispatcher roles; list only same-organization teams and seed the four starter rows only after a zero-team count.
- [ ] Implement POST validation for name/code/status/contact/vehicle/equipment/specializations and PATCH validation for the same editable fields.
- [ ] Ensure duplicate team codes are rejected per organization and API responses do not contain demo data.
- [ ] Run focused tests and commit `feat: add live municipality rescue teams`.

### Task 4: Team member and position management

**Files:**
- Create: `rescue-portal/src/app/api/admin/teams/[id]/members/route.ts`
- Create: `rescue-portal/src/lib/team-members.ts`
- Create: `rescue-portal/src/lib/team-members.test.ts`

**Produces:** Staff members can be added/removed from a municipal team with positions.

- [ ] Write failing tests for the accepted positions `team_leader`, `driver`, `medic`, `responder`, `fire_specialist`, and `communications`.
- [ ] Run the test and verify it fails.
- [ ] Implement member payload validation, organization ownership checks, team membership insert/update, and a clear duplicate-member error.
- [ ] Store position in the existing `rescue_unit_members.role` field and set `team_leader_id`/`team_leader_name` when the position is `team_leader`.
- [ ] Run focused tests and commit `feat: manage rescue team members`.

### Task 5: Live assignment and dispatch operation

**Files:**
- Create: `rescue-portal/src/app/api/admin/incidents/[id]/assignments/route.ts`
- Create: `rescue-portal/src/lib/incident-assignment.ts`
- Create: `rescue-portal/src/lib/incident-assignment.test.ts`
- Modify: `rescue-portal/src/app/admin/incidents/[id]/page.tsx`

**Produces:** Assign Team selects a real available team, records assignment, and moves the incident/team to assigned.

- [ ] Write a failing test for `buildAssignmentPayload(rescueUnitId)` returning `{ rescueUnitId }` and rejecting a blank ID.
- [ ] Run it and verify it fails.
- [ ] Implement assignment API: authenticate, verify incident and unit organization match, update `incidents.assigned_unit_id` and status `assigned`, insert `incident_assignments` with `assigned_by: profile.id`, update team status to `assigned`, and insert status history.
- [ ] Add an assignment dialog on the incident page that lists available municipal teams and updates local incident state after success.
- [ ] Run focused tests and `pnpm build`; commit `feat: assign live rescue teams to incidents`.

### Task 6: Replace the Rescue Teams demo UI

**Files:**
- Modify: `rescue-portal/src/app/admin/teams/page.tsx`
- Modify: `rescue-portal/src/app/admin/incidents/[id]/page.tsx`

**Produces:** Add/Edit/Member/Dispatch controls use the new APIs; no `DEMO_RESCUE_UNITS` or demo-action toast remains.

- [ ] Fetch real teams on page load and show loading, empty, and API-error states.
- [ ] Replace the Add Team dialog with fields for the validated team payload.
- [ ] Replace Edit Team with an editable team form and member management panel.
- [ ] Replace the team-card Dispatch button with a dialog that selects an active incident, then calls the incident assignment API.
- [ ] Search `src/app/admin/teams` for `Demo:` and `DEMO_RESCUE_UNITS`; remove all operational demo references.
- [ ] Run `pnpm build` and commit `feat: connect rescue team dashboard to live data`.

### Task 7: Release verification

- [ ] Run all focused node tests for notification, incident actions, team payloads, member positions, and assignments.
- [ ] Run `pnpm build` and inspect `git diff --check`.
- [ ] Push `main`, wait for Vercel production deployment `READY`, and verify `https://rescue-portal.vercel.app` returns HTTP 200.
- [ ] Hand off live checks: first dashboard click arms audio, submit SOS, Verify, Escalate with reason, Add/Edit team, add member/position, Assign Team, Dispatch team.
