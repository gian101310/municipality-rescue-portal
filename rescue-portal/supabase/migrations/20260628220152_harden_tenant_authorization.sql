-- Phase 1 security boundary: direct clients are read-only for operational data.
-- All privileged mutations go through authenticated server routes or explicitly
-- granted RPC functions.

REVOKE INSERT, UPDATE, DELETE ON public.organizations FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.municipalities FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.barangays FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.emergency_types FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.rescue_units FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.rescue_unit_members FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.incidents FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.incident_locations FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.incident_assignments FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.incident_status_history FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.incident_notes FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.incident_attachments FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.triage_answers FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.false_alert_reviews FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.incident_timeline FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.resident_verifications FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.system_settings FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.organization_geo_scopes FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.notifications FROM anon, authenticated;

REVOKE INSERT, UPDATE, DELETE ON public.user_profiles FROM anon, authenticated;
GRANT UPDATE (full_name, phone, avatar_url) ON public.user_profiles TO authenticated;

-- Legacy prototype tables are not used by the application and must not expose a
-- second authorization model through the Data API. The guards keep this migration
-- valid for fresh environments where those prototype tables never existed.
DO $$
DECLARE legacy_table TEXT;
BEGIN
  FOREACH legacy_table IN ARRAY ARRAY['profiles', 'tenants', 'rescue_teams', 'shift_schedules']
  LOOP
    IF to_regclass('public.' || legacy_table) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', legacy_table);
    END IF;
  END LOOP;
END;
$$;

REVOKE CREATE ON SCHEMA public FROM PUBLIC, anon, authenticated;

-- Bring manually-created production support objects under migration control.
ALTER TABLE public.incident_timeline ADD COLUMN IF NOT EXISTS action TEXT;

CREATE TABLE IF NOT EXISTS public.rate_limit_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limit_identifier_unique
  ON public.rate_limit_entries(identifier);
CREATE INDEX IF NOT EXISTS idx_rate_limit_expires
  ON public.rate_limit_entries(expires_at);
ALTER TABLE public.rate_limit_entries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rate_limit_entries FROM anon, authenticated;
GRANT ALL ON public.rate_limit_entries TO service_role;

-- Remove permissive and legacy incident policies. Direct authenticated clients
-- may read only their own report or staff incidents from their organization.
DROP POLICY IF EXISTS "Admins can update incidents" ON public.incidents;
DROP POLICY IF EXISTS "Admins view tenant incidents" ON public.incidents;
DROP POLICY IF EXISTS "Anyone authenticated can create incidents" ON public.incidents;
DROP POLICY IF EXISTS "Reporters can view own incidents" ON public.incidents;
DROP POLICY IF EXISTS "incidents_delete_admin" ON public.incidents;
DROP POLICY IF EXISTS "incidents_insert" ON public.incidents;
DROP POLICY IF EXISTS "incidents_update_staff" ON public.incidents;
DROP POLICY IF EXISTS "incidents_select_own_resident" ON public.incidents;
DROP POLICY IF EXISTS "incidents_select_staff" ON public.incidents;

CREATE POLICY "incidents_resident_own"
  ON public.incidents FOR SELECT TO authenticated
  USING (reporter_id = (SELECT auth.uid()));

CREATE POLICY "incidents_staff_same_org"
  ON public.incidents FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles profile
      WHERE profile.user_id = (SELECT auth.uid())
        AND profile.is_active = TRUE
        AND profile.role IN ('super_admin', 'admin', 'dispatcher', 'team_leader', 'responder', 'verifier', 'staff')
        AND (profile.role = 'super_admin' OR profile.registration_status = 'approved')
        AND (profile.role = 'super_admin' OR profile.organization_id = incidents.organization_id)
    )
  );

-- A direct profile update is limited by both row ownership and the column-level
-- grant above. Authorization columns are never granted to authenticated users.
DROP POLICY IF EXISTS "profile_update_own" ON public.user_profiles;
DROP POLICY IF EXISTS "profile_update_admin" ON public.user_profiles;
DROP POLICY IF EXISTS "profile_insert_admin" ON public.user_profiles;
DROP POLICY IF EXISTS "profile_insert_self" ON public.user_profiles;

