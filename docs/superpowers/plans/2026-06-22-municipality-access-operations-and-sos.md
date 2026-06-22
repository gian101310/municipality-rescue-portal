# Municipality Access, Operations, and SOS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver municipality-scoped QR access, accurate tenant-aware operations screens, CSV audit reports, resident hotlines, and immediate address-enriched SOS alerts.

**Architecture:** Server routes derive organization scope from the authenticated profile or QR context; browser settings are only presentation state. SOS incidents are inserted before reverse-geocoding so realtime delivery is never delayed, then receive a location-enrichment update that reuses the same incident ID.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase Auth/Postgres/Realtime, TypeScript, Leaflet, Node test runner.

## Global Constraints

- Never trust a browser-provided organization ID for tenant authorization.
- Use `user_profiles.organization_id` as the authenticated tenant scope.
- Keep visitor reports verification-gated and verified resident reports expedited.
- Do not expose a Supabase service-role key to client code.
- Preserve coordinates when reverse geocoding cannot provide an address.
- All output CSV values must be safely escaped.

---

### Task 1: Tenant-scoped organization settings

**Files:**
- Modify: `rescue-portal/src/app/api/admin/organization-settings/route.ts`
- Modify: `rescue-portal/src/lib/settings-context.tsx`
- Modify: `rescue-portal/src/app/admin/page.tsx`
- Test: `rescue-portal/src/lib/tenant-settings.test.ts`

**Interfaces:**
- Produces `OrganizationSettings` with `name`, `emergency_hotline`, `secondary_hotline`, `email`, `map_center_lat`, `map_center_lng`, and `map_zoom`.
- `SettingsProvider` fetches `GET /api/admin/organization-settings` for an authenticated portal and never persists tenant identity in local storage.

- [ ] Write a failing test proving the active organization settings replace Bayani defaults.
- [ ] Run `node --test --experimental-strip-types src/lib/tenant-settings.test.ts`; expect failure because the helper does not exist.
- [ ] Add a pure `mergeOrganizationSettings(defaults, organization)` helper and have the provider fetch the organization route on mount.
- [ ] Return map fields from the route and render `settings.municipalityName` only after remote settings load.
- [ ] Re-run the focused test; expect pass.
- [ ] Commit: `git commit -am "fix tenant scoped admin settings"`.

### Task 2: Tenant-safe audit API and CSV serialization

**Files:**
- Create: `rescue-portal/src/app/api/admin/audit/route.ts`
- Create: `rescue-portal/src/lib/audit-export.ts`
- Create: `rescue-portal/src/lib/audit-export.test.ts`

**Interfaces:**
- `GET /api/admin/audit?search=&action=` returns only the current profile organization’s `audit_logs` rows.
- `POST /api/admin/audit` with `{ action: 'export_csv', filters }` creates the export audit event for that organization.
- `toAuditCsv(rows)` returns a UTF-8 CSV with escaped fields and headers `timestamp,actor,role,action,entity_type,entity_id,previous_values,new_values`.

- [ ] Write failing tests for quote/newline-safe CSV fields and action/search filtering.
- [ ] Run `node --test --experimental-strip-types src/lib/audit-export.test.ts`; expect failure.
- [ ] Implement `escapeCsvCell`, `filterAuditRows`, and `toAuditCsv` without client-supplied organization IDs.
- [ ] Add an admin-only route that looks up the session profile, constrains queries and audit insertions to `profile.organization_id`, and returns 401/403 for unauthorized callers.
- [ ] Re-run focused tests; expect pass.
- [ ] Commit: `git commit -am "feat tenant audit csv export"`.

### Task 3: Audit page download action

**Files:**
- Modify: `rescue-portal/src/app/admin/audit/page.tsx`
- Test: `rescue-portal/src/app/admin/audit/page.test.ts`

