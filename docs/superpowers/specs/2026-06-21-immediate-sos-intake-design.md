# Immediate SOS intake

## Goal

Deliver a location-first emergency flow. When an authenticated resident taps SOS and allows location access, the portal must immediately create one actionable incident for municipal dispatch. The resident can safely add details afterward; dispatch can call or verify the resident even if those details never arrive.

## Resident flow

1. The resident taps the SOS control on the resident home page.
2. The app asks for the device location. Location permission and usable coordinates are mandatory to continue.
3. Once coordinates are received, the app creates an `Incoming SOS` incident with the resident's registered identity and phone number, coordinates, GPS accuracy, and a neutral initial emergency type.
4. The app takes the resident to a concise follow-up form tied to that incident. The incident is already visible to dispatch while this form is open.
5. The resident chooses whether they are the `victim` or a `passerby`, chooses an incident type, and may add hazards, affected people, media, and a description.
6. For victims, description is explicitly optional. For passersby it is encouraged but never blocks submission: emergency reporting must not depend on typing under pressure.
7. Saving details updates the same incident and marks its intake state as complete. Leaving the form keeps the incident in the incoming queue, with an explicit no-details-yet indicator.

If location permission is denied, unavailable, or times out, no incident is created. The resident gets a clear retry action and the existing emergency hotline action.

## Dispatch flow

* Incoming location-only reports are labelled `Incoming SOS — details pending` and remain actionable in the active-incident dashboard.
* The display includes the reporting resident's name, phone number, coordinates/map pin, GPS accuracy, and whether they identify as victim or passerby once supplied.
* Dispatch can use the existing call control or send a verification team even where no description was supplied.
* Existing incident status values and their normal dispatch lifecycle are unchanged. `intake_state` distinguishes an incomplete SOS handoff from a report whose follow-up details have arrived.

## Data and API contract

Add nullable `reporter_role` (`victim` or `passerby`) and non-null `intake_state` (`incoming` or `details_received`) to `incidents` through a forward-only Supabase migration. Existing incidents are backfilled to `details_received`.

The resident incident API is split into:

* `POST /api/resident/incidents/sos` creates the immediate location-first handoff. It validates authenticated resident access and GPS coordinates, uses a stable SOS emergency type, and records the initial status history entry.
* `PATCH /api/resident/incidents/[id]` updates only the reporting resident's incident while it is in the incoming stage. It validates the reporter role, safely accepts optional description, recalculates severity, and marks the intake state as `details_received`.

The usual completed-report creation endpoint remains available for compatibility, but its description validation becomes optional and it records the new intake fields.

## Emergency types

Add active global catalogue entries for Domestic Abuse, Kidnapping, Hostage Situation, Bank Robbery, and Stabbing. Use language that is safe for residents and recognizable to dispatch. The SOS fallback type is created or reused server-side, rather than relying on a client-generated ID.

## Safety and validation

* Never fabricate a location. A resident must share GPS before SOS is sent.
* Do not make description, media, hazard toggles, or affected count prerequisites for the initial handoff.
* Preserve the resident's authenticated identity from the server profile; never trust client-sent name or phone number.
* Keep direct emergency calling visible throughout the flow.
* Test validation behavior for location-only handoff, optional descriptions, victim/passersby values, and unsafe/missing coordinates before implementation.

## Verification

Automated tests cover the new submission validation and state transitions. Production build and lint must pass. A browser smoke test must confirm: SOS asks for location; a successful handoff shows the follow-up screen; details update the same reference; and the resident active-incident card remains present.
