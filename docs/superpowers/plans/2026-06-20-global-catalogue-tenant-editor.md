# Global Incident Catalogue and Tenant Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preload every portal with standard incident types and give Super Admins reliable tenant creation and full non-secret tenant editing.

**Architecture:** A migration installs idempotent global emergency types. Shared tenant helpers validate an edit payload, and the Super Admin tenant route receives a new `edit` action that synchronizes organization, municipality, geography scope, admin profile, and Auth email. The existing Super Admin page adds a prefilled editor while preserving discrete password and secret-key actions.

**Tech Stack:** Next.js 16, React 19, TypeScript strict mode, Supabase PostgreSQL/Auth, Node built-in test runner, Tailwind CSS, shadcn/ui, Lucide React.

## Global Constraints

- Global emergency types use `organization_id = NULL`; tenant-specific types remain unchanged.
- The seed migration must be idempotent and never duplicate a global name.
- Only active Super Admins may create or edit tenants.
- The standard tenant editor must not expose, store, or edit passwords or master keys.
- No dependencies may be added.

---

## File Structure

- Create `rescue-portal/supabase/migrations/004_seed_global_emergency_types.sql` — safe idempotent global incident catalogue.
- Modify `rescue-portal/src/lib/tenant-admin.ts` — `edit` action type, editable tenant input normalization and validation.
- Modify `rescue-portal/src/lib/tenant-admin.test.ts` — test tenant edit validation and branding preservation.
- Modify `rescue-portal/src/app/api/super-admin/tenants/route.ts` — coherent edit transaction plus complete create response data.
- Modify `rescue-portal/src/app/super-admin/page.tsx` — Edit controls, prefilled editor state, and safe API save behavior.

### Task 1: Seed the idempotent global incident catalogue

**Files:**
- Create: `rescue-portal/supabase/migrations/004_seed_global_emergency_types.sql`

**Interfaces:**
- Produces: Eleven active global rows in `emergency_types`, sorted 10 through 110.
- Consumes: Existing `emergency_types(id, organization_id, name, icon, color, description, triage_questions, is_active, sort_order)`.

- [ ] **Step 1: Write the failing database assertion**

Use the Supabase SQL editor against the project database:

~~~sql
SELECT name, organization_id
FROM emergency_types
WHERE organization_id IS NULL
ORDER BY sort_order;
~~~

Expected: the query currently returns no global emergency types.

- [ ] **Step 2: Add the migration**

~~~sql
INSERT INTO emergency_types (organization_id, name, icon, color, description, triage_questions, is_active, sort_order)
SELECT NULL, seed.name, seed.icon, seed.color, seed.description, '[]'::jsonb, TRUE, seed.sort_order
FROM (
  VALUES
    ('Medical Emergency', 'Stethoscope', '#ef4444', 'Urgent medical care, injury, or illness.', 10),
    ('Fire', 'Flame', '#f97316', 'Structure, vehicle, grass, or wildland fire.', 20),
    ('Flood', 'Waves', '#0ea5e9', 'Flooding, flash flood, or water rescue.', 30),
    ('Earthquake', 'Activity', '#a855f7', 'Earthquake damage, trapped persons, or aftershock risk.', 40),
    ('Typhoon / Severe Storm', 'CloudLightning', '#6366f1', 'Typhoon, severe storm, or weather emergency.', 50),
    ('Vehicular Accident', 'Car', '#f59e0b', 'Vehicle collision or road traffic emergency.', 60),
    ('Structure Collapse', 'Building2', '#78716c', 'Collapsed building, landslide, or trapped persons.', 70),
    ('Crime / Violence', 'ShieldAlert', '#dc2626', 'Violence, threat, or public-safety emergency.', 80),
    ('Missing Person', 'UserSearch', '#2563eb', 'Missing or lost person report.', 90),
    ('Animal Rescue', 'PawPrint', '#16a34a', 'Injured, trapped, or dangerous animal.', 100),
    ('Other Emergency', 'AlertTriangle', '#6b7280', 'An emergency not represented by another category.', 110)
) AS seed(name, icon, color, description, sort_order)
WHERE NOT EXISTS (
  SELECT 1
  FROM emergency_types existing
  WHERE existing.organization_id IS NULL
    AND lower(existing.name) = lower(seed.name)
);
~~~

- [ ] **Step 3: Apply and verify the migration**

Run the migration through the configured Supabase migration process, then rerun the Step 1 query.

Expected: exactly eleven global rows appear in the listed order. Rerun the migration once more and confirm the count remains eleven.

- [ ] **Step 4: Commit**

~~~bash
git add rescue-portal/supabase/migrations/004_seed_global_emergency_types.sql
git commit -m "feat: seed global emergency types"
~~~

### Task 2: Define tenant edit validation with tests

**Files:**
- Modify: `rescue-portal/src/lib/tenant-admin.ts`
- Modify: `rescue-portal/src/lib/tenant-admin.test.ts`

