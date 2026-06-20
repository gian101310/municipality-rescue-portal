# Task 4 Report
## Task 4 — Super Admin tenant settings editor

### Scope completed

- Added `emergency_hotline` and `admin_full_name` to the client-side `Tenant` type, matching the completed tenant API response.
- Added an Edit (`Pencil`) icon control to every desktop tenant row and every mobile tenant card.
- Added `openTenantEditor`, which pre-fills the existing municipality form from the selected returned row and derives PSGC province/locality codes by matching the returned province and municipality names against `PH_PROVINCES` and `PH_LOCALITIES`.
- Reused the add-client dialog as an edit dialog. Its edit title is **Edit Client Municipality** and it exposes name, slug, contact email, hotline, province, municipality, admin full name/email, plan, and status.
- The edit state never renders the temporary-password or settings-secret-key fields. Those remain create-only inputs; the existing separate password and secret-key actions remain unchanged.
- Added `handleEditTenant`, which PATCHes `/api/super-admin/tenants` with `tenantId`, `action: 'edit'`, and an explicit allow-list of editable values. It does not include password or master-key fields.
- `patchTenant` now reports success to the edit handler while preserving existing action behavior. It replaces the updated tenant row from the API response, shows a success/error toast, and closes the editor only after a successful save.

### TDD evidence

1. Added `rescue-portal/src/app/super-admin/page.test.ts` before UI implementation.
2. Ran `node --test src/app/super-admin/page.test.ts` before production code. It failed as expected because `Edit Client Municipality` was absent.
3. Implemented the editor UI and re-ran the same test. Latest result: 1 pass, 0 failures. Node emits its existing module-type warning for `.ts` tests but the assertion run is successful.

### Verification evidence

- `node --test src/app/super-admin/page.test.ts` — passed (1/1).
- `pnpm exec eslint src/app/super-admin/page.tsx src/app/super-admin/page.test.ts` — passed with no output/errors.
- `pnpm build` — passed. Next.js 16.2.9 completed compilation, TypeScript validation, route generation, and production optimization.
- `git diff --check` — passed with no whitespace errors.

### Known workspace context

- A full-repository `pnpm lint` still reports pre-existing errors in unrelated admin map/dashboard/responder/realtime files. The targeted lint for the edited page and its test is clean.
- A browser interaction check is not practical without an authenticated Super Admin session and tenant API data. The implemented page compiles through the production Next build; the automated source-level regression test verifies the editor controls, returned-field type support, edit action, and credential gating.
