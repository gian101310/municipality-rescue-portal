# Global Incident Catalogue and Tenant Editor Design

## Goal

Every municipality must start with a complete standard emergency catalogue, and the Super Admin must be able to create and edit tenant settings reliably from one management screen.

## Standard incident catalogue

A migration will add the following global emergency types only when an identical global type is not already present: Medical Emergency, Fire, Flood, Earthquake, Typhoon / Severe Storm, Vehicular Accident, Structure Collapse, Crime / Violence, Missing Person, Animal Rescue, and Other Emergency.

These rows use `organization_id = NULL`, making them shared platform defaults. They are active by default, ordered for the resident emergency picker, and include matching Lucide icon names, display colors, and short descriptions. Existing tenant-specific types remain unchanged.

The current emergency-type API already reads all active types, so residents in new and existing municipalities receive the standard catalogue as soon as the migration runs.

## Tenant creation reliability

The existing tenant-creation flow will be tightened and verified as one transaction-like workflow:

- Validate municipality, plan, status, emails, password strength, and unique slug before creating records.
- Create the organization, municipality, geography scope, admin Auth user, and approved admin profile.
- Return the full tenant representation, including the new admin email, so the Super Admin list updates immediately.
- Keep the current best-effort cleanup if a later operation fails.
- Add automated coverage for the shared validation and payload-building helpers; run a supervised browser creation test using a unique test tenant.

## Tenant editor

Each desktop row and mobile card gets a dedicated Edit action that opens a prefilled tenant editor.

The editor supports all non-secret tenant settings:

- Organization name, slug, contact email, emergency hotline
- Municipality / province / region selection
- Municipality-admin full name and email
- Subscription plan and tenant status

Saving applies the coordinated organization, municipality, geographic scope, and admin-profile updates. Changing an admin email also updates the corresponding Supabase Auth account. A duplicate slug or admin email is rejected before partial writes, and the list is updated with the returned tenant after a successful save.

Passwords and the settings master key remain separate, explicitly named actions. They are not shown or stored in the normal editor.

## Error handling and auditability

Only an active Super Admin may create or edit tenants. The edit endpoint validates the tenant ID, every editable field, and the selected Philippine locality. It rejects an existing slug owned by another tenant. Failed changes return a clear message and do not update the visible tenant row.

## Verification

Automated tests cover default catalogue idempotency metadata and tenant edit validation. Browser QA will verify the Super Admin type catalogue appears in the Resident picker, successful tenant creation, prefilled edit state, a saved normal-setting change, the preserved secret actions, and mobile edit access.