CREATE POLICY "profile_update_own_contact"
  ON public.user_profiles FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Replace every incident-child staff policy with a tenant-aware policy. Writes
-- are service-role-only because operational routes validate the actor explicitly.
DROP POLICY IF EXISTS "iloc_select_staff" ON public.incident_locations;
DROP POLICY IF EXISTS "iloc_insert_any" ON public.incident_locations;
CREATE POLICY "incident_locations_staff_same_org"
  ON public.incident_locations FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.incidents incident
    JOIN public.user_profiles profile ON profile.user_id = (SELECT auth.uid())
    WHERE incident.id = incident_locations.incident_id
      AND profile.is_active = TRUE
      AND profile.role IN ('super_admin','admin','dispatcher','team_leader','responder','verifier','staff')
      AND (profile.role = 'super_admin' OR profile.registration_status = 'approved')
      AND (profile.role = 'super_admin' OR profile.organization_id = incident.organization_id)
  ));

DROP POLICY IF EXISTS "ia_select_staff" ON public.incident_assignments;
DROP POLICY IF EXISTS "ia_manage_dispatcher" ON public.incident_assignments;
DROP POLICY IF EXISTS "ia_update_team_leader" ON public.incident_assignments;
CREATE POLICY "incident_assignments_staff_same_org"
  ON public.incident_assignments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.incidents incident
    JOIN public.user_profiles profile ON profile.user_id = (SELECT auth.uid())
    WHERE incident.id = incident_assignments.incident_id
      AND profile.is_active = TRUE
      AND profile.role IN ('super_admin','admin','dispatcher','team_leader','responder','verifier','staff')
      AND (profile.role = 'super_admin' OR profile.registration_status = 'approved')
      AND (profile.role = 'super_admin' OR profile.organization_id = incident.organization_id)
  ));

DROP POLICY IF EXISTS "ish_select_staff" ON public.incident_status_history;
DROP POLICY IF EXISTS "ish_select_own_resident" ON public.incident_status_history;
DROP POLICY IF EXISTS "ish_insert_staff" ON public.incident_status_history;
CREATE POLICY "incident_status_history_staff_same_org"
  ON public.incident_status_history FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.incidents incident
    JOIN public.user_profiles profile ON profile.user_id = (SELECT auth.uid())
    WHERE incident.id = incident_status_history.incident_id
      AND profile.is_active = TRUE
      AND profile.role IN ('super_admin','admin','dispatcher','team_leader','responder','verifier','staff')
      AND (profile.role = 'super_admin' OR profile.registration_status = 'approved')
      AND (profile.role = 'super_admin' OR profile.organization_id = incident.organization_id)
  ));

CREATE POLICY "incident_status_history_resident_own"
  ON public.incident_status_history FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.incidents incident
    WHERE incident.id = incident_status_history.incident_id
      AND incident.reporter_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "inote_select_staff" ON public.incident_notes;
DROP POLICY IF EXISTS "inote_select_resident" ON public.incident_notes;
DROP POLICY IF EXISTS "inote_insert_staff" ON public.incident_notes;
DROP POLICY IF EXISTS "inote_update_own" ON public.incident_notes;
CREATE POLICY "incident_notes_staff_same_org"
  ON public.incident_notes FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.incidents incident
    JOIN public.user_profiles profile ON profile.user_id = (SELECT auth.uid())
    WHERE incident.id = incident_notes.incident_id
      AND profile.is_active = TRUE
      AND profile.role IN ('super_admin','admin','dispatcher','team_leader','responder','verifier','staff')
      AND (profile.role = 'super_admin' OR profile.registration_status = 'approved')
      AND (profile.role = 'super_admin' OR profile.organization_id = incident.organization_id)
  ));

