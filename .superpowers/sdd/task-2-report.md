# Task 2 Report: Tenant Edit Validation

## Completed scope

- Extended `TenantAction` and `isTenantAction` with the `edit` action.
- Added `TenantEditInput` with all required optional unknown input fields.
- Added `validateTenantEditorInput`, validating locality, tenant name and slug, contact and admin emails, administrator name, emergency hotline, subscription plan, and tenant status in first-error order.
- Added `buildEditedTenantBranding`, preserving unknown existing branding fields while overwriting the standard tenant plan, status, and location values.
- Added the requested tests for a valid payload, missing locality, malformed admin email, branding preservation/replacement, and action recognition.

## Test-driven evidence

1. Added the new tests before the production helpers existed.
2. Ran `node --experimental-strip-types src/lib/tenant-admin.test.ts`; it failed as expected because `buildEditedTenantBranding` was not exported.
3. Implemented the minimal shared helper layer.
4. Re-ran the command successfully: 10 tests passed, 0 failed.

## Verification command

```powershell
node --experimental-strip-types src/lib/tenant-admin.test.ts
```

Node emitted its pre-existing module-type warning because `rescue-portal/package.json` does not declare `"type": "module"`; it did not affect test execution. No unrelated files were changed for this task.

## P1 review follow-up: reject coerced non-string input

The reviewer identified that `String(value ?? '')` accepted arrays and objects whose string coercion looked valid. The editor validator now requires primitive strings for every string field before trimming or checking content. Plan and status also explicitly require strings before their allow-list checks.

### Regression evidence

1. Added a regression test before changing the helper. It supplies one-element arrays for locality, name, slug, hotline, contact email, and municipality-admin email; each array would have passed the previous string coercion.
2. Ran `node --experimental-strip-types src/lib/tenant-admin.test.ts`. The new test failed as expected: array locality produced `null` instead of `Choose a valid city or municipality.`
3. Replaced coercive validation with explicit primitive-string guards and then validated trimmed values.
4. Re-ran the same command successfully: 11 tests passed, 0 failed.
