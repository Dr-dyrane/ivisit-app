-- Temporary organization-backed emergency hospital discovery deployment.
-- Source digest: 78fc3448f108b8bc
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

-- Source: supabase/migrations/20260219010000_core_rpcs.sql (nearby_hospitals function)
CREATE OR REPLACE FUNCTION public.nearby_hospitals(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_km INTEGER DEFAULT 15
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  distance DOUBLE PRECISION,
  verified BOOLEAN,
  status TEXT,
  display_id TEXT,
  provider_type TEXT,
  emergency_eligible BOOLEAN,
  dispatch_eligible BOOLEAN,
  verification_status TEXT,
  provider_source TEXT,
  category_confidence NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.id, h.name, h.address, h.latitude, h.longitude,
    ST_Distance(
      h.coordinates::geography,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) / 1000.0 AS distance,
    h.verified, h.status, h.display_id,
    h.provider_type, h.emergency_eligible, h.dispatch_eligible,
    h.verification_status, h.provider_source, h.category_confidence
  FROM public.hospitals h
  JOIN public.organizations organization
    ON organization.id = h.organization_id
  WHERE
    h.coordinates IS NOT NULL
    AND h.status = 'available'
    AND h.provider_type = 'hospital'
    AND h.emergency_eligible = true
    AND h.dispatch_eligible = true
    AND organization.is_active = true
    AND organization.verification_status = 'verified'
    AND ST_DWithin(
      h.coordinates::geography,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      radius_km * 1000.0
    )
  ORDER BY distance ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

COMMIT;
