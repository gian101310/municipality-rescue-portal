### Task 2: Define tenant edit validation with tests

Files:
- Modify: rescue-portal/src/lib/tenant-admin.ts
- Modify: rescue-portal/src/lib/tenant-admin.test.ts

Requirements:
- Extend TenantAction and isTenantAction to support exactly the new action 'edit'.
- Add a TenantEditInput type with optional unknown input fields: name, slug, contactEmail, emergencyHotline, adminFullName, adminEmail, municipalityCode, plan, status.
- Add validateTenantEditorInput(value): string | null.
  Validate locality code present, nonempty tenant name and slug, valid contact email, nonempty admin name, valid admin email, a nonempty emergency hotline, a valid plan, and a valid status. Return precise first error strings.
- Add buildEditedTenantBranding(existing, fields) which preserves unknown existing branding fields and sets tenant_plan, tenant_status, locality_code, province_code, region_code, municipality_name.
- Test first: valid complete input returns null; missing locality fails; bad admin email fails; existing branding fields are preserved while standard edit fields replace values; edit is a recognized action.
- Run node --experimental-strip-types src/lib/tenant-admin.test.ts and commit: git commit -m "feat: validate editable tenant settings".
