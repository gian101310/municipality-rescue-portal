# Rescue Portal Production Hardening Design

## Objective

Make the live Rescue Portal safe for multi-tenant municipal use, reliable during emergency intake and dispatch, and free of demo or placeholder behavior. Existing working design and workflows remain intact unless a change is required for security, correctness, or an explicitly identified incomplete feature.

## Delivery strategy

Work is divided into independently deployable phases. Each phase must pass tests, build successfully, receive a production smoke test, and have a rollback point before the next phase starts.

1. **Security and life-safety:** reconcile the database migration ledger, close tenant and role escalation paths, protect privileged coverage settings, make SOS intake and dispatch atomic and idempotent, and repair offline emergency fallback.
2. **Live operational data:** replace demo audit logs, notifications, team shifts, attachment uploads, settings controls, and member removal with persisted tenant-scoped behavior.
3. **Platform hardening:** rotate trusted-device credentials, improve route-based ETA and stale-GPS communication, add location retention, structured audit coverage, CI, monitoring, backups, and mobile end-to-end tests.
4. **Final verification:** exercise resident, operations, admin, super-admin, and responder workflows on phone, tablet, and desktop against production-safe drill data.

## Security model

- A user cannot change their own role, organization, activation state, or registration state.
- Tenant staff can access only rows belonging to their organization, including child rows reached through incidents.
- Super-admin-only controls never fall back to an arbitrary tenant when authentication is missing.
- Service-role access remains server-only. Every route using it performs explicit authentication, role, activation, approval, and tenant checks.
- Audit data is append-only through controlled server operations and cannot be forged through the public Data API.

## Emergency data flow

SOS creation becomes one database transaction keyed by `local_sos_id`. A retry returns the already-created incident instead of creating a duplicate or becoming permanently stuck. Incident, location, status history, and timeline rows either all commit or none commit.

Dispatch assignment becomes one transaction that releases an old team, closes its assignment, assigns the new team, updates the incident, and records history. Concurrent assignment attempts are serialized on the incident row.

Offline state never claims that an SOS was received. The device stores the request, exposes an immediate tenant hotline call/SMS fallback, retries when the app is active and connectivity returns, and changes to “received” only after a server acknowledgement. The ten-minute escalation timer runs independently of network availability and retry exhaustion.

## Operational completeness

Every visible management control must either perform a real persisted action or be removed until implemented. Audit, notification, shift, attachment, team membership, and notification-setting screens use tenant-scoped production data. Demo fixtures are limited to explicit demo/test mode and never appear in production operations pages.

## Verification requirements

- Database policy tests use at least two tenants and prove both allowed and forbidden access.
- API tests cover inactive, unapproved, wrong-role, wrong-tenant, unauthenticated, retry, and partial-failure scenarios.
- Browser tests cover the complete drill path: resident SOS, operations verification, team assignment, responder acceptance/GPS/status, resident ETA/status, resolution, audit, and reporting.
- Production verification uses drill incidents and never sends real emergency notifications.
- No phase is reported complete without fresh test, build, deployment, log, and browser evidence.

## Rollback and data protection

Before the first schema change, capture the remote schema and migration ledger. Every migration is additive or policy-replacing and is paired with a reviewed rollback procedure. Application deployment follows database compatibility: expand database first, deploy compatible application second, verify, and only then remove obsolete behavior in a later phase.
