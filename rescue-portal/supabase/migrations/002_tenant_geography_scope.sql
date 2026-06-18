-- ============================================================
-- 002_tenant_geography_scope.sql
-- Buyer geography coverage locks for PSGC-scoped deployments.
-- Source: PSA PSGC as of 31 March 2026.
-- ============================================================

DO $$ BEGIN
  CREATE TYPE geography_scope_level AS ENUM (
    'country',
    'region',
    'province',
    'municipality'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS organization_geo_scopes (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id     UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  scope_level         geography_scope_level NOT NULL DEFAULT 'municipality',
  region_code         TEXT,
  province_code       TEXT,
  municipality_code   TEXT,
  psgc_version        TEXT NOT NULL DEFAULT 'PSGC as of 31 March 2026',
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT organization_geo_scopes_required_codes CHECK (
    (scope_level = 'country' AND region_code IS NULL AND province_code IS NULL AND municipality_code IS NULL)
    OR (scope_level = 'region' AND region_code IS NOT NULL AND province_code IS NULL AND municipality_code IS NULL)
    OR (scope_level = 'province' AND region_code IS NOT NULL AND province_code IS NOT NULL AND municipality_code IS NULL)
    OR (scope_level = 'municipality' AND region_code IS NOT NULL AND municipality_code IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_org_geo_scopes_org
  ON organization_geo_scopes(organization_id);

CREATE INDEX IF NOT EXISTS idx_org_geo_scopes_region
  ON organization_geo_scopes(region_code);

CREATE INDEX IF NOT EXISTS idx_org_geo_scopes_province
  ON organization_geo_scopes(province_code);

CREATE INDEX IF NOT EXISTS idx_org_geo_scopes_municipality
  ON organization_geo_scopes(municipality_code);

ALTER TABLE organization_geo_scopes ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON organization_geo_scopes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON organization_geo_scopes TO service_role;

CREATE POLICY "org_geo_scope_select_same_org"
  ON organization_geo_scopes FOR SELECT
  TO authenticated
  USING (organization_id = get_current_org_id());

CREATE POLICY "org_geo_scope_manage_admin"
  ON organization_geo_scopes FOR ALL
  TO authenticated
  USING (is_admin() AND organization_id = get_current_org_id())
  WITH CHECK (is_admin() AND organization_id = get_current_org_id());

CREATE OR REPLACE TRIGGER trg_organization_geo_scopes_updated_at
  BEFORE UPDATE ON organization_geo_scopes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- END OF MIGRATION 002
-- ============================================================
