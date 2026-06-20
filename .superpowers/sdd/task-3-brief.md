### Task 3: Implement secure tenant editing and complete create responses

Files:
- Modify rescue-portal/src/app/api/super-admin/tenants/route.ts

Requirements:
- Use the completed tenant-admin helpers validateTenantEditorInput and buildEditedTenantBranding.
- PATCH accepts action edit and validates all normal settings.
- Resolve municipality from PH_LOCALITIES; resolve province/region; reject invalid locality.
- Normalize slug with existing slugify and reject a slug owned by another tenant.
- Coordinate updates to organizations (name, slug, province, region, email, hotline, active/tier/branding), municipalities (name/province/region/map fields), organization_geo_scopes (upsert), the tenant admin user_profiles row (full name/email/geography), and the matching Supabase Auth user email.
- Preserve password and master-key paths unchanged.
- Re-query or construct a complete returned Tenant row including emergency_hotline and admin_full_name. Extend rowToTenant and query types as needed.
- For POST creation, call rowToTenant with the created admin profile values so new rows immediately show admin email/name.
- Add/extend unit-level verification of edit action/helper contract where possible, run existing tenant admin tests and pnpm build.
- Commit: git commit -m "feat: edit tenant settings securely"
