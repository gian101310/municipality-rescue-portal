-- Keep the database membership roles aligned with the positions offered by
-- Admin -> Teams. The previous constraint accepted only team_leader/member,
-- causing valid driver, medic, responder, fire specialist, and communications
-- assignments to fail at insert time.
ALTER TABLE public.rescue_unit_members
  DROP CONSTRAINT IF EXISTS rescue_unit_members_role_check;

ALTER TABLE public.rescue_unit_members
  ADD CONSTRAINT rescue_unit_members_role_check
  CHECK (role IN (
    'team_leader',
    'driver',
    'medic',
    'responder',
    'fire_specialist',
    'communications'
  ));
