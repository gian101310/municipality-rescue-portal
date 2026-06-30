-- Preserve operational notes when the staff profile that authored them is removed.
-- The existing foreign key uses ON DELETE SET NULL, so the column must be nullable.
ALTER TABLE public.incident_notes
  ALTER COLUMN user_id DROP NOT NULL;
