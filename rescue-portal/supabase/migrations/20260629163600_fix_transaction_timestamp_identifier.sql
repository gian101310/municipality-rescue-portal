-- PostgreSQL reserves CURRENT_TIME as a SQL value expression. Qualifying the
-- transaction timestamp with a non-reserved variable name prevents updates from
-- trying to write a TIME value into TIMESTAMPTZ columns.
DO $$
DECLARE
  function_oid REGPROCEDURE;
  function_definition TEXT;
BEGIN
  FOREACH function_oid IN ARRAY ARRAY[
    'public.check_rate_limit(text,integer,integer)'::REGPROCEDURE,
    'public.create_resident_sos(jsonb)'::REGPROCEDURE,
    'public.assign_incident_team(uuid,uuid,uuid)'::REGPROCEDURE
  ]
  LOOP
    function_definition := pg_get_functiondef(function_oid::OID);
    function_definition := replace(function_definition, 'current_time', 'operation_timestamp');
    EXECUTE function_definition;
  END LOOP;
END;
$$;
