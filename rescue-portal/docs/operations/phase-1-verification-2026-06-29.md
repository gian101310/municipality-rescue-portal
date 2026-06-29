# Phase 1 Production Verification — 2026-06-29

- Production commit: `3cdf33e`
- Production deployment: `dpl_6GAv1iCPzNvwA4zBGPP265GRkwhG`
- Deployment URL: `https://rescue-portal-qrrqhef9o-cfx-5002d3b9.vercel.app`
- Canonical URL: `https://www.rescue-portal.ph`
- Database migrations: `20260628220152`, `20260629163315`, `20260629163600`, `20260629163712`

## Evidence

- `pnpm test`: 100 passing tests.
- `pnpm build`: successful Next.js production build.
- Changed-file ESLint and `git diff --check`: clean.
- Linked migration ledger: local and remote versions aligned.
- Database lint: public application schema clean; reported findings were limited to Supabase-managed PostGIS extension functions.
- Rollback-only production SOS transaction: incident, location, history, timeline, audit, offline-delivery event, and idempotent replay verified.
- Rollback-only production assignment transaction: incident/team locks, assignment, history, timeline, incident-type audit metadata, and terminal-incident rejection verified.
- Vercel deployment reached Ready; post-deploy error scan returned no errors.
- Live domain: apex redirects to `www`; canonical page returns HTTP 200; authenticated settings endpoint rejects anonymous access.
- Mobile browser (390×844): dashboard, teams, incident detail, and reports had no horizontal page overflow.
- Authenticated browser: Operations Staff role/team menus opened with real tenant teams; incident assignment listed real available teams; False Alert and Cancelled were present; reports displayed incident Type; responder portal denied an admin session.

## Rollback

Application rollback uses the preceding Ready Vercel production deployment. Database migrations are security/additive changes and should be reversed only with a reviewed forward migration; do not delete emergency records or reset the migration ledger.
