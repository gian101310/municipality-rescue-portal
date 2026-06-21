# Live Dispatch Actions and Rescue Teams Design

## Goal

Replace remaining operational demo controls with live, municipality-scoped actions: a persistent emergency alarm, incident verification/escalation/team assignment, and real rescue-team management.

## Scope

### Operator alarm

- Replace the short notification pattern with a distinct repeating high-volume emergency siren/wail and a critical visual alert.
- Continue to require one browser interaction to arm Web Audio; this is imposed by browser security.
- Alarm activation is mandatory: there is no mute or off control for municipal operators.
- The alarm is a browser-open alert. Waking a sleeping or muted device requires a later server-side push/SMS/call escalation system and is outside this release.

### Incident actions

- **Verify Incident** calls the existing authenticated status route with `verified`.
- **Escalate** raises the incident severity to `critical`, records the responsible staff member and reason, and returns the updated incident.
- **Assign Team** opens a list of eligible teams from the same municipality. Confirmation writes `incidents.assigned_unit_id`, creates an `incident_assignments` row, moves the incident to `assigned`, and marks the selected team `assigned`.
- Every action is organization checked, authenticated, and recorded in incident status history or assignment data.

### Rescue Teams

- When an organization has no team records, create four editable starter teams for that organization: Alpha Rescue, Bravo Medical, Charlie Fire Support, and Delta Rapid Response. These are real municipality-owned sample records, not front-end demo data.
- Replace `DEMO_RESCUE_UNITS` with rescue units loaded from `rescue_units` for the current admin's municipality/organization.
- Add team creation and editing for name, code, contact number, status, vehicle data, equipment, and specializations.
- Add and manage team members through `rescue_unit_members`, including their name and position: team leader, driver, medic, responder, fire specialist, or communications.
- Dispatch from a team card requires choosing an active municipality incident. It uses the same assignment operation as the incident detail page, ensuring a single audit path.
- The four starter teams are editable and remain isolated to the municipality that first loads them.

## API and data flow

```text
Admin action -> authenticated admin API -> organization ownership check
             -> incidents / rescue_units / incident_assignments update
             -> status-history/audit write -> returned updated entity
             -> Supabase Realtime -> dashboard, map, operator views
```

- New team APIs expose only the current organization except for super-admin access.
- Assignment writes are transactional where supported by the existing Supabase API sequence; errors leave the UI unchanged and show a clear failure message.
- The existing live incident status endpoint remains the source for Verify and Dispatch status transitions.

## Validation

- Unit tests cover siren pattern selection, escalation payload, and assignment request construction.
- API tests cover authorization and organization ownership where current test infrastructure allows.
- `pnpm build` must pass.
- Production deployment must be Ready before live handoff. No artificial SOS records are created for testing.

## Deferred work

Resident imports/contact fields, custom emergency types, QR posters, captains bulk import, system health, and operator subaccounts remain separate releases in the priority order already shared with the owner.