**Interfaces:**
- Loads `/api/admin/audit` instead of `DEMO_AUDIT_LOGS`.
- Download button creates `audit-log-YYYY-MM-DD.csv` from visible filtered rows and posts the export audit event.

- [ ] Write a source-level failing test requiring the audit route, `Download CSV`, and CSV MIME type.
- [ ] Run `node --test --experimental-strip-types src/app/admin/audit/page.test.ts`; expect failure.
- [ ] Replace demo-data filtering with fetched tenant rows, add loading/error states, and add an export button that downloads a Blob with `text/csv;charset=utf-8`.
- [ ] Re-run the test; expect pass.
- [ ] Commit: `git commit -am "feat downloadable audit reports"`.

### Task 4: Resident hotline route

**Files:**
- Create: `rescue-portal/src/app/resident/hotlines/page.tsx`
- Modify: `rescue-portal/src/app/resident/layout.tsx`
- Modify: `rescue-portal/src/app/emergency-hotlines/page.tsx`
- Test: `rescue-portal/src/app/resident/hotlines/page.test.ts`

**Interfaces:**
- `/resident/hotlines` presents the Region 2 data from `src/lib/hotline-data.ts` with telephone links.
- Resident bottom navigation adds `{ href: '/resident/hotlines', label: 'Hotlines', icon: Phone }`.

- [ ] Write a failing test asserting the resident route and `tel:` links exist.
- [ ] Run `node --test --experimental-strip-types src/app/resident/hotlines/page.test.ts`; expect failure.
- [ ] Extract the reusable hotline directory content from the public page into the resident route or a shared component; retain Region 2 labels and search.
- [ ] Add a `Phone` navigation item and use `residentHref` to preserve owner-test mode.
- [ ] Re-run the focused test; expect pass.
- [ ] Commit: `git commit -am "feat resident hotline directory"`.

### Task 5: Immediate SOS location presentation and enrichment

**Files:**
- Create: `rescue-portal/src/lib/incident-location.ts`
- Create: `rescue-portal/src/lib/incident-location.test.ts`
- Modify: `rescue-portal/src/app/api/resident/incidents/sos/route.ts`
- Modify: `rescue-portal/src/lib/dashboard-live-map.ts`
- Modify: `rescue-portal/src/components/map-view.tsx`
- Modify: `rescue-portal/src/app/admin/incidents/page.tsx`
- Modify: `rescue-portal/src/app/admin/map/page.tsx`
- Modify: `rescue-portal/src/app/admin/incidents/[id]/page.tsx`

**Interfaces:**
- `formatIncidentLocation({ address, municipality, latitude, longitude })` returns `address, municipality · 25.264946, 55.324554` or the coordinate fallback.
- `reverseGeocode(latitude, longitude)` returns `{ address, municipality } | null`.
- SOS response persists first, then schedules address enrichment for that same incident ID.

- [ ] Write failing unit tests for exact coordinate formatting, address formatting, and failed geocode fallback.
- [ ] Run `node --test --experimental-strip-types src/lib/incident-location.test.ts`; expect failure.
- [ ] Implement the formatter and reverse-geocoder with a server-only fetch, timeout, and null fallback.
- [ ] Insert the incident/location/history before calling the geocoder; use Next’s post-response work hook to update `incidents.address` and `incidents.municipality` after insertion.
- [ ] Pass formatted locations into map-marker labels, incident table locations, the map sidebar, and detail view.
- [ ] Re-run the focused tests; expect pass.
- [ ] Commit: `git commit -am "feat enrich sos location labels"`.

### Task 6: Live received time, map ping, and alert deduplication

**Files:**
- Modify: `rescue-portal/src/lib/live-incidents.ts`
- Modify: `rescue-portal/src/lib/live-incidents.test.ts`
- Modify: `rescue-portal/src/app/admin/page.tsx`
- Modify: `rescue-portal/src/lib/dashboard-live-map.test.ts`

