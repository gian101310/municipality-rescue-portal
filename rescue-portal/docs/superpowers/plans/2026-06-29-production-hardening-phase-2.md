# Production Hardening Phase 2 Plan

**Goal:** Remove demo-backed behavior from authenticated operational pages and persist every visible management action within the current tenant.

## Delivery slices

1. Add authenticated, tenant-scoped audit and notification APIs; replace fixture imports in audit and navigation notification surfaces.
2. Add a migrated `rescue_unit_shifts` table and admin API; replace the generated demo roster with real weekly assignments.
3. Add real Supabase Storage attachment upload with authenticated incident ownership, size/type validation, attachment metadata, and rollback on metadata failure.
4. Add team-member removal and finish any remaining visible no-op controls.
5. Remove coverage/demo fallbacks from production admin code and show explicit unavailable/unconfigured states instead of invented data.

Every slice follows a failing source/behavior test, targeted lint, full tests/build, production migration first, app deployment second, and live browser verification.