DROP POLICY IF EXISTS "iatt_select_staff" ON public.incident_attachments;
DROP POLICY IF EXISTS "iatt_insert" ON public.incident_attachments;
CREATE POLICY "incident_attachments_staff_same_org"
  ON public.incident_attachments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.incidents incident
    JOIN public.user_profiles profile ON profile.user_id = (SELECT auth.uid())
    WHERE incident.id = incident_attachments.incident_id
      AND profile.is_active = TRUE
      AND profile.role IN ('super_admin','admin','dispatcher','team_leader','responder','verifier','staff')
      AND (profile.role = 'super_admin' OR profile.registration_status = 'approved')
      AND (profile.role = 'super_admin' OR profile.organization_id = incident.organization_id)
  ));

DROP POLICY IF EXISTS "triage_select_staff" ON public.triage_answers;
DROP POLICY IF EXISTS "triage_insert" ON public.triage_answers;
CREATE POLICY "triage_answers_staff_same_org"
  ON public.triage_answers FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.incidents incident
    JOIN public.user_profiles profile ON profile.user_id = (SELECT auth.uid())
    WHERE incident.id = triage_answers.incident_id
      AND profile.is_active = TRUE
      AND profile.role IN ('super_admin','admin','dispatcher','team_leader','responder','verifier','staff')
      AND (profile.role = 'super_admin' OR profile.registration_status = 'approved')
      AND (profile.role = 'super_admin' OR profile.organization_id = incident.organization_id)
  ));

DROP POLICY IF EXISTS "far_select_staff" ON public.false_alert_reviews;
DROP POLICY IF EXISTS "far_manage_staff" ON public.false_alert_reviews;
CREATE POLICY "false_alert_reviews_staff_same_org"
  ON public.false_alert_reviews FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.incidents incident
    JOIN public.user_profiles profile ON profile.user_id = (SELECT auth.uid())
    WHERE incident.id = false_alert_reviews.incident_id
      AND profile.is_active = TRUE
      AND profile.role IN ('super_admin','admin','dispatcher','team_leader','responder','verifier','staff')
      AND (profile.role = 'super_admin' OR profile.registration_status = 'approved')
      AND (profile.role = 'super_admin' OR profile.organization_id = incident.organization_id)
  ));

DROP POLICY IF EXISTS "incident_timeline_read_org" ON public.incident_timeline;
DROP POLICY IF EXISTS "incident_timeline_insert_authenticated" ON public.incident_timeline;
DROP POLICY IF EXISTS "Staff can insert timeline" ON public.incident_timeline;
DROP POLICY IF EXISTS "Timeline viewable by incident participants" ON public.incident_timeline;
CREATE POLICY "incident_timeline_staff_same_org"
  ON public.incident_timeline FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.incidents incident
    JOIN public.user_profiles profile ON profile.user_id = (SELECT auth.uid())
    WHERE incident.id = incident_timeline.incident_id
      AND profile.is_active = TRUE
      AND profile.role IN ('super_admin','admin','dispatcher','team_leader','responder','verifier','staff')
      AND (profile.role = 'super_admin' OR profile.registration_status = 'approved')
      AND (profile.role = 'super_admin' OR profile.organization_id = incident.organization_id)
  ));

CREATE POLICY "incident_timeline_resident_own"
  ON public.incident_timeline FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.incidents incident
    WHERE incident.id = incident_timeline.incident_id
      AND incident.reporter_id = (SELECT auth.uid())
  ));

-- Remaining staff collections must also be tenant-aware.
DROP POLICY IF EXISTS "rum_select_staff" ON public.rescue_unit_members;
DROP POLICY IF EXISTS "rum_manage_admin" ON public.rescue_unit_members;
CREATE POLICY "rescue_unit_members_staff_same_org"
  ON public.rescue_unit_members FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.rescue_units unit
    JOIN public.user_profiles profile ON profile.user_id = (SELECT auth.uid())
    WHERE unit.id = rescue_unit_members.unit_id
      AND profile.is_active = TRUE
      AND profile.role IN ('super_admin','admin','dispatcher','team_leader','responder','verifier','staff')
      AND (profile.role = 'super_admin' OR profile.registration_status = 'approved')
      AND (profile.role = 'super_admin' OR profile.organization_id = unit.organization_id)
  ));

