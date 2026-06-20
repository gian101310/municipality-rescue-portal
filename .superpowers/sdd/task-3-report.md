# Task 3 — tenant API edit implementation report

## Scope completed

Modified only `rescue-portal/src/app/api/super-admin/tenants/route.ts`.

Commit: `9543365 feat: edit tenant settings securely`

- Imported and used `validateTenantEditorInput` and `buildEditedTenantBranding` from the completed tenant-admin helper work.
- Implemented `PATCH { action: "edit" }` with full normal-setting validation before any persistent writes.
- Resolves the requested locality from `PH_LOCALITIES`, derives the province and region from the PSGC lists, and rejects absent/invalid locality or region values.
- Normalizes the supplied slug with the route's existing `slugify` helper and blocks a duplicate slug when it belongs to a different organization.
- Updates the organization name, slug, province, region, contact email, emergency hotline, address/map center, activation status, subscription tier, and branding.
- Updates (or creates for a legacy missing row) the tenant municipality with its name, province, region, and fallback map center/zoom.
- Upserts `organization_geo_scopes` at municipality level with the selected PSGC codes and current PSGC label.
- Updates the current tenant admin profile's name, email, municipality id/name, and province; updates that same Supabase Auth user's email.
- Left the existing enable/disable, kick, password-change, and master-key rotation paths unchanged.
- Expanded `rowToTenant` with `emergency_hotline` and `admin_full_name`; POST now passes the new admin profile values into `rowToTenant`, so its immediate response is complete.

## Verification evidence

`node --test src/lib/tenant-admin.test.ts`

- Passed 11/11 checks, including: complete edit payload validation, malformed/missing fields, preservation of unrelated branding during edit, and recognition of `edit` as a valid tenant action.
- Node emitted its pre-existing module-type performance warning for TypeScript ESM parsing; it did not affect the passing result.

`pnpm build`

- Passed: production compilation, TypeScript, data collection, and static page generation all completed successfully.

`git diff --check`

- Passed with no whitespace errors.

## Residual considerations

- This route coordinates separate database and Supabase Auth calls. There is no cross-service transaction, so a database failure can still leave an earlier non-email settings write in place; the Auth/profile email mismatch is explicitly compensated by the P1 follow-up below.
- A focused route integration test is not present because this project has no route-test/mocking harness. The existing unit-level tenant-admin contract checks cover the validation and branding behavior consumed by this route.

## P1 follow-up — Auth email compensation

Commit: `3ad062d fix: compensate tenant auth email updates`

Root cause: the initial edit flow wrote organization, municipality, geography scope, and profile rows before calling Supabase Auth. A failed Auth email update therefore returned an error after database state had changed.

The edit path now uses `persistTenantEditWithAuthEmail`:

- It performs the Supabase Auth email update before any mutable database operation. Therefore an Auth update failure prevents all edit writes.
- It runs the database edits only after Auth succeeds. The tenant admin profile update is the final database operation, so any earlier database failure occurs while the profile still holds the previous email.
- If any database edit fails, it calls Supabase Auth again with the prior profile email before returning the original failure. This restores the Auth/profile email match. If that compensating Auth call itself fails, the route returns an explicit manual-reconciliation error rather than silently masking it.

TDD evidence:

- Added a test that initially failed because `persistTenantEditWithAuthEmail` was not exported; the failure was the expected missing-export error.
- Added and ran two unit tests: Auth failure prevents persistence, and later persistence failure restores the previous Auth email.
- `node --test src/lib/tenant-admin.test.ts` now passes 13/13 tests.
- `pnpm build` passes after the route integration.

## P1 follow-up — atomic database edit RPC

Commit: `c9b9a82 fix: make tenant edits atomic`

Root cause of the reviewer follow-up: compensation preserved the Auth/profile email relationship, but the persistence callback still issued separate organization, municipality, scope, and profile queries. A failure in a later query could commit an earlier query.

Changes:

- Added `supabase/migrations/005_atomic_tenant_edit.sql` with `public.edit_tenant_settings(UUID, UUID, JSONB)`.
- The function updates the organization, municipality (creating a missing legacy row), `organization_geo_scopes`, and admin `user_profiles` inside one PL/pgSQL function call. PostgreSQL rolls back the complete function statement if any statement raises, including the unique slug constraint.
- The function returns complete organization, municipality, and admin-profile data for the API response.
- Execution is revoked from `PUBLIC`, `anon`, and `authenticated`, and granted only to `service_role`; it is not a `SECURITY DEFINER` function.
- The PATCH route retains the existing Auth-first compensation helper and replaces all sequential database edits with the one `edit_tenant_settings` RPC. Thus Auth failure starts no database work; RPC failure rolls back all database writes and restores the prior Auth email.
- The migration includes `ADD COLUMN IF NOT EXISTS organizations.master_key_hash` to reconcile the existing route's master-key use with older bootstrap schemas before the RPC references that column.

Verification:

- A new migration contract test was written first and failed with the expected missing-migration `ENOENT`. It now verifies that the migration defines the RPC, changes all four database resources, and restricts execution to `service_role`.
- `node --test src/lib/tenant-admin.test.ts` passes 14/14 checks.
- `pnpm build` passes.
- A live SQL migration/test query could not be run in this workspace: neither `supabase` (including `pnpm exec supabase`) nor `psql` is installed. The ordered `005_` migration file is ready to apply through the project's Supabase deployment workflow.
