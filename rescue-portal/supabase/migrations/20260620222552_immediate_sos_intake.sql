ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS intake_state TEXT NOT NULL DEFAULT 'details_received',
  ADD COLUMN IF NOT EXISTS reporter_role TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'incidents_intake_state_check'
  ) THEN
    ALTER TABLE public.incidents
      ADD CONSTRAINT incidents_intake_state_check
      CHECK (intake_state IN ('incoming', 'details_received'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'incidents_reporter_role_check'
  ) THEN
    ALTER TABLE public.incidents
      ADD CONSTRAINT incidents_reporter_role_check
      CHECK (reporter_role IN ('victim', 'passerby'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_incidents_incoming_intake
  ON public.incidents (organization_id, created_at DESC)
  WHERE intake_state = 'incoming';

WITH emergency_type_seed (name, icon, color) AS (
  VALUES
    ('Emergency SOS', 'Siren', '#dc2626'),
    ('Domestic Abuse', 'House', '#be123c'),
    ('Kidnapping', 'Search', '#7c3aed'),
    ('Hostage Situation', 'ShieldAlert', '#b91c1c'),
    ('Bank Robbery', 'Landmark', '#9f1239'),
    ('Stabbing', 'Cross', '#ef4444')
)
INSERT INTO public.emergency_types (
  organization_id,
  name,
  icon,
  color,
  is_active
)
SELECT
  NULL,
  seed.name,
  seed.icon,
  seed.color,
  TRUE
FROM emergency_type_seed AS seed
WHERE NOT EXISTS (
  SELECT 1
  FROM public.emergency_types AS existing
  WHERE existing.organization_id IS NULL
    AND lower(existing.name) = lower(seed.name)
);
