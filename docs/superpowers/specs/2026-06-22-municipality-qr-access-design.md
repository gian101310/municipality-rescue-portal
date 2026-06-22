# Municipality QR access and reporting

## Goal

Make a municipality QR code the entry point for both verified residents and unregistered witnesses, while keeping every report scoped to the municipality encoded by that QR code.

## Entry flow

1. A resident scans a municipality QR code.
2. The QR access page resolves and preserves the municipality context.
3. The page presents three clear choices:
   - **Verified Resident** — opens sign-in.
   - **Visitor / Witness** — opens the visitor emergency-report flow without creating an account.
   - **Need an account? Register** — opens resident registration in the same QR municipality context.
4. The QR flow must never send a person straight to registration by default.

## Verified resident flow

- A verified resident signs in through the QR flow and proceeds directly to the emergency report for that municipality.
- Their verified profile supplies their identity and municipality context, so no additional identity verification step is required before the report enters the rescue workflow.
- They do not select a province or municipality. If a location selector is needed, it displays only barangays belonging to the QR municipality.
- The reporter-role control uses two options:
  - **I'm involved / victim** — visually prominent, larger, and selected as the primary action.
  - **Passerby / witness** — a secondary option.

## Visitor / witness flow

- Visitors can report without a password or resident account.
- Before submitting, the form requires the visitor's name and phone number, followed by incident details and location.
- The QR municipality is retained server-side; visitors cannot change its province or municipality. A barangay selector is limited to that municipality when shown.
- A visitor report enters the existing verification path. Rescue-team deployment remains blocked until verification is completed.

## Data and security rules

- The server resolves the report organization from the QR context; the browser must not be trusted to choose a different municipality.
- A verified resident's authentication and approved profile determine the expedited reporting path.
- Visitor name and phone are stored as report-contact details and are available to verification staff.
- Existing non-QR registration remains globally selectable and continues to use its current geography behavior.

## Error handling

- Missing, expired, or invalid QR context shows a clear message and offers the public registration and login paths without inventing a municipality.
- A signed-in user who is not verified follows the normal pending/verification behavior rather than receiving the verified-resident shortcut.
- Visitor reports with missing name, phone, or required incident/location data cannot be submitted.

## Verification plan

- QR entry test: confirms the resident, visitor, and registration choices retain the municipality context.
- Verified resident test: confirms no province or municipality selection is offered and only municipality barangays are available.
- Visitor test: confirms name and phone are required and the submitted report remains verification-gated.
- UI test: confirms **I'm involved / victim** is the prominent reporter-role option.
- Run the full test suite and production build after implementation.
