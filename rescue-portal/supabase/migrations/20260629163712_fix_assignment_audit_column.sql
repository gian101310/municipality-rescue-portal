DO $$
DECLARE
  function_definition TEXT;
BEGIN
  function_definition := pg_get_functiondef(
    'public.assign_incident_team(uuid,uuid,uuid)'::REGPROCEDURE::OID
  );
  function_definition := replace(function_definition, 'old_values', 'previous_values');
  EXECUTE function_definition;
END;
$$;
