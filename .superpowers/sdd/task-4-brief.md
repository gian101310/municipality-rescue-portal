### Task 4: Add the prefilled tenant editor

Files:
- Modify rescue-portal/src/app/super-admin/page.tsx

Requirements:
- Add an Edit icon control in both desktop tenant table rows and mobile tenant cards.
- Add a prefilled dialog titled Edit Client Municipality.
- It must let a Super Admin update name, slug, contact email, hotline, municipality/province, admin full name/email, plan, status.
- No password or master-key inputs in the edit form. Existing discrete password/master-key actions stay.
- Extend Tenant UI/API types as needed to prefill emergency_hotline and admin_full_name.
- Derive locality/province codes from returned tenant municipality/province values.
- Save PATCH /api/super-admin/tenants with tenantId, action edit, and edit values; replace the returned row in the tenant list, show success/error toast.
- Test/build and commit: git commit -m "feat: add tenant settings editor".
