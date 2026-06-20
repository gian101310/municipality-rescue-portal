# Immediate SOS Intake Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (\`- [ ]\`) syntax for tracking.

**Goal:** Create a location-first SOS handoff that reaches dispatch immediately, then enriches the same incident safely.

**Architecture:** An SOS endpoint creates one critical, server-owned incident immediately after a resident grants GPS permission. A resident-owned PATCH endpoint enriches that incident while its existing status lifecycle stays unchanged. The new \`intake_state\` distinguishes location-only alerts from completed reports.

**Tech Stack:** Next.js 16 route handlers, React 19, TypeScript, Supabase PostgreSQL/Auth/Realtime, node:test, Tailwind/shadcn.

## Global Constraints

- GPS coordinates are mandatory; do not create an SOS report without them.
- Never accept reporter name, phone, or organization from the client.
- Victim descriptions are optional; passerby descriptions are encouraged but never required.
- Preserve the existing incident status enum and status history.
- Apply and verify the Supabase schema migration before deploying API code that uses its fields.

---

### Task 1: Test and add intake validation

**Files:**
- Modify: \`rescue-portal/src/lib/incident-submission.ts\`
- Modify: \`rescue-portal/src/lib/incident-submission.test.ts\`

**Produces:** \`ReporterRole\`, \`IntakeState\`, and \`validateIncomingSosLocation\`.

- [ ] **Step 1: Write failing tests**

\`\`\`ts
it('accepts a location-only SOS handoff', () => {
  assert.deepEqual(validateIncomingSosLocation({ latitude: 14.1634, longitude: 121.243 }), { ok: true })
})

it('rejects an SOS handoff without GPS', () => {
  const result = validateIncomingSosLocation({ latitude: null, longitude: 121.243 })
  assert.equal(result.message, 'Share your current location before sending SOS.')
})

it('accepts a victim report without a description', () => {
  assert.deepEqual(validateIncidentSubmission({
    emergency_type_id: 'et-medical', emergency_type_name: 'Medical', description: '',
    affected_count: 1, latitude: 14.1, longitude: 121.2,
  }), { ok: true })
})
\`\`\`

- [ ] **Step 2: Prove the test is red**

Run: \`node --test --experimental-strip-types src/lib/incident-submission.test.ts\`

Expected: failure because the SOS helper is absent and description is still required.

- [ ] **Step 3: Implement the smallest shared validation**

\`\`\`ts
export type ReporterRole = 'victim' | 'passerby'
export type IntakeState = 'incoming' | 'details_received'

export function validateIncomingSosLocation(input: { latitude: number | null; longitude: number | null }): ValidationResult {
  return Number.isFinite(input.latitude) && Number.isFinite(input.longitude)
    ? { ok: true }
    : { ok: false, message: 'Share your current location before sending SOS.' }
}
\`\`\`

Remove only the description-required branch from \`validateIncidentSubmission\`; preserve type, GPS, and affected-count checks.

- [ ] **Step 4: Prove green and commit**

Run: \`node --test --experimental-strip-types src/lib/incident-submission.test.ts\`

Expected: PASS.

\`\`\`bash
git add src/lib/incident-submission.ts src/lib/incident-submission.test.ts
git commit -m "feat: support location-first SOS validation"
\`\`\`

### Task 2: Migrate the production incident contract

**Files:**
- Create: \`rescue-portal/supabase/migrations/<generated>_immediate_sos_intake.sql\`
- Modify: \`rescue-portal/src/lib/types.ts\`

**Produces:** \`incidents.intake_state\`, \`incidents.reporter_role\`, and global SOS/safety emergency types.

- [ ] **Step 1: Generate a migration**

Run: \`pnpm dlx supabase migration new immediate_sos_intake\`

Expected: a timestamped migration under \`supabase/migrations/\`.

- [ ] **Step 2: Write forward-only SQL**

\`\`\`sql
ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS intake_state TEXT NOT NULL DEFAULT 'details_received'
    CHECK (intake_state IN ('incoming', 'details_received')),
  ADD COLUMN IF NOT EXISTS reporter_role TEXT
    CHECK (reporter_role IN ('victim', 'passerby'));

CREATE INDEX IF NOT EXISTS idx_incidents_incoming_intake
  ON public.incidents (organization_id, created_at DESC)
  WHERE intake_state = 'incoming';
\`\`\`

Use the \`WITH emergency_type_seed ... INSERT ... WHERE NOT EXISTS\` approach from \`004_seed_global_emergency_types.sql\` to add global \`Emergency SOS\`, \`Domestic Abuse\`, \`Kidnapping\`, \`Hostage Situation\`, \`Bank Robbery\`, and \`Stabbing\` records without duplicates.

- [ ] **Step 3: Apply and verify in the production Supabase project**

\`\`\`sql
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'incidents'
  AND column_name IN ('intake_state', 'reporter_role');

SELECT name FROM public.emergency_types
WHERE organization_id IS NULL
  AND name IN ('Emergency SOS', 'Domestic Abuse', 'Kidnapping', 'Hostage Situation', 'Bank Robbery', 'Stabbing')
ORDER BY name;
\`\`\`

Expected: both columns and all six types.

- [ ] **Step 4: Add exact client types and commit**

\`\`\`ts
export type ReporterRole = 'victim' | 'passerby'
export type IncidentIntakeState = 'incoming' | 'details_received'

// in Incident
reporter_role: ReporterRole | null
intake_state: IncidentIntakeState
\`\`\`

\`\`\`bash
git add supabase/migrations src/lib/types.ts
git commit -m "feat: add immediate SOS incident fields"
\`\`\`

### Task 3: Build the immediate-handoff API

**Files:**
- Create: \`rescue-portal/src/app/api/resident/incidents/sos/route.ts\`
- Create: \`rescue-portal/src/app/api/resident/incidents/[id]/route.ts\`
- Modify: \`rescue-portal/src/app/api/resident/incidents/route.ts\`

**Produces:** \`POST /api/resident/incidents/sos\` and \`PATCH /api/resident/incidents/:id\`.

- [ ] **Step 1: Write a failing payload-builder test**

\`\`\`ts
assert.equal(buildIncomingSosPayload({ latitude: 14.1, longitude: 121.2 }, profile).status, 'submitted')
assert.equal(buildIncomingSosPayload({ latitude: 14.1, longitude: 121.2 }, profile).intake_state, 'incoming')
assert.equal(buildIncomingSosPayload({ latitude: 14.1, longitude: 121.2 }, profile).severity, 'critical')
\`\`\`

- [ ] **Step 2: Run it red**

Run: \`node --test --experimental-strip-types src/lib/incident-submission.test.ts\`

Expected: failure because the builder is absent.

- [ ] **Step 3: Implement POST SOS**

Authenticate with \`requireApprovedResident\`, validate coordinates, look up the globally seeded \`Emergency SOS\` type, and insert one incident with:

\`\`\`ts
{
  reporter_id: profile.user_id,
  reporter_name: profile.full_name,
  reporter_phone: profile.phone,
  status: 'submitted',
  severity: 'critical',
  description: '',
  affected_count: 1,
  latitude, longitude, gps_accuracy,
  intake_state: 'incoming',
}
\`\`\`

Then insert an \`incident_locations\` row with \`source: 'gps'\` and a status-history row with reason \`Resident sent GPS SOS; details pending.\`. Return \`201\` with the incident and reference.

- [ ] **Step 4: Implement PATCH enrichment**

Authenticate and fetch by both incident \`id\` and authenticated \`reporter_id\`. Reject non-incoming/missing incidents with 404. Validate \`reporter_role\`, the selected type’s organization scope, and hazards; then update only details:

\`\`\`ts
{
  emergency_type_id, description: clean(body.description), affected_count,
  has_unconscious, has_fire, has_flooding, has_violence,
  reporter_role, intake_state: 'details_received',
  severity: calculateSeverity(...).level, updated_at: new Date().toISOString(),
}
\`\`\`

Write status-history metadata with the calculated severity factors; do not alter the normal dispatch status.

- [ ] **Step 5: Preserve normal report compatibility**

Set normal POST reports to \`intake_state: 'details_received'\`, accept an optional \`reporter_role\`, and keep all existing client integrations working.

- [ ] **Step 6: Verify and commit**

Run: \`node --test --experimental-strip-types src/lib/incident-submission.test.ts && pnpm build\`

Expected: PASS and a successful production build.

\`\`\`bash
git add src/app/api/resident/incidents src/lib
git commit -m "feat: create and enrich location-first SOS incidents"
\`\`\`

### Task 4: Change the resident SOS control into a GPS handoff

**Files:**
- Modify: \`rescue-portal/src/app/resident/page.tsx\`
- Modify: \`rescue-portal/src/app/resident/emergency/page.tsx\`

**Produces:** exactly one immediate POST after GPS success, followed by a PATCH to the same incident.

- [ ] **Step 1: Capture GPS directly from the SOS click**

Replace the SOS Link-only control with a button that calls the browser API in its click handler, disables while sending, and posts only after success:

\`\`\`ts
navigator.geolocation.getCurrentPosition(async ({ coords }) => {
  const response = await fetch(withOwnerTestMode('/api/resident/incidents/sos', ownerTestMode), {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ latitude: coords.latitude, longitude: coords.longitude, gps_accuracy: coords.accuracy }),
  })
  // route to /resident/emergency?incident=<returned id> after HTTP 201
}, () => toast.error('Location is required to send SOS. Please allow location access and try again.'),
{ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 })
\`\`\`

- [ ] **Step 2: Add incident enrichment state**

When an \`incident\` query parameter is present, show “Location sent to dispatch” with the reference number and the direct emergency call controls. Filter \`Emergency SOS\` out of the resident’s selectable category list. Add a required two-button victim/passserby choice before saving the follow-up details.

- [ ] **Step 3: Make victim description optional**

Use copy: “Description is optional—you can leave it blank if it is unsafe to type.” for victims and “Share any safe details you can.” for passersby. Require only role and emergency type, never description.

- [ ] **Step 4: PATCH rather than create a second report**

Use the query incident ID for follow-up and attachment upload. On success retain the reference and show \`details_received\`; do not call the legacy POST route.

- [ ] **Step 5: Browser smoke test and commit**

Check: grant GPS → one POST → one incident URL → follow-up PATCH to same ID. Reject GPS → no POST and clear retry/call UI.

\`\`\`bash
git add src/app/resident/page.tsx src/app/resident/emergency/page.tsx
git commit -m "feat: send GPS immediately on SOS"
\`\`\`

### Task 5: Make incoming SOS actionable for dispatch

**Files:**
- Modify: \`rescue-portal/src/app/api/admin/dashboard/route.ts\`
- Modify: \`rescue-portal/src/app/admin/page.tsx\`
- Modify: \`rescue-portal/src/app/admin/incidents/page.tsx\`
- Modify: \`rescue-portal/src/app/admin/incidents/[id]/page.tsx\`

**Produces:** clear incoming-alert context, safe blank-description presentation, and a direct caller action.

- [ ] **Step 1: Include new fields in dashboard selects**

Add \`intake_state\` and \`reporter_role\` to the explicit incident select in the dashboard API without changing organization checks or existing status calculations.

- [ ] **Step 2: Render an incoming queue ahead of normal live incidents**

\`\`\`tsx
<p className="font-bold">Incoming SOS — location received</p>
<p className="text-sm">{incident.reporter_name ?? 'Registered resident'} · Details pending</p>
{incident.reporter_phone && <a href={\`tel:\${incident.reporter_phone}\`}>Call resident</a>}
<Link href={\`/admin/incidents/\${incident.id}\`}>Open incident</Link>
\`\`\`

- [ ] **Step 3: Add context to list and detail**

Show \`Incoming SOS\`, \`Victim\`, or \`Passerby\` as supplied. Render blank descriptions as \`No description provided\`, not an invalid report; preserve existing status controls.

- [ ] **Step 4: Build, test with authorized roles, and commit**

Run: \`pnpm build\`

Confirm a location-only incident appears before follow-up details, has call/location actions, and retains the same reference after the resident PATCHes.

\`\`\`bash
git add src/app/api/admin/dashboard/route.ts src/app/admin
git commit -m "feat: surface incoming SOS alerts to dispatch"
\`\`\`

### Task 6: Release and verify

- [ ] **Step 1: Run focused tests and build**

Run: \`node --test --experimental-strip-types src/lib/incident-submission.test.ts && pnpm build\`

Expected: tests/build pass. Report the known unrelated lint errors separately; do not represent lint as clean.

- [ ] **Step 2: Push and deploy the exact feature commits**

\`\`\`bash
git status -sb
git push origin main
pnpm exec vercel --prod --yes
\`\`\`

- [ ] **Step 3: Verify production safely**

Confirm the public type API returns the requested categories. In authorized resident and dispatcher sessions, test one end-to-end flow and confirm the immediate SOS and detail update share one reference number. Do not print resident details or secrets.

