# Production Hardening Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Secure tenant boundaries and make emergency intake, dispatch, and offline fallback reliable without changing the established user interface.

**Architecture:** Reconcile production schema history before adding one reviewed hardening migration. Put multi-write emergency operations in restricted Postgres functions, keep authorization in both server routes and database policies, and extract offline fallback decisions into deterministic TypeScript helpers that can be tested without a browser.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Node test runner, Supabase Auth/Postgres/RLS, pnpm, Vercel.

## Global Constraints

- Preserve existing working UI and tenant behavior unless a change is required by this phase.
- Never expose the Supabase service-role key to the browser.
- Every behavior change follows a failing-test-first red/green cycle.
- Production verification uses drill data only.
- Database changes precede application deployment and remain backward compatible during rollout.

---

### Task 1: Reconcile the database migration baseline

**Files:**
- Create through Supabase CLI: the generated `supabase/migrations/*_remote_schema.sql`
- Create: `docs/operations/database-migration-baseline-2026-06-29.md`

**Interfaces:**
- Consumes: linked Supabase project metadata in `supabase/.temp`
- Produces: a committed representation of the live schema and an exact ledger reconciliation record

- [ ] Run `pnpm dlx supabase@latest migration list --linked` and save the local/remote version mapping in the operations document.
- [ ] Run `pnpm dlx supabase@latest db pull --linked` to capture the remote schema without applying changes.
- [ ] Compare the pulled schema with every existing migration and classify each local migration as already present remotely or genuinely unapplied.
- [ ] For each version proven present, copy its exact local version from the reconciliation table into the final argument of `pnpm dlx supabase@latest migration repair --status applied`; never mark an unverified version.
- [ ] Re-run `pnpm dlx supabase@latest migration list --linked`; expected: no unexplained local/remote divergence.
- [ ] Commit the baseline and reconciliation record before any production schema mutation.

### Task 2: Lock down tenant authorization

**Files:**
- Create via `supabase migration new`: the generated `supabase/migrations/*_harden_tenant_authorization.sql`
- Create: `src/lib/tenant-security.test.ts`
- Modify: `src/app/api/coverage-lock/route.ts`

**Interfaces:**
- Produces: same-tenant RLS predicates, restricted profile writes, controlled audit insertion, and `requireCoverageAdmin()` authorization

- [ ] Add source-contract tests proving residents cannot update authorization fields, every incident-child staff policy traverses to a same-organization incident, audit inserts are not public, and coverage updates require an active super-admin.
- [ ] Run `node --test --experimental-strip-types src/lib/tenant-security.test.ts`; expected: failures naming the current permissive policies and coverage fallback.
- [ ] Generate the migration with `pnpm dlx supabase@latest migration new harden_tenant_authorization`.
- [ ] Replace profile self-update with column privileges that permit only resident-editable identity/contact fields; revoke authorization-column updates from `authenticated`.
- [ ] Replace staff policies for locations, assignments, history, notes, attachments, triage, false-alert reviews, timeline, and audit with `TO authenticated` policies that require an active approved staff profile and a matching incident organization.
- [ ] Revoke public audit insertion and grant audit writes only to `service_role`.
- [ ] Remove unauthenticated/default-tenant fallback from coverage updates and require an active super-admin profile before using the service-role client.
- [ ] Run the targeted test again; expected: all tenant-security tests pass.

### Task 3: Make SOS intake atomic and idempotent

**Files:**
- Modify: the Phase 1 hardening migration
- Create: `src/lib/sos-intake.test.ts`
- Modify: `src/app/api/resident/incidents/sos/route.ts`

**Interfaces:**
- Produces: restricted RPC `create_resident_sos(jsonb)` returning the complete incident row and `created boolean`

