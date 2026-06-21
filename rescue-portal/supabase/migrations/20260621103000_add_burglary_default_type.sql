INSERT INTO public.emergency_types (name, icon, color, is_active, organization_id)
SELECT 'Burglary', 'House', '#7f1d1d', true, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.emergency_types
  WHERE lower(name) = 'burglary' AND organization_id IS NULL
);
