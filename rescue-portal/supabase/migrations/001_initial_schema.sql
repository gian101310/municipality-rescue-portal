-- ============================================================
-- 001_initial_schema.sql
-- Municipality Rescue Portal — Initial Database Schema
-- ============================================================
-- Run order:
--   1. Extensions
--   2. Custom types (enums)
--   3. Tables (in dependency order)
--   4. Indexes
--   5. Row-Level Security policies
--   6. Triggers & functions
-- ============================================================

-- ============================================================
-- 1. EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";   -- for geo queries (optional; comment out if not available)

-- ============================================================
-- 2. ENUM TYPES
-- ============================================================

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'super_admin',
    'admin',
    'dispatcher',
    'team_leader',
    'responder',
    'verifier',
    'staff',
    'resident'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE incident_status AS ENUM (
    'submitted',
    'received',
    'verification_pending',
    'verified',
    'assigned',
    'accepted',
    'preparing',
    'dispatched',
    'on_the_way',
    'arrived',
    'operation_in_progress',
    'transporting',
    'resolved',
    'closed',
    'duplicate',
    'invalid',
    'false_alert',
    'cancelled',
    'unable_to_contact',
    'transferred'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE severity_level AS ENUM (
    'critical',
    'high',
    'medium',
    'low',
    'info'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE team_status AS ENUM (
    'available',
    'assigned',
    'preparing',
    'dispatched',
    'on_scene',
    'returning',
    'off_duty',
    'unavailable'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE registration_status AS ENUM (
    'draft',
    'submitted',
    'under_review',
    'more_info_required',
    'approved',
    'rejected',
    'suspended'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'incident_new',
    'incident_update',
    'incident_assigned',
    'incident_resolved',
    'unit_status_change',
    'registration_update',
    'system',
    'alert'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_priority AS ENUM (
    'urgent',
    'high',
    'normal',
    'low'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE assignment_status AS ENUM (
    'assigned',
    'accepted',
    'declined',
    'cancelled',
    'completed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE telegram_message_status AS ENUM (
    'pending',
    'sent',
    'delivered',
    'failed',
    'retrying'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE id_type AS ENUM (
    'national_id',
    'drivers_license',
    'passport',
    'philhealth',
    'sss',
    'gsis',
    'voters_id',
    'postal_id',
    'barangay_id',
    'senior_citizen_id',
    'pwd_id',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE audit_action AS ENUM (
    'create',
    'update',
    'delete',
    'login',
    'logout',
    'assign',
    'unassign',
    'status_change',
    'approve',
    'reject',
    'verify',
    'export',
    'view'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 3. TABLES
-- ============================================================

-- ── 3.1 Organizations ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS organizations (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                TEXT NOT NULL,
  slug                TEXT NOT NULL UNIQUE,
  province            TEXT NOT NULL,
  region              TEXT NOT NULL,
  logo_url            TEXT,
  seal_url            TEXT,
  emergency_hotline   TEXT NOT NULL,
  secondary_hotline   TEXT,
  email               TEXT,
  website             TEXT,
  address             TEXT,
  -- Map defaults
  map_center_lat      DOUBLE PRECISION NOT NULL DEFAULT 14.5995,
  map_center_lng      DOUBLE PRECISION NOT NULL DEFAULT 120.9842,
  map_zoom            SMALLINT NOT NULL DEFAULT 13,
  -- Branding (stored as JSONB for flexibility)
  branding            JSONB NOT NULL DEFAULT '{}',
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  subscription_tier   TEXT NOT NULL DEFAULT 'free'
                        CHECK (subscription_tier IN ('free', 'basic', 'pro', 'enterprise')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3.2 Municipalities ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS municipalities (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  province            TEXT NOT NULL,
  region              TEXT NOT NULL,
  zip_code            TEXT,
  map_center_lat      DOUBLE PRECISION NOT NULL DEFAULT 14.5995,
  map_center_lng      DOUBLE PRECISION NOT NULL DEFAULT 120.9842,
  map_zoom            SMALLINT NOT NULL DEFAULT 13,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3.3 Barangays ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS barangays (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  municipality_id         UUID NOT NULL REFERENCES municipalities(id) ON DELETE CASCADE,
  organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                    TEXT NOT NULL,
  captain_name            TEXT,
  captain_phone           TEXT,
  -- Optional polygon as GeoJSON (stored as JSONB; use PostGIS geometry column if available)
  polygon_coordinates     JSONB,
  is_active               BOOLEAN NOT NULL DEFAULT TRUE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3.4 User Profiles ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_profiles (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role                user_role NOT NULL DEFAULT 'resident',
  full_name           TEXT NOT NULL,
  email               TEXT NOT NULL,
  phone               TEXT,
  avatar_url          TEXT,
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  municipality_id     UUID REFERENCES municipalities(id),
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at       TIMESTAMPTZ,
  -- Staff-specific fields (NULL for residents)
  employee_id         TEXT,
  department          TEXT,
  position            TEXT,
  rescue_unit_id      UUID,            -- FK added after rescue_units table creation
  telegram_user_id    TEXT,
  -- Resident-specific fields (NULL for staff)
  date_of_birth       DATE,
  address             TEXT,
  barangay            TEXT,
  municipality        TEXT,
  province            TEXT,
  id_type             id_type,
  id_number           TEXT,
  id_front_url        TEXT,
  id_back_url         TEXT,
  emergency_contact_name          TEXT,
  emergency_contact_phone         TEXT,
  emergency_contact_relationship  TEXT,
  registration_status registration_status NOT NULL DEFAULT 'draft',
  verified_at         TIMESTAMPTZ,
  verified_by         UUID REFERENCES auth.users(id),
  rejection_reason    TEXT,
  more_info_request   TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3.5 Resident Verifications (audit trail) ─────────────────

CREATE TABLE IF NOT EXISTS resident_verifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resident_id     UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  verifier_id     UUID REFERENCES user_profiles(id),
  status          registration_status NOT NULL,
  submitted_at    TIMESTAMPTZ,
  reviewed_at     TIMESTAMPTZ,
  notes           TEXT,
  rejection_reason TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3.6 Emergency Types ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS emergency_types (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id     UUID REFERENCES organizations(id) ON DELETE CASCADE,  -- NULL = global default
  name                TEXT NOT NULL,
  icon                TEXT NOT NULL,          -- lucide icon name
  color               TEXT NOT NULL DEFAULT '#6b7280',
  description         TEXT,
  triage_questions    JSONB NOT NULL DEFAULT '[]',
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order          SMALLINT NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3.7 Rescue Units ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rescue_units (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  municipality_id         UUID REFERENCES municipalities(id),
  name                    TEXT NOT NULL,
  code                    TEXT NOT NULL,
  team_leader_id          UUID REFERENCES user_profiles(id),
  team_leader_name        TEXT,
  status                  team_status NOT NULL DEFAULT 'off_duty',
  contact_number          TEXT,
  vehicle_info            JSONB,
  equipment               TEXT[] NOT NULL DEFAULT '{}',
  specializations         TEXT[] NOT NULL DEFAULT '{}',
  telegram_chat_id        TEXT,
  current_lat             DOUBLE PRECISION,
  current_lng             DOUBLE PRECISION,
  last_location_update    TIMESTAMPTZ,
  is_active               BOOLEAN NOT NULL DEFAULT TRUE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, code)
);

-- Add deferred FK from user_profiles to rescue_units
DO $$
BEGIN
  ALTER TABLE user_profiles
    ADD CONSTRAINT user_profiles_rescue_unit_id_fkey
    FOREIGN KEY (rescue_unit_id) REFERENCES rescue_units(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 3.8 Rescue Unit Members ──────────────────────────────────

CREATE TABLE IF NOT EXISTS rescue_unit_members (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id         UUID NOT NULL REFERENCES rescue_units(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  user_name       TEXT,
  role            TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('team_leader', 'member')),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at         TIMESTAMPTZ,
  UNIQUE (unit_id, user_id)
);

-- ── 3.9 Incidents ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS incidents (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference_number        TEXT NOT NULL UNIQUE,
  organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  reporter_id             UUID REFERENCES user_profiles(id),
  reporter_name           TEXT,
  reporter_phone          TEXT,
  emergency_type_id       UUID NOT NULL REFERENCES emergency_types(id),
  severity                severity_level NOT NULL DEFAULT 'medium',
  status                  incident_status NOT NULL DEFAULT 'submitted',
  description             TEXT NOT NULL,
  affected_count          SMALLINT NOT NULL DEFAULT 1 CHECK (affected_count >= 0),
  has_unconscious         BOOLEAN NOT NULL DEFAULT FALSE,
  has_fire                BOOLEAN NOT NULL DEFAULT FALSE,
  has_flooding            BOOLEAN NOT NULL DEFAULT FALSE,
  has_violence            BOOLEAN NOT NULL DEFAULT FALSE,
  -- Location
  latitude                DOUBLE PRECISION NOT NULL,
  longitude               DOUBLE PRECISION NOT NULL,
  gps_accuracy            DOUBLE PRECISION,           -- meters
  address                 TEXT,
  barangay                TEXT,
  municipality            TEXT,
  -- Assignment (denormalized for quick display)
  assigned_unit_id        UUID REFERENCES rescue_units(id),
  assigned_unit_name      TEXT,
  -- Flags
  is_anonymous            BOOLEAN NOT NULL DEFAULT FALSE,
  is_drill                BOOLEAN NOT NULL DEFAULT FALSE,
  -- Timestamps
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at             TIMESTAMPTZ,
  dispatched_at           TIMESTAMPTZ,
  arrived_at              TIMESTAMPTZ,
  resolved_at             TIMESTAMPTZ,
  closed_at               TIMESTAMPTZ,
  resolution_notes        TEXT,
  -- Soft delete
  deleted_at              TIMESTAMPTZ
);

-- ── 3.10 Incident Locations ──────────────────────────────────

CREATE TABLE IF NOT EXISTS incident_locations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id     UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  latitude        DOUBLE PRECISION NOT NULL,
  longitude       DOUBLE PRECISION NOT NULL,
  accuracy        DOUBLE PRECISION,
  altitude        DOUBLE PRECISION,
  heading         DOUBLE PRECISION,
  speed           DOUBLE PRECISION,
  source          TEXT NOT NULL DEFAULT 'gps'
                    CHECK (source IN ('gps', 'manual', 'ip', 'address_lookup')),
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3.11 Incident Assignments ────────────────────────────────

CREATE TABLE IF NOT EXISTS incident_assignments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id         UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  rescue_unit_id      UUID NOT NULL REFERENCES rescue_units(id) ON DELETE CASCADE,
  rescue_unit_name    TEXT,
  assigned_by         UUID NOT NULL REFERENCES user_profiles(id),
  assigned_by_name    TEXT,
  accepted_by         UUID REFERENCES user_profiles(id),
  accepted_by_name    TEXT,
  status              assignment_status NOT NULL DEFAULT 'assigned',
  assigned_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at         TIMESTAMPTZ,
  declined_at         TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  decline_reason      TEXT
);

-- ── 3.12 Incident Status History ─────────────────────────────

CREATE TABLE IF NOT EXISTS incident_status_history (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id         UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  previous_status     incident_status,
  new_status          incident_status NOT NULL,
  changed_by          UUID NOT NULL REFERENCES user_profiles(id),
  changed_by_name     TEXT NOT NULL,
  changed_by_role     user_role NOT NULL,
  reason              TEXT,
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3.13 Incident Notes ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS incident_notes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id     UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES user_profiles(id) ON DELETE SET NULL,
  user_name       TEXT NOT NULL,
  user_role       user_role NOT NULL,
  note            TEXT NOT NULL,
  is_internal     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);

-- ── 3.14 Incident Attachments ────────────────────────────────

CREATE TABLE IF NOT EXISTS incident_attachments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id     UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  uploaded_by     UUID NOT NULL REFERENCES user_profiles(id),
  file_name       TEXT NOT NULL,
  file_url        TEXT NOT NULL,
  file_type       TEXT NOT NULL,
  file_size       BIGINT NOT NULL CHECK (file_size >= 0),
  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3.15 Triage Answers ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS triage_answers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id     UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  question_id     TEXT NOT NULL,
  question_text   TEXT NOT NULL,
  answer          JSONB NOT NULL,   -- stores string | boolean | number
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3.16 False Alert Reviews ─────────────────────────────────

CREATE TABLE IF NOT EXISTS false_alert_reviews (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id         UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  reviewed_by         UUID NOT NULL REFERENCES user_profiles(id),
  reviewed_by_name    TEXT NOT NULL,
  finding             TEXT NOT NULL
                        CHECK (finding IN ('confirmed_false', 'confirmed_real', 'inconclusive')),
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3.17 Notifications ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  message             TEXT NOT NULL,
  type                notification_type NOT NULL,
  priority            notification_priority NOT NULL DEFAULT 'normal',
  incident_id         UUID REFERENCES incidents(id) ON DELETE SET NULL,
  action_url          TEXT,
  is_read             BOOLEAN NOT NULL DEFAULT FALSE,
  read_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3.18 Telegram Delivery Logs ──────────────────────────────

CREATE TABLE IF NOT EXISTS telegram_delivery_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id         TEXT NOT NULL,
  message_id      TEXT,           -- Telegram message_id after successful send
  message_type    TEXT NOT NULL
                    CHECK (message_type IN ('incident_alert', 'status_update', 'assignment', 'system', 'test')),
  incident_id     UUID REFERENCES incidents(id) ON DELETE SET NULL,
  payload         JSONB,
  status          telegram_message_status NOT NULL DEFAULT 'pending',
  error_message   TEXT,
  retry_count     SMALLINT NOT NULL DEFAULT 0,
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3.19 Audit Logs ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_logs (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id            UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  actor_name          TEXT NOT NULL,
  actor_role          TEXT NOT NULL,    -- user_role | 'system'
  action              audit_action NOT NULL,
  entity_type         TEXT NOT NULL,
  entity_id           UUID,
  previous_values     JSONB,
  new_values          JSONB,
  ip_address          INET,
  user_agent          TEXT,
  organization_id     UUID REFERENCES organizations(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3.20 System Settings ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS system_settings (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  key                 TEXT NOT NULL,
  value               JSONB NOT NULL,
  description         TEXT,
  is_public           BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by          UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, key)
);

-- ── 3.21 Device Sessions ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS device_sessions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  device_id           TEXT NOT NULL,
  device_name         TEXT,
  platform            TEXT NOT NULL DEFAULT 'web'
                        CHECK (platform IN ('web', 'ios', 'android')),
  push_token          TEXT,
  ip_address          INET,
  user_agent          TEXT,
  last_active_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (user_id, device_id)
);

-- ============================================================
-- 4. INDEXES
-- ============================================================

-- Incidents
CREATE INDEX IF NOT EXISTS idx_incidents_org             ON incidents(organization_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status          ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity        ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_reporter        ON incidents(reporter_id);
CREATE INDEX IF NOT EXISTS idx_incidents_unit            ON incidents(assigned_unit_id);
CREATE INDEX IF NOT EXISTS idx_incidents_emergency_type  ON incidents(emergency_type_id);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at      ON incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_deleted_at      ON incidents(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_incidents_location        ON incidents USING GIST(
  ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
) WHERE deleted_at IS NULL; -- remove if PostGIS not available

-- User Profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_org         ON user_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role        ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_reg_status  ON user_profiles(registration_status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id     ON user_profiles(user_id);

-- Rescue Units
CREATE INDEX IF NOT EXISTS idx_rescue_units_org          ON rescue_units(organization_id);
CREATE INDEX IF NOT EXISTS idx_rescue_units_status       ON rescue_units(status);

-- Rescue Unit Members
CREATE INDEX IF NOT EXISTS idx_rum_unit                  ON rescue_unit_members(unit_id);
CREATE INDEX IF NOT EXISTS idx_rum_user                  ON rescue_unit_members(user_id);

-- Incident Status History
CREATE INDEX IF NOT EXISTS idx_ish_incident              ON incident_status_history(incident_id);
CREATE INDEX IF NOT EXISTS idx_ish_created_at            ON incident_status_history(created_at DESC);

-- Incident Assignments
CREATE INDEX IF NOT EXISTS idx_ia_incident               ON incident_assignments(incident_id);
CREATE INDEX IF NOT EXISTS idx_ia_unit                   ON incident_assignments(rescue_unit_id);

-- Incident Notes
CREATE INDEX IF NOT EXISTS idx_in_incident               ON incident_notes(incident_id);
CREATE INDEX IF NOT EXISTS idx_in_internal               ON incident_notes(incident_id, is_internal);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notif_user                ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_unread              ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notif_org                 ON notifications(organization_id);

-- Audit Logs
CREATE INDEX IF NOT EXISTS idx_audit_entity              ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor               ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_org                 ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at          ON audit_logs(created_at DESC);

-- Telegram Logs
CREATE INDEX IF NOT EXISTS idx_telegram_incident         ON telegram_delivery_logs(incident_id);
CREATE INDEX IF NOT EXISTS idx_telegram_status           ON telegram_delivery_logs(status);

-- Barangays
CREATE INDEX IF NOT EXISTS idx_barangays_municipality    ON barangays(municipality_id);
CREATE INDEX IF NOT EXISTS idx_barangays_org             ON barangays(organization_id);

-- Municipalities
CREATE INDEX IF NOT EXISTS idx_municipalities_org        ON municipalities(organization_id);

-- Triage answers
CREATE INDEX IF NOT EXISTS idx_triage_incident           ON triage_answers(incident_id);

-- ============================================================
-- 5. ROW-LEVEL SECURITY
-- ============================================================

ALTER TABLE organizations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE municipalities           ENABLE ROW LEVEL SECURITY;
ALTER TABLE barangays                ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE resident_verifications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_types          ENABLE ROW LEVEL SECURITY;
ALTER TABLE rescue_units             ENABLE ROW LEVEL SECURITY;
ALTER TABLE rescue_unit_members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents                ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_locations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_assignments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_status_history  ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_notes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_attachments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE triage_answers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE false_alert_reviews      ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications            ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_delivery_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_sessions          ENABLE ROW LEVEL SECURITY;

-- ── Helper functions ─────────────────────────────────────────

-- Returns the user_profiles row for the currently authenticated user.
CREATE OR REPLACE FUNCTION get_current_profile()
RETURNS user_profiles
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT * FROM user_profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Returns the organization_id of the currently authenticated user.
CREATE OR REPLACE FUNCTION get_current_org_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT organization_id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Returns the role of the currently authenticated user.
CREATE OR REPLACE FUNCTION get_current_role()
RETURNS user_role
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT role FROM user_profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Returns TRUE if current user is any kind of staff (not a resident).
CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT get_current_role() != 'resident';
$$;

-- Returns TRUE if current user is admin or super_admin.
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT get_current_role() IN ('super_admin', 'admin');
$$;

-- ── 5.1 Organizations ────────────────────────────────────────

-- Staff can see their own organization; super_admin sees all.
CREATE POLICY "org_select_staff"
  ON organizations FOR SELECT
  USING (
    id = get_current_org_id()
    OR get_current_role() = 'super_admin'
  );

CREATE POLICY "org_update_admin"
  ON organizations FOR UPDATE
  USING (is_admin() AND id = get_current_org_id());

-- ── 5.2 Municipalities ───────────────────────────────────────

CREATE POLICY "municipality_select_own_org"
  ON municipalities FOR SELECT
  USING (organization_id = get_current_org_id());

CREATE POLICY "municipality_manage_admin"
  ON municipalities FOR ALL
  USING (is_admin() AND organization_id = get_current_org_id());

-- ── 5.3 Barangays ────────────────────────────────────────────

CREATE POLICY "barangay_select_own_org"
  ON barangays FOR SELECT
  USING (organization_id = get_current_org_id());

CREATE POLICY "barangay_manage_admin"
  ON barangays FOR ALL
  USING (is_admin() AND organization_id = get_current_org_id());

-- ── 5.4 User Profiles ────────────────────────────────────────

-- Users can always read their own profile.
CREATE POLICY "profile_select_own"
  ON user_profiles FOR SELECT
  USING (user_id = auth.uid());

-- Staff can read profiles within their organization.
CREATE POLICY "profile_select_staff_same_org"
  ON user_profiles FOR SELECT
  USING (
    is_staff()
    AND organization_id = get_current_org_id()
  );

-- Users can update their own profile (limited fields; business logic enforced in app).
CREATE POLICY "profile_update_own"
  ON user_profiles FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can update any profile in their org.
CREATE POLICY "profile_update_admin"
  ON user_profiles FOR UPDATE
  USING (is_admin() AND organization_id = get_current_org_id());

-- Admins can insert new staff profiles.
CREATE POLICY "profile_insert_admin"
  ON user_profiles FOR INSERT
  WITH CHECK (is_admin());

-- Allow new users to insert their own profile (for self-registration).
CREATE POLICY "profile_insert_self"
  ON user_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ── 5.5 Resident Verifications ───────────────────────────────

CREATE POLICY "verif_select_own"
  ON resident_verifications FOR SELECT
  USING (
    resident_id = (SELECT id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1)
  );

CREATE POLICY "verif_select_staff"
  ON resident_verifications FOR SELECT
  USING (is_staff());

CREATE POLICY "verif_manage_verifier"
  ON resident_verifications FOR ALL
  USING (get_current_role() IN ('super_admin', 'admin', 'verifier'));

-- ── 5.6 Emergency Types ──────────────────────────────────────

-- Public: anyone (including unauthenticated) can read active emergency types.
CREATE POLICY "etype_select_all"
  ON emergency_types FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "etype_manage_admin"
  ON emergency_types FOR ALL
  USING (is_admin());

-- ── 5.7 Rescue Units ─────────────────────────────────────────

-- Staff in same org can read units.
CREATE POLICY "units_select_same_org"
  ON rescue_units FOR SELECT
  USING (
    is_staff()
    AND organization_id = get_current_org_id()
  );

-- Admins and dispatchers can manage units.
CREATE POLICY "units_manage_dispatcher"
  ON rescue_units FOR ALL
  USING (
    get_current_role() IN ('super_admin', 'admin', 'dispatcher')
    AND organization_id = get_current_org_id()
  );

-- Team leaders and responders can update their own unit's status.
CREATE POLICY "units_update_own"
  ON rescue_units FOR UPDATE
  USING (
    get_current_role() IN ('team_leader', 'responder')
    AND id = (
      SELECT rescue_unit_id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1
    )
  );

-- ── 5.8 Rescue Unit Members ──────────────────────────────────

CREATE POLICY "rum_select_staff"
  ON rescue_unit_members FOR SELECT
  USING (is_staff());

CREATE POLICY "rum_manage_admin"
  ON rescue_unit_members FOR ALL
  USING (is_admin());

-- ── 5.9 Incidents ────────────────────────────────────────────

-- Residents can only see their own incident reports.
CREATE POLICY "incidents_select_own_resident"
  ON incidents FOR SELECT
  USING (
    get_current_role() = 'resident'
    AND reporter_id = (SELECT id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1)
  );

-- Staff can see all incidents in their organization.
CREATE POLICY "incidents_select_staff"
  ON incidents FOR SELECT
  USING (
    is_staff()
    AND organization_id = get_current_org_id()
    AND deleted_at IS NULL
  );

-- Authenticated users (including residents) can create incidents.
CREATE POLICY "incidents_insert"
  ON incidents FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND organization_id = get_current_org_id()
  );

-- Staff can update incidents in their org.
CREATE POLICY "incidents_update_staff"
  ON incidents FOR UPDATE
  USING (
    is_staff()
    AND organization_id = get_current_org_id()
  );

-- Only admins can soft-delete incidents.
CREATE POLICY "incidents_delete_admin"
  ON incidents FOR UPDATE
  USING (
    is_admin()
    AND organization_id = get_current_org_id()
  );

-- ── 5.10 Incident Locations ──────────────────────────────────

CREATE POLICY "iloc_select_staff"
  ON incident_locations FOR SELECT
  USING (is_staff());

CREATE POLICY "iloc_insert_any"
  ON incident_locations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ── 5.11 Incident Assignments ────────────────────────────────

CREATE POLICY "ia_select_staff"
  ON incident_assignments FOR SELECT
  USING (is_staff());

CREATE POLICY "ia_manage_dispatcher"
  ON incident_assignments FOR ALL
  USING (get_current_role() IN ('super_admin', 'admin', 'dispatcher'));

CREATE POLICY "ia_update_team_leader"
  ON incident_assignments FOR UPDATE
  USING (get_current_role() = 'team_leader');

-- ── 5.12 Incident Status History ─────────────────────────────

CREATE POLICY "ish_select_staff"
  ON incident_status_history FOR SELECT
  USING (is_staff());

-- Residents can see public status changes on their own incidents.
CREATE POLICY "ish_select_own_resident"
  ON incident_status_history FOR SELECT
  USING (
    get_current_role() = 'resident'
    AND EXISTS (
      SELECT 1 FROM incidents i
      WHERE i.id = incident_id
        AND i.reporter_id = (SELECT id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1)
    )
  );

CREATE POLICY "ish_insert_staff"
  ON incident_status_history FOR INSERT
  WITH CHECK (is_staff());

-- ── 5.13 Incident Notes ──────────────────────────────────────

-- Staff can see all notes; residents can only see non-internal notes on their incidents.
CREATE POLICY "inote_select_staff"
  ON incident_notes FOR SELECT
  USING (is_staff());

CREATE POLICY "inote_select_resident"
  ON incident_notes FOR SELECT
  USING (
    get_current_role() = 'resident'
    AND is_internal = FALSE
    AND EXISTS (
      SELECT 1 FROM incidents i
      WHERE i.id = incident_id
        AND i.reporter_id = (SELECT id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1)
    )
  );

CREATE POLICY "inote_insert_staff"
  ON incident_notes FOR INSERT
  WITH CHECK (is_staff());

CREATE POLICY "inote_update_own"
  ON incident_notes FOR UPDATE
  USING (user_id = (SELECT id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1));

-- ── 5.14 Incident Attachments ────────────────────────────────

CREATE POLICY "iatt_select_staff"
  ON incident_attachments FOR SELECT
  USING (is_staff());

CREATE POLICY "iatt_insert"
  ON incident_attachments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ── 5.15 Triage Answers ──────────────────────────────────────

CREATE POLICY "triage_select_staff"
  ON triage_answers FOR SELECT
  USING (is_staff());

CREATE POLICY "triage_insert"
  ON triage_answers FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ── 5.16 False Alert Reviews ─────────────────────────────────

CREATE POLICY "far_select_staff"
  ON false_alert_reviews FOR SELECT
  USING (is_staff());

CREATE POLICY "far_manage_staff"
  ON false_alert_reviews FOR ALL
  USING (is_staff());

-- ── 5.17 Notifications ───────────────────────────────────────

-- Users only see their own notifications.
CREATE POLICY "notif_select_own"
  ON notifications FOR SELECT
  USING (
    user_id = (SELECT id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1)
  );

CREATE POLICY "notif_update_own"
  ON notifications FOR UPDATE
  USING (
    user_id = (SELECT id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1)
  );

-- Only the system / service role inserts notifications.
CREATE POLICY "notif_insert_system"
  ON notifications FOR INSERT
  WITH CHECK (is_staff());

-- ── 5.18 Telegram Delivery Logs ──────────────────────────────

CREATE POLICY "tg_select_admin"
  ON telegram_delivery_logs FOR SELECT
  USING (is_admin());

-- ── 5.19 Audit Logs ──────────────────────────────────────────

CREATE POLICY "audit_select_admin"
  ON audit_logs FOR SELECT
  USING (
    get_current_role() IN ('super_admin', 'admin')
    AND (organization_id = get_current_org_id() OR get_current_role() = 'super_admin')
  );

-- Service role inserts audit logs (no auth check needed for inserts from trusted server).
CREATE POLICY "audit_insert_any"
  ON audit_logs FOR INSERT
  WITH CHECK (TRUE);

-- ── 5.20 System Settings ─────────────────────────────────────

-- Public settings readable by all authenticated users in the same org.
CREATE POLICY "settings_select_public"
  ON system_settings FOR SELECT
  USING (
    is_public = TRUE
    AND organization_id = get_current_org_id()
  );

-- Staff can read all settings in their org.
CREATE POLICY "settings_select_staff"
  ON system_settings FOR SELECT
  USING (
    is_staff()
    AND organization_id = get_current_org_id()
  );

CREATE POLICY "settings_manage_admin"
  ON system_settings FOR ALL
  USING (is_admin() AND organization_id = get_current_org_id());

-- ── 5.21 Device Sessions ─────────────────────────────────────

CREATE POLICY "device_select_own"
  ON device_sessions FOR SELECT
  USING (
    user_id = (SELECT id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1)
  );

CREATE POLICY "device_manage_own"
  ON device_sessions FOR ALL
  USING (
    user_id = (SELECT id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1)
  );

-- ============================================================
-- 6. TRIGGERS & FUNCTIONS
-- ============================================================

-- ── 6.1 Auto-update updated_at ───────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply to all tables with updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'organizations',
    'municipalities',
    'user_profiles',
    'resident_verifications',
    'emergency_types',
    'rescue_units',
    'incidents',
    'incident_notes',
    'telegram_delivery_logs',
    'system_settings'
  ] LOOP
    EXECUTE format(
      'CREATE OR REPLACE TRIGGER trg_%s_updated_at
       BEFORE UPDATE ON %s
       FOR EACH ROW EXECUTE FUNCTION set_updated_at();',
      t, t
    );
  END LOOP;
END $$;

-- ── 6.2 Auto-insert incident status history on status change ──

CREATE OR REPLACE FUNCTION record_incident_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_profile user_profiles;
BEGIN
  -- Only act when status actually changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT * INTO v_profile FROM user_profiles WHERE user_id = auth.uid() LIMIT 1;

    INSERT INTO incident_status_history (
      incident_id,
      previous_status,
      new_status,
      changed_by,
      changed_by_name,
      changed_by_role
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      COALESCE(v_profile.id, '00000000-0000-0000-0000-000000000000'::UUID),
      COALESCE(v_profile.full_name, 'System'),
      COALESCE(v_profile.role, 'dispatcher')
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_incidents_status_history
  AFTER UPDATE OF status ON incidents
  FOR EACH ROW EXECUTE FUNCTION record_incident_status_change();

-- ── 6.3 Auto-set resolved/closed timestamps ──────────────────

CREATE OR REPLACE FUNCTION set_incident_timestamps()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'dispatched' AND OLD.status != 'dispatched' AND NEW.dispatched_at IS NULL THEN
    NEW.dispatched_at = NOW();
  END IF;
  IF NEW.status = 'arrived' AND OLD.status != 'arrived' AND NEW.arrived_at IS NULL THEN
    NEW.arrived_at = NOW();
  END IF;
  IF NEW.status IN ('resolved', 'false_alert', 'duplicate', 'invalid', 'unable_to_contact', 'transferred')
     AND OLD.status NOT IN ('resolved', 'false_alert', 'duplicate', 'invalid', 'unable_to_contact', 'transferred')
     AND NEW.resolved_at IS NULL THEN
    NEW.resolved_at = NOW();
  END IF;
  IF NEW.status = 'closed' AND OLD.status != 'closed' AND NEW.closed_at IS NULL THEN
    NEW.closed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_incidents_timestamps
  BEFORE UPDATE OF status ON incidents
  FOR EACH ROW EXECUTE FUNCTION set_incident_timestamps();

-- ── 6.4 Auto-generate reference number ───────────────────────

CREATE SEQUENCE IF NOT EXISTS incident_reference_seq START 1;

CREATE OR REPLACE FUNCTION generate_incident_reference()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.reference_number IS NULL OR NEW.reference_number = '' THEN
    NEW.reference_number = 'INC-' || EXTRACT(YEAR FROM NOW()) || '-' ||
                           LPAD(nextval('incident_reference_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_incidents_reference_number
  BEFORE INSERT ON incidents
  FOR EACH ROW EXECUTE FUNCTION generate_incident_reference();

-- ── 6.5 Sync user last_login_at on sign-in ───────────────────

CREATE OR REPLACE FUNCTION handle_auth_sign_in()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_profiles
  SET last_login_at = NOW()
  WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$;

-- Note: Attach this trigger to auth.users if the Supabase platform allows it.
-- In most hosted Supabase projects, use a Database Webhook or Auth Hook instead.

-- ── 6.6 Create user_profile on new auth user (for residents) ─

CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  default_org_id UUID;
BEGIN
  -- Use the first active organization as default (adjust for multi-org setups)
  SELECT id INTO default_org_id FROM organizations WHERE is_active = TRUE ORDER BY created_at LIMIT 1;

  INSERT INTO user_profiles (
    user_id,
    role,
    full_name,
    email,
    organization_id,
    registration_status
  ) VALUES (
    NEW.id,
    'resident',
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    default_org_id,
    'draft'
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Attach to auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();

-- ============================================================
-- END OF MIGRATION 001
-- ============================================================
