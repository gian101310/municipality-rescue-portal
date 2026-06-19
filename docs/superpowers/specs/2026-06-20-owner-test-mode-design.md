# Owner Test Mode Design

## Goal

Allow an approved Super Admin to test both the Admin and Resident portals with the same authenticated account, without needing a second resident login. Owner-created resident reports are always marked as drills so they cannot be mistaken for live emergencies.

## Access model

- Existing Super Admin permissions remain unchanged for the Admin portal.
- A Super Admin may use a dedicated Owner Test Mode for the Resident portal.
- Ordinary staff and residents cannot enable, use, or forge Owner Test Mode.
- The resident API validates the current authenticated account server-side. It permits either an approved resident, or an active Super Admin carrying the explicit owner-test request marker.
- Owner Test Mode preserves the Super Admin identity and organization scope. It does not impersonate a resident or change account roles.

## Super Admin navigation hub

The Super Admin page gains a clearly labelled **Portal Testing** section with:

1. **Open Admin Portal** — opens `/admin` using the existing Super Admin session.
2. **Open Resident Test Portal** — opens `/resident` with Owner Test Mode enabled.
3. **Return to Super Admin** controls in both portal shells when the signed-in account is a Super Admin.

The resident test portal displays a persistent owner-testing notice. Emergency submissions from this mode are recorded with `is_drill: true`, so they remain visible to the Admin portal for end-to-end testing but are distinguishable from genuine alerts.

## Resident data behavior

- The resident home and history APIs will return the Super Admin's own drill reports during Owner Test Mode.
- Submissions use the Super Admin's stored name, phone, organization, and location fields where available.
- Drill reports use the Super Admin user ID as the reporter ID and a status-history actor role of `super_admin`, preserving an accurate audit trail.
- Attachments retain the same authorization rule as incident submission.

## Error handling and security

- A direct visit to a resident route by a Super Admin without Owner Test Mode remains denied by the API.
- Missing profile data produces a clear error rather than silently using demo identity data.
- The client-side banner is informational only; server-side checks determine authorization and drill status.
- Existing approved-resident behavior is unchanged.

## Verification

Automated coverage will prove that resident authorization rejects a Super Admin without test mode and permits one with it, while forcing drill status. Rendered QA will confirm the Super Admin hub buttons, resident testing banner, return navigation, and an owner test submission through to its appearance in Admin incidents.
