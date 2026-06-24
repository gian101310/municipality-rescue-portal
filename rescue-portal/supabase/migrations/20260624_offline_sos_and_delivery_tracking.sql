-- ============================================================
-- 20260624_offline_sos_and_delivery_tracking.sql
-- Offline SOS queue, delivery tracking, dual location, trusted sessions
-- ============================================================

-- ============================================================
-- 1. DELIVERY STATUS ENUM
-- ============================================================

DO $$ BEGIN
  CREATE TYPE delivery_status AS ENUM (
    'live',
    'delayed',
    'late_request',
    'sms_fallback'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 2. INCIDENT PRIORITY ENUM
-- ============================================================

DO $$ BEGIN
  CREATE TYPE incident_priority AS ENUM (
    'critical',
    'high',
    'medium',
    'low'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 3. ADD OFFLINE SOS & DELIVERY COLUMNS TO incidents
-- ============================================================

-- Offline SOS tracking
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS local_sos_id TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS network_status_at_creation TEXT DEFAULT 'online';
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS sync_attempt_count INTEGER DEFAULT 0;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS queued_offline_at TIMESTAMPTZ;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;

-- Delivery tracking
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'live';
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS delivery_delay_minutes NUMERIC(10,2) DEFAULT 0;

-- Original location (captured at SOS creation, even offline)
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS created_latitude NUMERIC(10,7);
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS created_longitude NUMERIC(10,7);
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS created_accuracy NUMERIC(10,2);
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS created_timestamp TIMESTAMPTZ;

-- Sent/latest location (when actually synced/submitted)
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS sent_latitude NUMERIC(10,7);
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS sent_longitude NUMERIC(10,7);
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS sent_accuracy NUMERIC(10,2);
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS sent_timestamp TIMESTAMPTZ;

-- Distance between original and sent
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS distance_moved_meters NUMERIC(12,2);

-- Priority
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'high';

-- SMS fallback
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS sms_fallback_triggered BOOLEAN DEFAULT FALSE;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS sms_fallback_at TIMESTAMPTZ;

-- Unique constraint on local_sos_id for duplicate prevention
CREATE UNIQUE INDEX IF NOT EXISTS idx_incidents_local_sos_id
  ON incidents (local_sos_id) WHERE local_sos_id IS NOT NULL;

-- ============================================================
-- 4. INCIDENT TIMELINE TABLE (per-incident event log)
-- ============================================================

CREATE TABLE IF NOT EXISTS incident_timeline (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,  -- 'sos_created', 'gps_captured', 'queued_offline', 'internet_restored', 'synced', 'sms_fallback', 'ops_received', 'ops_called', 'verified', 'dispatched', 'on_the_way', 'on_scene', 'resolved', 'false_alarm', 'closed'
  label TEXT NOT NULL,
  description TEXT,
  actor_id UUID,
  actor_name TEXT,
  actor_role TEXT,
  metadata JSONB DEFAULT '{}',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incident_timeline_incident_id
  ON incident_timeline(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_timeline_occurred_at
  ON incident_timeline(incident_id, occurred_at);

-- ============================================================
-- 5. TRUSTED SESSIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS trusted_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  device_fingerprint TEXT,
  device_name TEXT,
  platform TEXT DEFAULT 'web',
  ip_address TEXT,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  last_refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_revoked BOOLEAN DEFAULT FALSE,
  revoked_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trusted_sessions_user_id
  ON trusted_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_sessions_token
  ON trusted_sessions(session_token) WHERE NOT is_revoked;
CREATE INDEX IF NOT EXISTS idx_trusted_sessions_expires
  ON trusted_sessions(expires_at) WHERE NOT is_revoked;

-- ============================================================
-- 6. FUTURE NATIONAL ROUTING FIELDS ON user_profiles
-- ============================================================

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS home_municipality_id UUID;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS current_detected_municipality_id UUID;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS assigned_ops_municipality_id UUID;

-- ============================================================
-- 7. RLS POLICIES
-- ============================================================

-- incident_timeline: same access as incidents
ALTER TABLE incident_timeline ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "incident_timeline_read_org"
    ON incident_timeline FOR SELECT
    USING (
      incident_id IN (
        SELECT id FROM incidents
        WHERE organization_id IN (
          SELECT organization_id FROM user_profiles
          WHERE user_id = auth.uid()
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "incident_timeline_insert_authenticated"
    ON incident_timeline FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- trusted_sessions: users can only see their own
ALTER TABLE trusted_sessions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "trusted_sessions_own"
    ON trusted_sessions FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 8. FUNCTION: Calculate delivery status from delay
-- ============================================================

CREATE OR REPLACE FUNCTION calculate_delivery_status(delay_minutes NUMERIC)
RETURNS TEXT AS $$
BEGIN
  IF delay_minutes IS NULL OR delay_minutes <= 2 THEN
    RETURN 'live';
  ELSIF delay_minutes <= 10 THEN
    RETURN 'delayed';
  ELSE
    RETURN 'late_request';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================
-- 9. FUNCTION: Haversine distance in meters
-- ============================================================

CREATE OR REPLACE FUNCTION haversine_distance_meters(
  lat1 NUMERIC, lon1 NUMERIC,
  lat2 NUMERIC, lon2 NUMERIC
) RETURNS NUMERIC AS $$
DECLARE
  R CONSTANT NUMERIC := 6371000;
  dlat NUMERIC;
  dlon NUMERIC;
  a NUMERIC;
  c NUMERIC;
BEGIN
  IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN
    RETURN NULL;
  END IF;
  dlat := RADIANS(lat2 - lat1);
  dlon := RADIANS(lon2 - lon1);
  a := SIN(dlat / 2) ^ 2 + COS(RADIANS(lat1)) * COS(RADIANS(lat2)) * SIN(dlon / 2) ^ 2;
  c := 2 * ATAN2(SQRT(a), SQRT(1 - a));
  RETURN ROUND(R * c, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;
