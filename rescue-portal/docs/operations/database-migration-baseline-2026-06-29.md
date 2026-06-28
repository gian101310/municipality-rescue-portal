# Production Database Migration Baseline — 2026-06-29

## Project

- Supabase project reference: `jlbjwckqaydzdfhhubps`
- Capture method: Supabase CLI Management API read-only catalog queries
- Full `pg_dump` was not available because Docker Desktop is not installed on the workstation.

## Migration ledger before reconciliation

### Recorded remotely but absent from Git

`20260618191922`, `20260618201540`, `20260618225047`, `20260618225110`, `20260618225136`, `20260618225207`, `20260618225257`, `20260618225324`, `20260618225353`, `20260618225408`, `20260618225421`, `20260618225440`, `20260618225525`, `20260618225616`, `20260618225644`, `20260618225711`, `20260618225739`, `20260619040902`, `20260624141610`, `20260624141650`, `20260626192422`, `20260626192539`, `20260627174001`.

### Present in Git but absent from the remote ledger

`001`, `002`, `003`, `004`, `005`, `20260620222552`, `20260621103000`, `20260622123000`, `20260624`, `20260627180000`, `20260627182104`, `20260627182619`, `20260628011141`.

## Catalog evidence

Read-only queries against `information_schema`, `pg_catalog`, and `pg_policies` confirmed that the production schema contains the structural effects represented by the Git migrations:

- tenant organizations, municipality/barangay geography, organization scopes, profiles, incidents, incident child tables, teams and memberships;
- incoming SOS intake fields and index-compatible columns;
- offline delivery, timeline, trusted-session, dual-location, priority, and SMS fields;
- emergency type description and incident cancellation timestamp;
- responder location table and indexes;
- expanded responder/team roles and team-member positions.

The catalog also confirmed that policy and function privilege definitions are not identical to the intended Git definitions. These are treated as security defects and are corrected by the Phase 1 hardening migration rather than assumed safe:

- `audit_insert_any` allows public insertion;
- incident-child staff policies do not enforce organization ownership;
- the self-profile policy does not restrict authorization fields;
- `edit_tenant_settings` is executable by `anon` and `authenticated` despite being intended for `service_role` only;
- multiple `SECURITY DEFINER` functions have mutable search paths and broad execution grants.

## Reconciliation decision

The remote-only versions are legacy/manual deployment records whose resulting objects are represented by the consolidated Git migrations. Reconciliation changes only `supabase_migrations.schema_migrations`; it does not execute or revert application schema SQL.

1. Preserve the complete pre-reconciliation version lists in this document.
2. Mark the 23 legacy remote-only versions as reverted.
3. Mark the 13 verified Git versions as applied. The short responder migration version `20260627` is normalized to `20260627180000` to avoid colliding with later migrations from the same date.
4. Re-run `supabase migration list --linked` and require exact local/remote alignment.
5. Apply all future production changes only through committed migrations.

## Recovery procedure

If ledger reconciliation must be undone, mark the 13 Git versions reverted and restore the 23 legacy versions to applied using `supabase migration repair`. This restores ledger metadata only; it does not alter tables or production data.
