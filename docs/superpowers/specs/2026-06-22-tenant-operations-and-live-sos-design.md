# Tenant operations, resident hotlines, and live SOS

## Goal

Remove tenant-profile drift in admin screens, give municipalities usable audit exports, make regional hotlines reachable from the resident portal, and improve SOS visibility without delaying rescue response.

## Tenant identity

- Every municipality admin screen, including Command Center, obtains its organization name, geography, and operational settings from the authenticated user profile's `organization_id` and the matching organization records.
- The UI must not use local demo settings or a browser-stored coverage choice as the source of the active tenant identity.
- The behavior applies to all existing tenants and every tenant created in the future.

## Audit exports

- Audit Logs uses the active tenant's persisted audit records rather than demo-only data.
- Add a **Download CSV** action.
- The CSV respects the visible search text and selected action filter, and contains timestamps, actor, role, action, entity, organization, and relevant before/after data.
- Export actions are themselves written to the audit log.

## Resident hotlines

- Add **Hotlines** to resident navigation and a resident-specific hotline page.
- The page uses the existing Region 2 directory for the first release, with searchable municipality/province listings and call-ready `tel:` actions.
- The directory data stays independent from the resident page, so future nationwide Philippine coverage can be added without replacing the resident route or navigation.

## Live SOS and location enrichment

1. An approved resident sends an SOS with GPS coordinates.
2. The server saves the incident immediately with its immutable submission timestamp and coordinates. This immediate write is the realtime event that drives the Command Center ping.
3. The Command Center immediately shows a pulsing SOS pin, the exact received time, and coordinates.
4. The server resolves the GPS point to a street/address and city without blocking the initial rescue alert. When complete, it updates the same incident, and the realtime update replaces the coordinate-only label with the full address.
5. Incident list, incident detail, map pin, and map sidebar use one location presentation: `street/address, city · latitude, longitude`.

If address lookup fails or is unavailable, coordinates remain visible and the incident stays actionable; lookup failure must never delay SOS receipt, verification, or dispatch.

## Audible live alerts

- New SOS reports trigger the existing realtime admin alert plus an audible ping.
- Sound is available per administrator, defaults to enabled for a new admin session, and can be deliberately muted in the dashboard.
- Realtime event handling must avoid duplicate sound/pin notifications when the same incident receives later address-enrichment updates.

## Admin logout confirmation

- Every municipality/admin dashboard has a visible **Log out** action.
- Selecting it opens a confirmation dialog that asks for the current signed-in administrator's own password.
- The server verifies that password against the current authenticated account. It never accepts a password supplied for another user and does not expose password state to the browser.
- Only after successful verification is the session signed out. Cancel, invalid password, or network failure leaves the current session active and displays a clear error.

## Verification plan

- Tenant context tests cover a non-Bayani tenant and a newly created tenant on Command Center and related admin headers.
- Audit CSV tests cover tenant isolation, search/action filtering, and export logging.
- Resident navigation tests cover the hotline route and Region 2 call links.
- SOS tests cover immediate incident creation, exact timestamp, coordinate fallback, address-enrichment update, address/coordinate display, and one audible alert per new SOS.
- Logout tests cover password-required confirmation, rejection on invalid password, and successful sign-out only after server validation.
- Run the full test suite and production build after implementation.
