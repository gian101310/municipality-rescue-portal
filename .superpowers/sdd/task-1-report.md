# Task 1 — Global emergency type catalogue

## Scope

Created `rescue-portal/supabase/migrations/004_seed_global_emergency_types.sql` only. It inserts the eleven specified active, global (`organization_id IS NULL`) emergency types with the requested icons, colors, descriptions, sort orders, and empty JSONB `triage_questions`.

The migration does not update or delete existing records. Its `NOT EXISTS` guard examines only global rows and compares `lower(existing.name)` with `lower(seed.name)`, so it neither duplicates a global name with different casing nor changes tenant-specific types.

## TDD / database assertions

This configuration-only migration has no application runtime code path to unit-test. The equivalent test-first database assertions were defined before implementation:

### Pre-migration assertion

Run before applying the migration. It must return zero rows; any result identifies a pre-existing duplicate among the requested global names.

```sql
WITH expected(name) AS (
  VALUES
    ('Medical Emergency'), ('Fire'), ('Flood'), ('Earthquake'),
    ('Typhoon / Severe Storm'), ('Vehicular Accident'), ('Structure Collapse'),
    ('Crime / Violence'), ('Missing Person'), ('Animal Rescue'), ('Other Emergency')
)
SELECT lower(et.name) AS name, count(*) AS duplicate_count
FROM emergency_types AS et
JOIN expected AS e ON lower(e.name) = lower(et.name)
WHERE et.organization_id IS NULL
GROUP BY lower(et.name)
HAVING count(*) > 1;
```

### Post-migration verification

Run after applying the migration. It must return `11` for `global_catalogue_rows`, `11` for `distinct_global_names`, and `0` for `invalid_rows`.

```sql
WITH expected(name, icon, color, description, sort_order) AS (
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
), catalogue AS (
  SELECT et.*
  FROM emergency_types AS et
  JOIN expected AS e ON lower(e.name) = lower(et.name)
  WHERE et.organization_id IS NULL
)
SELECT
  count(*) AS global_catalogue_rows,
  count(DISTINCT lower(name)) AS distinct_global_names,
  count(*) FILTER (
    WHERE NOT is_active
       OR triage_questions <> '[]'::jsonb
       OR NOT EXISTS (
         SELECT 1
         FROM expected AS e
         WHERE lower(e.name) = lower(catalogue.name)
           AND e.icon = catalogue.icon
           AND e.color = catalogue.color
           AND e.description = catalogue.description
           AND e.sort_order = catalogue.sort_order
       )
  ) AS invalid_rows
FROM catalogue;
```

## Verification performed

- Ran a static assertion script against the migration: it confirmed all 11 exact records, JSONB empty-array values, active status, and the case-insensitive global idempotency predicate.
- Ran `git diff --check`: passed with no whitespace errors.
- The local environment has neither `supabase` CLI nor `psql`; no database was altered or queried. Execute the post-migration SQL above in the target Supabase SQL editor or CI migration environment when applying the migration.
