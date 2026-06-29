CREATE TABLE public.rescue_unit_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  rescue_unit_id UUID NOT NULL REFERENCES public.rescue_units(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  shift_type TEXT NOT NULL CHECK (shift_type IN ('day', 'swing', 'night')),
  updated_by UUID NOT NULL REFERENCES public.user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (rescue_unit_id, shift_date)
);

CREATE INDEX idx_rescue_unit_shifts_org_date
  ON public.rescue_unit_shifts(organization_id, shift_date);

ALTER TABLE public.rescue_unit_shifts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rescue_unit_shifts FROM anon, authenticated;
GRANT ALL ON public.rescue_unit_shifts TO service_role;

CREATE POLICY "rescue_unit_shifts_staff_same_org"
  ON public.rescue_unit_shifts FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles profile
    WHERE profile.user_id = (SELECT auth.uid())
      AND profile.is_active
      AND profile.role::TEXT IN ('super_admin','admin','dispatcher','team_leader','responder','staff')
      AND (profile.role::TEXT = 'super_admin' OR profile.registration_status::TEXT = 'approved')
      AND (profile.role::TEXT = 'super_admin' OR profile.organization_id = rescue_unit_shifts.organization_id)
  ));