DROP POLICY IF EXISTS "verif_select_staff" ON public.resident_verifications;
DROP POLICY IF EXISTS "verif_manage_verifier" ON public.resident_verifications;
CREATE POLICY "resident_verifications_staff_same_org"
  ON public.resident_verifications FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles resident
    JOIN public.user_profiles profile ON profile.user_id = (SELECT auth.uid())
    WHERE resident.id = resident_verifications.resident_id
      AND profile.is_active = TRUE
      AND profile.role IN ('super_admin','admin','dispatcher','verifier','staff')
      AND (profile.role = 'super_admin' OR profile.registration_status = 'approved')
      AND (profile.role = 'super_admin' OR profile.organization_id = resident.organization_id)
  ));

-- Audit rows are append-only from the trusted server client.
DROP POLICY IF EXISTS "audit_insert_any" ON public.audit_logs;
REVOKE INSERT ON public.audit_logs FROM anon, authenticated;
GRANT INSERT ON public.audit_logs TO service_role;

-- Harden privileged and rate-limit functions. Public helper functions used by
-- RLS retain authenticated execution but receive immutable schema resolution.
CREATE OR REPLACE FUNCTION public.get_current_org_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT organization_id
  FROM public.user_profiles
  WHERE user_id = (SELECT auth.uid())
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_current_profile()
RETURNS public.user_profiles
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT profile
  FROM public.user_profiles profile
  WHERE profile.user_id = (SELECT auth.uid())
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_current_role()
RETURNS public.user_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT role
  FROM public.user_profiles
  WHERE user_id = (SELECT auth.uid())
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT COALESCE(public.get_current_role() <> 'resident'::public.user_role, FALSE);
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT COALESCE(public.get_current_role() IN ('super_admin'::public.user_role, 'admin'::public.user_role), FALSE);
$$;

