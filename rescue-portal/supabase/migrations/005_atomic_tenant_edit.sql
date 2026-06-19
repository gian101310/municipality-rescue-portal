-- Atomically updates every database record owned by a tenant edit.
-- This function is invoked only by the server-side service-role client after
-- the matching Supabase Auth email update has succeeded.

-- Existing tenant routes persist this hash, but older bootstrap schemas did
-- not include it. Keep the edit RPC compatible with both schema histories.
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS master_key_hash TEXT;

CREATE OR REPLACE FUNCTION public.edit_tenant_settings(
  p_organization_id UUID,
  p_admin_user_id UUID,
  p_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_organization organizations%ROWTYPE;
  v_municipality municipalities%ROWTYPE;
  v_admin_profile user_profiles%ROWTYPE;
BEGIN
  UPDATE organizations
  SET
    name = p_payload->>'name',
    slug = p_payload->>'slug',
    province = p_payload->>'province',
    region = p_payload->>'region',
    email = p_payload->>'contact_email',
    emergency_hotline = p_payload->>'emergency_hotline',
    address = p_payload->>'address',
    map_center_lat = (p_payload->>'map_center_lat')::DOUBLE PRECISION,
    map_center_lng = (p_payload->>'map_center_lng')::DOUBLE PRECISION,
    map_zoom = (p_payload->>'map_zoom')::SMALLINT,
    subscription_tier = p_payload->>'subscription_tier',
    is_active = (p_payload->>'is_active')::BOOLEAN,
    branding = p_payload->'branding'
  WHERE id = p_organization_id
  RETURNING * INTO v_organization;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client municipality not found.' USING ERRCODE = 'P0002';
  END IF;

  UPDATE municipalities
  SET
    name = p_payload->>'municipality_name',
    province = p_payload->>'province',
    region = p_payload->>'region',
    map_center_lat = (p_payload->>'map_center_lat')::DOUBLE PRECISION,
    map_center_lng = (p_payload->>'map_center_lng')::DOUBLE PRECISION,
    map_zoom = (p_payload->>'map_zoom')::SMALLINT
  WHERE organization_id = p_organization_id
  RETURNING * INTO v_municipality;

  IF NOT FOUND THEN
    INSERT INTO municipalities (
      organization_id,
      name,
      province,
      region,
      map_center_lat,
      map_center_lng,
      map_zoom,
      is_active
    )
    VALUES (
      p_organization_id,
      p_payload->>'municipality_name',
      p_payload->>'province',
      p_payload->>'region',
      (p_payload->>'map_center_lat')::DOUBLE PRECISION,
      (p_payload->>'map_center_lng')::DOUBLE PRECISION,
      (p_payload->>'map_zoom')::SMALLINT,
      TRUE
    )
    RETURNING * INTO v_municipality;
  END IF;

  INSERT INTO organization_geo_scopes (
    organization_id,
    scope_level,
    region_code,
    province_code,
    municipality_code,
    psgc_version
  )
  VALUES (
    p_organization_id,
    'municipality',
    p_payload->>'region_code',
    NULLIF(p_payload->>'province_code', ''),
    p_payload->>'municipality_code',
    p_payload->>'psgc_version'
  )
  ON CONFLICT (organization_id) DO UPDATE
  SET
    scope_level = EXCLUDED.scope_level,
    region_code = EXCLUDED.region_code,
    province_code = EXCLUDED.province_code,
    municipality_code = EXCLUDED.municipality_code,
    psgc_version = EXCLUDED.psgc_version;

  UPDATE user_profiles
  SET
    full_name = p_payload->>'admin_full_name',
    email = p_payload->>'admin_email',
    municipality_id = v_municipality.id,
    municipality = p_payload->>'municipality_name',
    province = p_payload->>'province'
  WHERE user_id = p_admin_user_id
    AND organization_id = p_organization_id
  RETURNING * INTO v_admin_profile;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Municipality admin profile not found.' USING ERRCODE = 'P0002';
  END IF;

  RETURN jsonb_build_object(
    'organization', jsonb_build_object(
      'id', v_organization.id,
      'name', v_organization.name,
      'slug', v_organization.slug,
      'province', v_organization.province,
      'region', v_organization.region,
      'email', v_organization.email,
      'emergency_hotline', v_organization.emergency_hotline,
      'branding', v_organization.branding,
      'is_active', v_organization.is_active,
      'subscription_tier', v_organization.subscription_tier,
      'master_key_hash', v_organization.master_key_hash,
      'created_at', v_organization.created_at
    ),
    'municipality', jsonb_build_object(
      'id', v_municipality.id,
      'organization_id', v_municipality.organization_id,
      'name', v_municipality.name,
      'province', v_municipality.province,
      'region', v_municipality.region
    ),
    'admin_profile', jsonb_build_object(
      'user_id', v_admin_profile.user_id,
      'organization_id', v_admin_profile.organization_id,
      'full_name', v_admin_profile.full_name,
      'email', v_admin_profile.email,
      'role', v_admin_profile.role
    )
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.edit_tenant_settings(UUID, UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.edit_tenant_settings(UUID, UUID, JSONB) TO service_role;
