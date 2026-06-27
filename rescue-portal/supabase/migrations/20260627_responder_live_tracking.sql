-- Live tracking: store responder GPS positions per incident
CREATE TABLE IF NOT EXISTS responder_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  rescue_unit_id UUID NOT NULL REFERENCES rescue_units(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups: latest position per incident
CREATE INDEX IF NOT EXISTS idx_responder_locations_incident ON responder_locations(incident_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_responder_locations_unit ON responder_locations(rescue_unit_id, created_at DESC);

-- Enable RLS
ALTER TABLE responder_locations ENABLE ROW LEVEL SECURITY;

-- Location rows are only accessed through authenticated server routes that perform
-- incident, organization, reporter, and rescue-unit authorization checks.
DROP POLICY IF EXISTS responder_locations_insert ON public.responder_locations;
DROP POLICY IF EXISTS responder_locations_select ON public.responder_locations;
REVOKE ALL ON public.responder_locations FROM anon, authenticated;
GRANT ALL ON public.responder_locations TO service_role;

-- Add assigned_unit_name to incidents if not already present (for display on resident side)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='incidents' AND column_name='assigned_unit_name') THEN
    ALTER TABLE incidents ADD COLUMN assigned_unit_name TEXT;
  END IF;
END $$;