REVOKE EXECUTE ON FUNCTION public.get_current_org_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_current_profile() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_current_role() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_staff() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_current_org_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.edit_tenant_settings(UUID, UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.edit_tenant_settings(UUID, UUID, JSONB) TO service_role;

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier TEXT,
  p_limit INTEGER,
  p_window_seconds INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_count INTEGER;
  current_expiry TIMESTAMPTZ;
  operation_timestamp TIMESTAMPTZ := clock_timestamp();
BEGIN
  IF length(trim(p_identifier)) = 0 OR p_limit < 1 OR p_window_seconds < 1 THEN
    RAISE EXCEPTION 'Invalid rate limit input' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.rate_limit_entries AS entry (
    identifier, count, window_start, expires_at
  ) VALUES (
    p_identifier, 1, operation_timestamp,
    operation_timestamp + make_interval(secs => p_window_seconds)
  )
  ON CONFLICT (identifier) DO UPDATE SET
    count = CASE
      WHEN entry.expires_at <= operation_timestamp THEN 1
      ELSE entry.count + 1
    END,
    window_start = CASE
      WHEN entry.expires_at <= operation_timestamp THEN operation_timestamp
      ELSE entry.window_start
    END,
    expires_at = CASE
      WHEN entry.expires_at <= operation_timestamp
        THEN operation_timestamp + make_interval(secs => p_window_seconds)
      ELSE entry.expires_at
    END
  RETURNING count, expires_at INTO current_count, current_expiry;

  RETURN jsonb_build_object(
    'success', current_count <= p_limit,
    'remaining', GREATEST(0, p_limit - current_count),
    'reset_in_seconds', GREATEST(0, CEIL(EXTRACT(EPOCH FROM current_expiry - operation_timestamp))::INTEGER)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;

REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;
DO $$
BEGIN
  IF to_regprocedure('public.handle_new_user()') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated';
  END IF;
  IF to_regprocedure('public.enforce_province_lock()') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.enforce_province_lock() FROM PUBLIC, anon, authenticated';
  END IF;
  IF to_regprocedure('public.record_incident_status_change()') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.record_incident_status_change() FROM PUBLIC, anon, authenticated';
  END IF;
END;
$$;

-- Normalize the reporter foreign key to the Auth user identifier used by every
-- production incident route.
ALTER TABLE public.incidents
  DROP CONSTRAINT IF EXISTS incidents_reporter_id_fkey;
ALTER TABLE public.incidents
  ADD CONSTRAINT incidents_reporter_id_fkey
  FOREIGN KEY (reporter_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- One authenticated, idempotent transaction creates the incident and every
-- operational record required for dispatch.
CREATE OR REPLACE FUNCTION public.create_resident_sos(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id UUID := (SELECT auth.uid());
  profile public.user_profiles%ROWTYPE;
  emergency_type public.emergency_types%ROWTYPE;
  existing_incident public.incidents%ROWTYPE;
  created_incident public.incidents%ROWTYPE;
  requested_local_sos_id TEXT := trim(COALESCE(p_payload->>'local_sos_id', ''));
  latitude_value DOUBLE PRECISION;
  longitude_value DOUBLE PRECISION;
  accuracy_value DOUBLE PRECISION;
  original_created_at TIMESTAMPTZ;
  operation_timestamp TIMESTAMPTZ := clock_timestamp();
  network_status TEXT;
  delay_minutes NUMERIC;
  delivery_state TEXT;
  limiter JSONB;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO profile
  FROM public.user_profiles
  WHERE user_id = current_user_id
  LIMIT 1;

  IF profile.id IS NULL OR NOT profile.is_active OR NOT (
    (profile.role = 'resident' AND profile.registration_status = 'approved')
    OR profile.role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Approved resident access required' USING ERRCODE = '42501';
  END IF;

  IF requested_local_sos_id = '' OR length(requested_local_sos_id) > 128 THEN
    RAISE EXCEPTION 'A valid local SOS identifier is required' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(requested_local_sos_id, 0));

  SELECT incident.* INTO existing_incident
  FROM public.incidents incident
  WHERE incident.local_sos_id = requested_local_sos_id
  LIMIT 1;

  IF existing_incident.id IS NOT NULL THEN
    IF existing_incident.reporter_id <> current_user_id THEN
      RAISE EXCEPTION 'SOS identifier is already in use' USING ERRCODE = '23505';
    END IF;

    SELECT * INTO emergency_type
    FROM public.emergency_types
    WHERE id = existing_incident.emergency_type_id;

    RETURN jsonb_build_object(
      'created', false,
      'incident', to_jsonb(existing_incident) || jsonb_build_object(
        'emergency_type', jsonb_build_object(
          'id', emergency_type.id,
          'name', emergency_type.name,
          'icon', emergency_type.icon,
          'color', emergency_type.color,
          'description', emergency_type.description
        )
      )
    );
  END IF;

  limiter := public.check_rate_limit('sos-user:' || current_user_id::TEXT, 5, 900);
  IF NOT COALESCE((limiter->>'success')::BOOLEAN, FALSE) THEN
    RAISE EXCEPTION 'Too many SOS requests' USING ERRCODE = 'P0001';
  END IF;

  BEGIN
    latitude_value := (p_payload->>'latitude')::DOUBLE PRECISION;
    longitude_value := (p_payload->>'longitude')::DOUBLE PRECISION;
    accuracy_value := NULLIF(p_payload->>'gps_accuracy', '')::DOUBLE PRECISION;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Valid GPS coordinates are required' USING ERRCODE = '22023';
  END;

  IF latitude_value NOT BETWEEN -90 AND 90
     OR longitude_value NOT BETWEEN -180 AND 180 THEN
    RAISE EXCEPTION 'Valid GPS coordinates are required' USING ERRCODE = '22023';
  END IF;

  BEGIN
    original_created_at := COALESCE(
      NULLIF(p_payload->>'created_timestamp', '')::TIMESTAMPTZ,
      operation_timestamp
    );
  EXCEPTION WHEN invalid_datetime_format THEN
    RAISE EXCEPTION 'Invalid SOS creation timestamp' USING ERRCODE = '22007';
  END;

  IF original_created_at > operation_timestamp + INTERVAL '5 minutes' THEN
    RAISE EXCEPTION 'SOS creation timestamp is in the future' USING ERRCODE = '22007';
  END IF;

  network_status := CASE
    WHEN p_payload->>'network_status' = 'offline' THEN 'offline'
    ELSE 'online'
  END;
  delay_minutes := GREATEST(0, EXTRACT(EPOCH FROM operation_timestamp - original_created_at) / 60);
  delivery_state := CASE
    WHEN delay_minutes > 10 THEN 'late_request'
    WHEN delay_minutes > 2 THEN 'delayed'
    ELSE 'live'
  END;

  SELECT * INTO emergency_type
  FROM public.emergency_types
  WHERE organization_id IS NULL
    AND lower(name) = 'emergency sos'
    AND is_active = TRUE
  ORDER BY created_at
  LIMIT 1;

  IF emergency_type.id IS NULL THEN
    RAISE EXCEPTION 'Emergency SOS type is unavailable' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.incidents (
    reference_number, organization_id, reporter_id, reporter_name,
    reporter_phone, emergency_type_id, severity, status, intake_state,
    reporter_role, description, affected_count, has_unconscious, has_fire,
    has_flooding, has_violence, latitude, longitude, gps_accuracy, address,
    barangay, municipality, is_anonymous, is_drill, local_sos_id,
    network_status_at_creation, delivery_status, delivery_delay_minutes,
    created_latitude, created_longitude, created_accuracy, created_timestamp,
    sent_latitude, sent_longitude, sent_accuracy, sent_timestamp,
    queued_offline_at, synced_at, priority, created_at, updated_at
  ) VALUES (
    'INC-' || to_char(operation_timestamp, 'YYYYMMDD') || '-' ||
      lpad(nextval('public.incident_reference_seq')::TEXT, 6, '0'),
    profile.organization_id, current_user_id, profile.full_name,
    profile.phone, emergency_type.id, 'critical', 'submitted', 'incoming',
    'victim', '', 1, FALSE, FALSE, FALSE, FALSE,
    latitude_value, longitude_value, accuracy_value, profile.address,
    profile.barangay, profile.municipality, FALSE,
    profile.role = 'super_admin', requested_local_sos_id, network_status,
    delivery_state, round(delay_minutes, 2), latitude_value, longitude_value,
    accuracy_value, original_created_at, latitude_value, longitude_value,
    accuracy_value, operation_timestamp,
    CASE WHEN network_status = 'offline' THEN original_created_at ELSE NULL END,
    CASE WHEN network_status = 'offline' THEN operation_timestamp ELSE NULL END,
    'critical', operation_timestamp, operation_timestamp
  )
  RETURNING * INTO created_incident;

  INSERT INTO public.incident_locations (
    incident_id, latitude, longitude, accuracy, source, recorded_at
  ) VALUES (
    created_incident.id, latitude_value, longitude_value, accuracy_value,
    'gps', original_created_at
  );

  INSERT INTO public.incident_status_history (
    incident_id, previous_status, new_status, changed_by, changed_by_name,
    changed_by_role, reason, metadata, created_at
  ) VALUES (
    created_incident.id, NULL, 'submitted', profile.id, profile.full_name,
    profile.role, 'GPS SOS received; details pending.',
    jsonb_build_object(
      'intake_state', 'incoming',
      'gps_accuracy', accuracy_value,
      'emergency_type', emergency_type.name,
      'network_status', network_status
    ),
    operation_timestamp
  );

  INSERT INTO public.incident_timeline (
    incident_id, action, event_type, label, description, actor_id,
    actor_name, actor_role, metadata, occurred_at
  ) VALUES
  (
    created_incident.id, 'sos_created', 'sos_created', 'SOS Created',
    'Emergency SOS sent by ' || profile.full_name, current_user_id,
    profile.full_name, profile.role::TEXT,
    jsonb_build_object('gps_accuracy', accuracy_value, 'network_status', network_status),
    original_created_at
  ),
  (
    created_incident.id, 'gps_captured', 'gps_captured', 'GPS Location Captured',
    'Emergency location captured', current_user_id, profile.full_name,
    profile.role::TEXT,
    jsonb_build_object('latitude', latitude_value, 'longitude', longitude_value, 'accuracy', accuracy_value),
    original_created_at
  );

  IF network_status = 'offline' THEN
    INSERT INTO public.incident_timeline (
      incident_id, action, event_type, label, description, actor_id,
      actor_name, actor_role, metadata, occurred_at
    ) VALUES (
      created_incident.id, 'sos_synced', 'sos_synced', 'Offline SOS Delivered',
      'Queued SOS acknowledged by operations after connectivity returned',
      current_user_id, profile.full_name, 'system',
      jsonb_build_object('delay_minutes', round(delay_minutes, 2), 'delivery_status', delivery_state),
      operation_timestamp
    );
  END IF;

  INSERT INTO public.audit_logs (
    actor_id, actor_name, actor_role, action, entity_type, entity_id,
    new_values, organization_id, created_at
  ) VALUES (
    profile.id, profile.full_name, profile.role::TEXT, 'create', 'incident',
    created_incident.id,
    jsonb_build_object(
      'reference_number', created_incident.reference_number,
      'emergency_type', emergency_type.name,
      'status', created_incident.status,
      'network_status', network_status,
      'is_drill', created_incident.is_drill
    ),
    profile.organization_id, operation_timestamp
  );

  RETURN jsonb_build_object(
    'created', true,
    'incident', to_jsonb(created_incident) || jsonb_build_object(
      'emergency_type', jsonb_build_object(
        'id', emergency_type.id,
        'name', emergency_type.name,
        'icon', emergency_type.icon,
        'color', emergency_type.color,
        'description', emergency_type.description
      )
    )
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_resident_sos(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_resident_sos(JSONB) TO authenticated;

-- Status history is written explicitly by the transaction functions below.  The
-- original trigger would create duplicate rows on fresh installations.
DROP TRIGGER IF EXISTS trg_incidents_status_history ON public.incidents;
DROP FUNCTION IF EXISTS public.record_incident_status_change();

CREATE OR REPLACE FUNCTION public.assign_incident_team(
  p_incident_id UUID,
  p_rescue_unit_id UUID,
  p_actor_profile_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_profile public.user_profiles%ROWTYPE;
  target_incident public.incidents%ROWTYPE;
  target_team public.rescue_units%ROWTYPE;
  existing_assignment public.incident_assignments%ROWTYPE;
  emergency_type_name TEXT;
  previous_status public.incident_status;
  previous_unit_id UUID;
  operation_timestamp TIMESTAMPTZ := clock_timestamp();
BEGIN
  SELECT * INTO actor_profile
  FROM public.user_profiles
  WHERE id = p_actor_profile_id
  FOR UPDATE;

  IF actor_profile.id IS NULL
     OR NOT actor_profile.is_active
     OR actor_profile.role::TEXT NOT IN ('super_admin', 'admin', 'dispatcher', 'staff')
     OR (actor_profile.role::TEXT <> 'super_admin' AND actor_profile.registration_status::TEXT <> 'approved') THEN
    RAISE EXCEPTION 'Assignment access required';
  END IF;

  SELECT incident.* INTO target_incident
  FROM public.incidents AS incident
  WHERE incident.id = p_incident_id
    AND incident.deleted_at IS NULL
  FOR UPDATE;

  IF target_incident.id IS NULL THEN
    RAISE EXCEPTION 'Incident not found';
  END IF;

  IF actor_profile.role::TEXT <> 'super_admin'
     AND target_incident.organization_id <> actor_profile.organization_id THEN
    RAISE EXCEPTION 'Incident not found';
  END IF;

  SELECT name INTO emergency_type_name
  FROM public.emergency_types
  WHERE id = target_incident.emergency_type_id;

  previous_status := target_incident.status;
  previous_unit_id := target_incident.assigned_unit_id;

  SELECT * INTO target_team
  FROM public.rescue_units
  WHERE id = p_rescue_unit_id
    AND is_active
  FOR UPDATE;

  IF target_team.id IS NULL
     OR target_team.organization_id <> target_incident.organization_id THEN
    RAISE EXCEPTION 'Rescue team not found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.incidents AS other_incident
    WHERE other_incident.assigned_unit_id = target_team.id
      AND other_incident.id <> target_incident.id
      AND other_incident.deleted_at IS NULL
      AND other_incident.status::TEXT NOT IN ('resolved', 'closed', 'cancelled', 'false_alert', 'invalid', 'duplicate')
  ) THEN
    RAISE EXCEPTION 'Rescue team is already assigned to an active incident';
  END IF;

  SELECT * INTO existing_assignment
  FROM public.incident_assignments
  WHERE incident_id = target_incident.id
    AND rescue_unit_id = target_team.id
    AND status::TEXT = 'assigned'
  ORDER BY assigned_at DESC
  LIMIT 1
  FOR UPDATE;

  IF target_incident.assigned_unit_id = target_team.id
     AND existing_assignment.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'created', false,
      'incident', to_jsonb(target_incident),
      'team', to_jsonb(target_team)
    );
  END IF;

  IF target_incident.assigned_unit_id IS NOT NULL
     AND target_incident.assigned_unit_id <> target_team.id THEN
    UPDATE public.rescue_units
    SET status = 'available', updated_at = operation_timestamp
    WHERE id = target_incident.assigned_unit_id;

    UPDATE public.incident_assignments
    SET status = 'cancelled'
    WHERE incident_id = target_incident.id
      AND rescue_unit_id = target_incident.assigned_unit_id
      AND status::TEXT = 'assigned';
  END IF;

  UPDATE public.incidents
  SET assigned_unit_id = target_team.id,
      assigned_unit_name = target_team.name,
      status = 'assigned',
      updated_at = operation_timestamp
  WHERE id = target_incident.id
  RETURNING * INTO target_incident;

  UPDATE public.rescue_units
  SET status = 'assigned', updated_at = operation_timestamp
  WHERE id = target_team.id
  RETURNING * INTO target_team;

  INSERT INTO public.incident_assignments (
    incident_id, rescue_unit_id, rescue_unit_name, assigned_by,
    assigned_by_name, status, assigned_at
  ) VALUES (
    target_incident.id, target_team.id, target_team.name, actor_profile.id,
    actor_profile.full_name, 'assigned', operation_timestamp
  );

  INSERT INTO public.incident_status_history (
    incident_id, previous_status, new_status, changed_by, changed_by_name,
    changed_by_role, reason, metadata, created_at
  ) VALUES (
    target_incident.id, previous_status, 'assigned', actor_profile.id,
    actor_profile.full_name, actor_profile.role,
    'Assigned to ' || target_team.name,
    jsonb_build_object('rescue_unit_id', target_team.id, 'emergency_type', emergency_type_name),
    operation_timestamp
  );

  INSERT INTO public.incident_timeline (
    incident_id, action, event_type, label, description, actor_id,
    actor_name, actor_role, metadata, occurred_at
  ) VALUES (
    target_incident.id, 'assigned', 'assigned', 'Rescue Team Assigned',
    target_team.name || ' assigned to ' || emergency_type_name,
    actor_profile.id, actor_profile.full_name, actor_profile.role::TEXT,
    jsonb_build_object('rescue_unit_id', target_team.id, 'rescue_unit_name', target_team.name,
      'emergency_type', emergency_type_name), operation_timestamp
  );

  INSERT INTO public.audit_logs (
    actor_id, actor_name, actor_role, action, entity_type, entity_id,
    previous_values, new_values, organization_id, created_at
  ) VALUES (
    actor_profile.id, actor_profile.full_name, actor_profile.role::TEXT,
    'assign', 'incident', target_incident.id,
    jsonb_build_object('assigned_unit_id', previous_unit_id),
    jsonb_build_object('assigned_unit_id', target_team.id, 'assigned_unit_name', target_team.name,
      'emergency_type', emergency_type_name),
    target_incident.organization_id, operation_timestamp
  );

  RETURN jsonb_build_object(
    'created', true,
    'incident', to_jsonb(target_incident),
    'team', to_jsonb(target_team)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.assign_incident_team(UUID, UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assign_incident_team(UUID, UUID, UUID) TO service_role;
