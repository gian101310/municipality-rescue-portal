CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

CREATE OR REPLACE FUNCTION public.purge_expired_responder_locations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.responder_locations
  WHERE created_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  UPDATE public.rescue_units
  SET current_lat = NULL,
      current_lng = NULL,
      last_location_update = NULL,
      updated_at = NOW()
  WHERE last_location_update < NOW() - INTERVAL '24 hours'
    AND NOT EXISTS (
      SELECT 1
      FROM public.incidents
      WHERE incidents.assigned_unit_id = rescue_units.id
        AND incidents.status IN ('assigned', 'accepted', 'dispatched', 'on_the_way', 'arrived', 'operation_in_progress')
    );

  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_expired_responder_locations() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_responder_locations() TO service_role;

SELECT cron.schedule(
  'rescue-portal-location-retention',
  '17 3 * * *',
  'SELECT public.purge_expired_responder_locations();'
);
