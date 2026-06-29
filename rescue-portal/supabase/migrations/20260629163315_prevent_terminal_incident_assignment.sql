CREATE OR REPLACE FUNCTION public.prevent_terminal_incident_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF OLD.status::TEXT IN ('resolved', 'closed', 'cancelled', 'false_alert', 'invalid', 'duplicate')
     AND (
       NEW.assigned_unit_id IS DISTINCT FROM OLD.assigned_unit_id
       OR NEW.status::TEXT = 'assigned'
     ) THEN
    RAISE EXCEPTION 'A terminal incident cannot be assigned to a rescue team'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.prevent_terminal_incident_assignment() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_prevent_terminal_incident_assignment ON public.incidents;
CREATE TRIGGER trg_prevent_terminal_incident_assignment
  BEFORE UPDATE OF assigned_unit_id, status ON public.incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_terminal_incident_assignment();