**Interfaces:**
- Produces: `TenantAction` including `'edit'`.
- Produces: `validateTenantEditorInput(value): string | null`.
- Produces: `buildEditedTenantBranding(existing, { plan, status, localityCode, provinceCode, regionCode, municipalityName })`.

- [ ] **Step 1: Write the failing tests**

~~~ts
import { buildEditedTenantBranding, validateTenantEditorInput } from './tenant-admin.ts'

test('validates a complete editable tenant payload', () => {
  assert.equal(validateTenantEditorInput({
    name: 'City of San Fernando Emergency Rescue Portal',
    slug: 'san-fernando-pampanga',
    contactEmail: 'contact@sanfernando.gov.ph',
    emergencyHotline: '911',
    adminFullName: 'Maria Cruz',
    adminEmail: 'admin@sanfernando.gov.ph',
    municipalityCode: '035416000',
    plan: 'professional',
    status: 'active',
  }), null)
})

test('rejects an edit with no locality or invalid admin email', () => {
  assert.equal(validateTenantEditorInput({ municipalityCode: '', adminEmail: 'bad-email' }), 'Choose a valid city or municipality.')
})

test('preserves unrelated branding while replacing tenant editor values', () => {
  const branding = buildEditedTenantBranding({ logo_url: 'seal.svg', custom: true }, {
    plan: 'enterprise', status: 'active', localityCode: '035416000',
    provinceCode: '0354', regionCode: '03', municipalityName: 'San Fernando',
  })
  assert.equal(branding.logo_url, 'seal.svg')
  assert.equal(branding.tenant_plan, 'enterprise')
  assert.equal(branding.municipality_name, 'San Fernando')
})
~~~

- [ ] **Step 2: Run the tests to verify failure**

Run: `node --experimental-strip-types src/lib/tenant-admin.test.ts`

Expected: FAIL because the editor functions and `edit` action do not exist.

- [ ] **Step 3: Implement the pure helpers**

~~~ts
export type TenantEditInput = {
  name?: unknown
  slug?: unknown
  contactEmail?: unknown
  emergencyHotline?: unknown
  adminFullName?: unknown
  adminEmail?: unknown
  municipalityCode?: unknown
  plan?: unknown
  status?: unknown
}

export function validateTenantEditorInput(value: TenantEditInput) {
  if (!String(value.municipalityCode ?? '').trim()) return 'Choose a valid city or municipality.'
  if (!String(value.name ?? '').trim()) return 'Tenant name is required.'
  if (!String(value.slug ?? '').trim()) return 'Tenant slug is required.'
  if (!String(value.contactEmail ?? '').trim().match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) return 'Enter a valid contact email address.'
  if (!String(value.adminFullName ?? '').trim()) return 'Municipality admin name is required.'
  if (!String(value.adminEmail ?? '').trim().match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) return 'Enter a valid municipality admin email address.'
  return null
}
~~~

- [ ] **Step 4: Run the test to verify success**

Run: `node --experimental-strip-types src/lib/tenant-admin.test.ts`

Expected: PASS for all existing and new tenant-admin tests.

- [ ] **Step 5: Commit**

~~~bash
git add rescue-portal/src/lib/tenant-admin.ts rescue-portal/src/lib/tenant-admin.test.ts
git commit -m "feat: validate editable tenant settings"
~~~

### Task 3: Implement secure tenant editing and complete create responses

**Files:**
- Modify: `rescue-portal/src/app/api/super-admin/tenants/route.ts`

**Interfaces:**
- Consumes: `validateTenantEditorInput` and `buildEditedTenantBranding`.
- Consumes: `PH_LOCALITIES`, `PH_PROVINCES`, `PH_REGIONS`, `makeTenantScope`, `getScopeLocationDetails`, and `getFallbackMapCenter`.
- Produces: `PATCH { tenantId, action: 'edit', ...TenantEditInput }` returning `{ tenant }`.

- [ ] **Step 1: Write the failing request contract test**

Add a testable helper in `tenant-admin.test.ts` that expects `isTenantAction('edit')` to return true and expects `validateTenantEditorInput` to reject a missing name, invalid locality, and malformed email.

- [ ] **Step 2: Run the test to verify failure**

Run: `node --experimental-strip-types src/lib/tenant-admin.test.ts`

Expected: FAIL because `isTenantAction('edit')` returns false.

- [ ] **Step 3: Add the edit branch**

In the PATCH handler, resolve and validate the locality, check whether another organization owns the requested slug, then update the organization, municipality, geo scope, admin profile, and Auth user in this order:

