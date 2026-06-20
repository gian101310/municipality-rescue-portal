# Dispatch-Critical Reliability

## Scope

Repair the immediate SOS and dispatch loop only. This slice covers the resident SOS handoff, victim/passserby follow-up, real incident status actions, live command-center/map updates, and a noticeable operator alarm. It intentionally excludes resident registration, barangay/captain management, QR posters, health monitoring, teams, and staff subaccounts; those are separate operational modules.

## SOS handoff

The initial SOS record continues to use `incidents.reporter_id = auth.users.id`, which matches the live `incidents_reporter_id_fkey`. Every `incident_status_history.changed_by` write must instead use `user_profiles.id`, which is the live foreign-key target. This applies to the immediate SOS creation, SOS detail PATCH, normal resident report creation, and staff status changes.

After the initial GPS handoff succeeds, the resident is redirected to the existing incident's follow-up screen. The screen requires a reporter role (`victim` or `passerby`) and an emergency type. A victim can leave the description blank; a passerby is encouraged, but not forced, to add safe details. The follow-up PATCH remains on the same incident reference and must not change the current dispatch status.

## Real dispatch actions

Replace the detail page's simulated Dispatch and Resolve buttons with calls to the existing authenticated status API. Dispatch moves an incident to `dispatched`; Resolve moves it to `resolved`. The status API writes the history record with the staff profile ID, returns the updated incident, and the detail view updates immediately. Existing status selector behavior remains available.

## Live incident awareness

The dashboard and Live Map both subscribe to the existing Supabase Realtime `incidents` publication. An INSERT prepends the new incident, an UPDATE replaces it, and both views use the incoming record's latitude/longitude directly for the map pin. The existing polling remains a resilience fallback only; users do not need to click Refresh.

On an incoming incident, the command center plays a stronger repeated alarm pattern only after the operator has interacted with the dashboard once, satisfying browser autoplay rules. A visible sound control starts enabled by default after that activation, lets the operator mute/unmute future alerts, and provides a test-alarm action. The alert remains a browser alert; no claim is made that it can wake a device with the browser closed.

## Safety and verification

* No test SOS is sent to production during automated verification.
* All status/history writes use the correct table-specific IDs.
* Tests cover ID selection and direct status-action requests.
* Build must pass; the actual resident-to-dispatch journey is validated by the operator in an authenticated live session.
