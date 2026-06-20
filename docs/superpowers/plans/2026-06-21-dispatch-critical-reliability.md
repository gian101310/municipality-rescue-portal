# Dispatch-Critical Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Make SOS completion, staff status actions, live map pins, and operator notification sound reliable in production.

**Architecture:** History rows use the internal profile ID while incidents retain the Auth user ID. The existing authenticated status API powers Dispatch and Resolve. The map reuses the current Supabase Realtime subscription; polling is fallback only.

**Tech Stack:** Next.js 16, React 19, Supabase Auth/Postgres/Realtime, node:test, Tailwind/shadcn.

## Global Constraints

- Do not create test SOS records in production.
- incidents.reporter_id remains auth.users.id; incident_status_history.changed_by is user_profiles.id.
- Keep polling as fallback; new pins arrive through Realtime.
- Sound begins only after an operator interaction.

---

### Task 1: Correct status-history actor IDs

**Files:**
- Modify: rescue-portal/src/lib/incident-submission.ts
- Modify: rescue-portal/src/lib/incident-submission.test.ts
- Modify: rescue-portal/src/app/api/resident/incidents/route.ts
- Modify: rescue-portal/src/app/api/resident/incidents/sos/route.ts
- Modify: rescue-portal/src/app/api/resident/incidents/[id]/route.ts
- Modify: rescue-portal/src/app/api/admin/incidents/[id]/status/route.ts

**Produces:** history writes with changed_by set to the internal profile primary key.

- [x] Write the failing helper test:

    assert.equal(selectHistoryActorId({ id: 'profile-1', user_id: 'auth-1' }), 'profile-1')

- [x] Run node --test --experimental-strip-types src/lib/incident-submission.test.ts and verify it fails because the helper is absent.
- [x] Implement:

    export function selectHistoryActorId(profile: { id: string }) { return profile.id }

- [x] Include id in every relevant profile type, and replace every changed_by: profile.user_id with changed_by: selectHistoryActorId(profile).
- [x] Run the focused test and pnpm build; commit the verified change.

### Task 2: Wire real Dispatch and Resolve actions

**Files:**
- Modify: rescue-portal/src/app/admin/incidents/[id]/page.tsx

**Produces:** Dispatch calls the existing status API with dispatched; Resolve calls it with resolved. Neither control displays a demo toast.

- [x] Add a shared action handler that sends PATCH /api/admin/incidents/:id/status with { status, reason: '' }.
- [x] Use its returned incident to update detail-page state and show the actual status.
- [x] Replace only the fake Dispatch and Resolve controls; retain the status selector.
- [x] Run pnpm build and commit.

### Task 3: Deliver new incidents to the Live Map instantly

**Files:**
- Modify: rescue-portal/src/app/admin/map/page.tsx

**Produces:** map state updates through useRealtimeIncidents on INSERT and UPDATE, with polling retained as fallback.

- [x] Add a Realtime INSERT handler that prepends a non-duplicate incident.
- [x] Add an UPDATE handler that merges the returned row by incident ID.
- [x] Run pnpm build and commit.

### Task 4: Add a practical operator alarm

**Files:**
- Modify: rescue-portal/src/lib/notification-sound.ts
- Modify: rescue-portal/src/app/admin/page.tsx
- Modify: rescue-portal/src/lib/notification-sound.test.ts

**Produces:** an operator-activated six-tone incident alarm and a persisted mute/unmute control. Enabling sound plays the alarm as the audible confirmation.

- [x] Write a failing test asserting getIncidentAlarmPattern returns [740, 980, 740, 980, 740, 980].
- [x] Implement that helper and schedule its tones at 0.22-second intervals.
- [x] Retain dashboard interaction activation and the persisted mute/unmute control; enabling sound plays the alarm.
- [x] Run focused tests and pnpm build; commit.

### Task 5: Release and verify

- [ ] Commit all planned files as fix: restore live SOS dispatch reliability.
- [ ] Push main and deploy production through Vercel.
- [ ] Verify deployment READY and public.incidents stays in supabase_realtime without sending a test incident.