- [ ] Add tests proving the route calls one RPC, forwards the stable `local_sos_id`, returns an existing incident on retry, and does not perform sequential incident/location/history inserts.
- [ ] Run the targeted test; expected: failure because the route still performs sequential writes.
- [ ] Add a `SECURITY DEFINER SET search_path = ''` function that authenticates the caller, locks/idempotently checks `local_sos_id`, validates the caller profile and tenant, and inserts incident, location, history, and timeline in one transaction.
- [ ] Revoke function execution from `PUBLIC` and `anon`; grant only to `authenticated`.
- [ ] Change the route to validate input and call the RPC using the authenticated Supabase client, mapping a first creation to HTTP 201 and an idempotent replay to HTTP 200.
- [ ] Run the targeted test and all incident-submission tests; expected: pass.

### Task 4: Make dispatch assignment atomic

**Files:**
- Modify: the Phase 1 hardening migration
- Modify: `src/lib/incident-assignment.test.ts`
- Modify: `src/app/api/admin/incidents/[id]/assignments/route.ts`

**Interfaces:**
- Produces: service-role-only RPC `assign_incident_team(p_incident_id uuid, p_rescue_unit_id uuid, p_actor_profile_id uuid)`

- [ ] Add tests proving assignment uses one RPC, enforces approved active staff, and records assignment/history/audit data with incident type.
- [ ] Run the targeted test; expected: failure on the current sequential update/insert implementation.
- [ ] Add the transactional function with row locks on the incident and involved units, same-tenant validation, old-team release, old-assignment cancellation, new assignment, history, and audit insertion.
- [ ] Restrict execution to `service_role` and schema-qualify every referenced object.
- [ ] Change the API route to enforce active approved role/tenant checks and call the RPC once.
- [ ] Run assignment and status tests; expected: pass.

### Task 5: Repair offline fallback semantics

**Files:**
- Create: `src/lib/offline-sos-policy.ts`
- Create: `src/lib/offline-sos-policy.test.ts`
- Modify: `src/lib/offline-sos-queue.ts`
- Modify: `src/hooks/use-offline-sos.ts`
- Modify: `src/components/offline-sos-banner.tsx`
- Modify: `src/lib/settings-context.tsx`

**Interfaces:**
- Produces: `getOfflineSosAction(record, now, online)` returning `retry | prompt_fallback | wait | exhausted`

- [ ] Add deterministic tests proving fallback is prompted after ten minutes while offline, remains available after retry exhaustion, retries only while online, and never labels a queued request as received.
- [ ] Run the targeted test; expected: failure because the policy module does not exist.
- [ ] Implement the policy helper and invoke it from a timer that runs even while offline.
- [ ] Keep failed records visible and retryable after connectivity returns; clean acknowledged records after 24 hours.
- [ ] Build call and SMS links from the current tenant hotline and show explicit “Not yet received by operations” copy until server acknowledgement.
- [ ] Run offline policy tests and existing SOS tests; expected: pass.

### Task 6: Apply, deploy, and verify Phase 1

**Files:**
- Modify only if required by verification: Phase 1 files above

**Interfaces:**
- Consumes: verified migration and application build
- Produces: live security and life-safety fixes with recorded evidence

- [ ] Run `pnpm test`, `pnpm exec eslint` on all changed source files, `pnpm build`, and `git diff --check`; expected: zero failures for changed scope and a successful production build.
- [ ] Run `pnpm dlx supabase@latest db lint --linked --level warning` and review public-schema findings.
- [ ] Apply the reviewed migration with `pnpm dlx supabase@latest db push --linked --dry-run`, inspect SQL, then run the same command without `--dry-run`.
- [ ] Execute read-only policy probes and transactional drill calls proving wrong-tenant denial, profile escalation denial, idempotent SOS replay, and atomic dispatch.
- [ ] Commit and push the application changes.
- [ ] Wait for the Vercel production deployment, inspect it, and scan runtime error logs.
- [ ] Run browser drill tests for resident SOS, operations intake, dispatch, responder mission/GPS, resident tracking, resolution, audit record, and offline copy at phone and desktop sizes.
- [ ] Record deployment URL, commit SHA, migration versions, test results, and rollback commands in `docs/operations/phase-1-verification-2026-06-29.md`.