~~~ts
if (action === 'edit') {
  const validationError = validateTenantEditorInput(body)
  if (validationError) return NextResponse.json({ message: validationError }, { status: 400 })

  const locality = PH_LOCALITIES.find((item) => item.code === String(body.municipalityCode))
  const province = PH_PROVINCES.find((item) => item.code === locality?.provinceCode)
  const region = PH_REGIONS.find((item) => item.code === locality?.regionCode)
  if (!locality || !region) return NextResponse.json({ message: 'Choose a valid city or municipality.' }, { status: 400 })

  const slug = slugify(String(body.slug))
  const { data: slugOwner } = await dataAdmin.from('organizations').select('id').eq('slug', slug).maybeSingle<{ id: string }>()
  if (slugOwner?.id && slugOwner.id !== tenantId) return NextResponse.json({ message: 'That tenant slug is already used.' }, { status: 400 })

  // Update organization, municipality, scope, profile, and Auth email using the validated locality.
}
~~~

The create response must call `rowToTenant(organization, municipality, { user_id: authUserData.user.id, organization_id: organization.id, full_name: adminFullName, email: adminEmail, role: 'admin' })` so the newly created row displays its admin email immediately.

- [ ] **Step 4: Run automated verification**

Run: `node --experimental-strip-types src/lib/tenant-admin.test.ts && pnpm build`

Expected: all tests pass and Next.js completes a production build.

- [ ] **Step 5: Commit**

~~~bash
git add rescue-portal/src/app/api/super-admin/tenants/route.ts rescue-portal/src/lib/tenant-admin.ts rescue-portal/src/lib/tenant-admin.test.ts
git commit -m "feat: edit tenant settings securely"
~~~

### Task 4: Add the prefilled tenant editor

**Files:**
- Modify: `rescue-portal/src/app/super-admin/page.tsx`

**Interfaces:**
- Consumes: `Tenant` list rows and the existing `TenantForm` shape.
- Produces: `openTenantEditor(tenant)`, `handleSaveTenantEdit(event)`, and Edit controls in desktop and mobile tenant lists.

- [ ] **Step 1: Write the failing rendered checks**

With a tenant present, verify that clicking the Edit control opens a dialog titled **Edit Client Municipality** with the tenant name, admin email, locality, plan, and status prefilled. Verify no password or master-key input appears.

- [ ] **Step 2: Run the checks to verify failure**

Run: use the in-app Browser on `/super-admin` with a signed-in Super Admin session.

Expected: FAIL because no Edit control or editor dialog exists.

- [ ] **Step 3: Implement editor state and UI**

~~~tsx
const [editingTenant, setEditingTenant] = useState<Tenant | null>(null)
const [editForm, setEditForm] = useState<TenantForm>(initialTenantForm)

function openTenantEditor(tenant: Tenant) {
  setEditingTenant(tenant)
  setEditForm({
    name: tenant.name,
    slug: tenant.slug,
    contactEmail: tenant.contact_email,
    emergencyHotline: '911',
    adminFullName: '',
    adminEmail: tenant.admin_email,
    adminPassword: '',
    masterKey: '',
    provinceCode: '',
    municipalityCode: '',
    plan: tenant.plan,
    status: tenant.status,
  })
}
~~~

The actual implementation must derive the prefilled locality codes from the tenant’s municipality/province values and extend the API list row with `emergency_hotline` and `admin_full_name` so every edit field is populated.

Use an Edit icon button in both the desktop table and mobile card. Reuse the current form controls, omit the password and master-key fields, and call `PATCH /api/super-admin/tenants` with `{ tenantId: editingTenant.id, action: 'edit', ...editForm }`.

- [ ] **Step 4: Re-run the rendered checks**

Run: reload the Super Admin page and open Edit on a tenant.

Expected: all normal settings are prefilled, the Save button is enabled for a valid form, and the existing password and secret-key controls remain separate.

- [ ] **Step 5: Commit**

~~~bash
git add rescue-portal/src/app/super-admin/page.tsx
git commit -m "feat: add tenant settings editor"
~~~

### Task 5: Verify real owner workflows

**Files:**
- Modify: none unless a verification-specific defect is discovered.

**Interfaces:**
- Verifies: incident picker defaults, tenant creation, tenant edit, and retained secret actions.

- [ ] **Step 1: Apply the database migration and load the resident picker**

Run the configured Supabase migration workflow, then open `/resident?owner-test-mode=1` in the in-app Browser and open the SOS emergency picker.

Expected: all eleven incident types are visible.

- [ ] **Step 2: Confirm before creating a live test tenant**

Ask the Super Admin for the exact test municipality, contact email, admin full name, admin email, and a strong temporary password. Explain that submission creates an Auth account and organization in Supabase.

- [ ] **Step 3: Exercise create and edit**

Create the approved test tenant in Super Admin, then open its Edit action and change one non-secret value such as the emergency hotline. Confirm the saved value appears in the list after reload. Do not change the password or secret key during this test.

- [ ] **Step 4: Run final checks**

Run: `node --experimental-strip-types src/lib/tenant-admin.test.ts && pnpm build`

Expected: tests pass, production build passes, and browser checks show no framework overlay.

- [ ] **Step 5: Commit only a verification-owned fix**

If Step 3 reveals a defect, return to its owning task, add its regression check, apply the minimal fix, rerun all Task 5 checks, and use that task’s commit command.