**Interfaces:**
- A newly inserted SOS presents a `receivedAt` value from immutable `created_at`.
- `shouldNotifyForIncident(previous, next)` returns true only for the first arrival of an incident, not its address-enrichment update.

- [ ] Write failing tests for one realtime notification per new incident and exact `created_at` preservation.
- [ ] Run `node --test --experimental-strip-types src/lib/live-incidents.test.ts`; expect failure.
- [ ] Implement arrival detection and use it before `playAdminNotificationSound()` and the new-SOS toast.
- [ ] Render “Received HH:mm:ss” on Command Center and a pulse-enabled SOS marker with its complete label.
- [ ] Re-run focused tests; expect pass.
- [ ] Commit: `git commit -am "feat live sos received alerts"`.

### Task 7: Password-confirmed municipality admin logout

**Files:**
- Create: `rescue-portal/src/app/api/admin/confirm-logout/route.ts`
- Create: `rescue-portal/src/components/admin-logout-dialog.tsx`
- Modify: `rescue-portal/src/app/admin/layout.tsx`
- Test: `rescue-portal/src/lib/admin-logout.test.ts`

**Interfaces:**
- `POST /api/admin/confirm-logout` accepts `{ password }`, gets the session user, verifies the password using a no-persist Supabase anonymous client, and requires `verifiedUser.id === sessionUser.id`.
- `AdminLogoutDialog` only calls browser `auth.signOut()` after a successful confirmation response.

- [ ] Write failing tests for empty password rejection and the session-user ID equality requirement.
- [ ] Run `node --test --experimental-strip-types src/lib/admin-logout.test.ts`; expect failure.
- [ ] Add the server route; return 401 for no session, 400 for empty password, and 403 for failed verification without leaking account details.
- [ ] Replace the direct layout logout with the dialog; cancel/error retains the session, success clears demo session values and redirects to `/auth/login`.
- [ ] Re-run the focused test; expect pass.
- [ ] Commit: `git commit -am "feat password confirmed admin logout"`.

### Task 8: Municipality QR access hub and visitor reporting

**Files:**
- Create: `rescue-portal/src/app/auth/municipality-access/page.tsx`
- Modify: `rescue-portal/src/app/admin/qr-posters/page.tsx`
- Modify: `rescue-portal/src/app/auth/login/page.tsx`
- Modify: `rescue-portal/src/app/auth/register/page.tsx`
- Modify: `rescue-portal/src/app/resident/emergency/page.tsx`
- Modify: `rescue-portal/src/app/api/resident/incidents/route.ts`
- Test: `rescue-portal/src/lib/registration-context.test.ts`

**Interfaces:**
- QR links open `/auth/municipality-access` with a municipality context.
- Hub links preserve context for verified-resident sign-in, visitor report, and registration.
- Visitor intake requires name and phone and remains `verification_pending`; verified residents use their profile and can submit normally.

- [ ] Write failing tests for QR links retaining context and for visitor name/phone requirements.
- [ ] Run `node --test --experimental-strip-types src/lib/registration-context.test.ts`; expect failure.
- [ ] Add the three-choice access page and direct existing QR generation to it.
- [ ] Preserve the context through login/register redirects, constrain the barangay list to the QR municipality, and prevent province/municipality changes in the QR flow.
- [ ] Add the prominent default **I’m involved / victim** reporter option and a secondary passerby option for verified residents.
- [ ] Re-run focused tests; expect pass.
- [ ] Commit: `git commit -am "feat municipality qr resident access"`.

### Task 9: Full integration verification

**Files:**
- Modify: affected tests from Tasks 1–8 only.

- [ ] Run `npm test`; expect all tests to pass.
- [ ] Run `npm run build`; expect a successful Next.js production build.
- [ ] Run `npx --yes supabase db advisors --linked`; review any new security or performance findings before release.
- [ ] Test the linked production database with a read-only query confirming tenant-scoped audit rows remain isolated.
- [ ] Commit any verification-only correction with a focused message.
