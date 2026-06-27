ALTER TABLE public.emergency_types
  ADD COLUMN IF NOT EXISTS description TEXT;
