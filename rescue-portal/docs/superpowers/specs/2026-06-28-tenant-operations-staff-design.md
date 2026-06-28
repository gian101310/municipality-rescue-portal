# Tenant Operations Staff and Portal Redirect Design

## Objective

Give each municipality administrator control of its own operational staff accounts and rescue-team assignments without weakening tenant isolation or Super Admin control. Fix the team-member selectors and ensure Super Admin's **Open Admin Portal** action always returns to the production Rescue Portal rather than a localhost service.

## Responsibility Model

- Super Admin creates and controls tenants and each tenant's municipality Admin account.
- Tenant Admin manages only operational accounts in its own organization: `dispatcher`, `team_leader`, `responder`, and `staff`.
- Tenant Admin cannot create, promote, edit, or delete an `admin` or `super_admin` account.
- Super Admin retains platform-wide staff visibility, tenant account limits, emergency activation/deactivation, password recovery, and audit access.
- Existing tenant staff limits remain enforced server-side. The UI displays used and available seats but never acts as the enforcement boundary.

## Role and Team Model

Account role and team position remain separate:

- **Account role** controls login destination and authorization.
- **Team position** describes the person's operational job, such as Team Leader, Driver, Medic, Responder, Fire Specialist, or Communications.

Creating a responder or team leader may include an optional rescue team and team position. If selected, the account is added to `rescue_unit_members` immediately. Dispatcher accounts are not automatically added to a rescue vehicle team. Existing staff may be assigned or reassigned later.

The implementation continues to use `user_profiles` as the account directory and `rescue_unit_members` as the team membership source of truth. It will not create a duplicate staff table.

## Tenant Admin Experience

Add **Operations Staff** to Admin Settings.

The tab contains:

- A tenant-scoped list with name, email, phone, account role, active state, assigned team, and team position.
- Search and filters for role, team, and active state.
- An **Add Operations Account** action.
- Account creation fields: name, email, phone, temporary password, account role, optional rescue team, and optional team position.
- Edit actions for contact details, allowed operational role, activation state, team, and team position.
- Password reset/change action with existing strong-password rules.
- Mobile cards and a desktop table using the same data.

On the Rescue Teams page, expanding a team continues to show its members and an **Add Member** shortcut. The shortcut draws from the same tenant staff directory.

## Dropdown Defect

The Base UI select popup currently uses `z-index: 9999`, while the containing dialog uses `z-index: 10000`. The popup opens behind the dialog and therefore appears not to open.

Raise the shared select portal/positioner above dialogs and add a regression test covering select layering. This repairs both Staff Member and Position selectors, plus other selects used inside dialogs.

## APIs and Authorization

Create tenant-admin staff endpoints under `/api/admin/staff`.

- Every request authenticates the caller and loads its active, approved profile.
- Allowed managers: `admin` and `super_admin`. A normal tenant Admin is always restricted to its own `organization_id`; Super Admin must supply an explicit tenant context for cross-tenant use.
- Tenant Admin requests reject target roles `admin`, `super_admin`, and `resident`.
- Reads return only the caller's organization.
- Team IDs are validated against the same organization before membership is written.
- Staff seat limits are checked in the API.
- Account creation compensates safely: if profile or membership creation fails after Auth user creation, the new Auth user is removed.
- Deactivation preserves historical incident, assignment, and audit records. Tenant Admin does not hard-delete operational identities.
- Account creation, profile edits, role changes, activation changes, password actions, and team changes write audit logs using `user_profiles.id` as `actor_id`.

The existing Super Admin staff API remains available for platform oversight. Shared validation and account-service helpers should be extracted so the two APIs cannot drift on role rules, limits, or rollback behavior.

## Super Admin Portal Redirect

The production redirect is currently vulnerable to a configured `NEXT_PUBLIC_APP_URL` value pointing at localhost. Because that environment value exists, the safe fallback is never used.

The fix has two layers:

1. Set the Vercel production `NEXT_PUBLIC_APP_URL` to `https://www.rescue-portal.ph`.
2. Centralize canonical application URL validation. Production login links reject loopback hosts such as `localhost`, `127.0.0.1`, or port `3000` and fall back to `https://www.rescue-portal.ph`.

`/api/super-admin/login-as-admin` uses the validated canonical URL for `/admin`. Supabase's production Site URL and redirect allowlist must continue to include both `https://www.rescue-portal.ph/**` and `https://rescue-portal.ph/**`.

The link opens in a new tab as it does today. Verification must check both the generated link's `redirect_to` value and the final browser destination. Because same-origin authentication cookies are shared between tabs, the design will not claim that a new tab preserves two independent login sessions; returning to Super Admin may require signing back in. A future dedicated impersonation session can solve that separately without weakening current authentication.

## Error Handling

- Show API errors in the dialog instead of silently rendering an empty selector.
- If no eligible staff exist, explain that an Operations Staff account must be created first.
- If no rescue teams exist, link the Admin to create a team.
- Duplicate email, staff-limit, cross-tenant, invalid-role, and team-membership errors receive specific messages.
- Partial account creation is rolled back and logged.

## Verification

- Unit tests for tenant scoping, allowed roles, staff limits, team validation, rollback, audit actor IDs, and canonical URL validation.
- Component/source regression test proving select popups layer above dialogs.
- Full test suite and optimized Next.js build.
- Mobile verification of Operations Staff, Add Account, and team assignment.
- Production E2E drill: tenant Admin creates a temporary responder with team and position; responder logs in and sees the assigned mission; staff/membership/audit data are verified and then removed.
- Super Admin production E2E: Open Admin Portal resolves to `https://www.rescue-portal.ph/admin`, never localhost.
- Latest Vercel deployment must be Ready and runtime error logs clean before completion is reported.

## Out of Scope

- Automatic team assignment based only on account role.
- Multi-team shift scheduling changes.
- SMS or push invitations.
- A new staff database table.
- A new dual-session Super Admin impersonation architecture.
