ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
