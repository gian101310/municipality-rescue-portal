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

CREATE INDEX IF NOT EXISTS idx_responder_locations_incident
  ON responder_locations(incident_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_responder_locations_unit
  ON responder_locations(rescue_unit_id, created_at DESC);

ALTER TABLE responder_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS responder_locations_insert ON public.responder_locations;
DROP POLICY IF EXISTS responder_locations_select ON public.responder_locations;
REVOKE ALL ON public.responder_locations FROM anon, authenticated;
GRANT ALL ON public.responder_locations TO service_role;

ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS assigned_unit_name TEXT;
