-- Read-only capture from project dlwtcmhdzoklveihuhjf on 2026-07-17.
-- Source:
--   SELECT pg_get_functiondef(
--     'public.nearby_providers(double precision,double precision,text,integer,integer)'::regprocedure
--   );
--
-- Catalog metadata at capture:
--   owner: postgres
--   security_definer: false
--   volatility: stable
--   ACL: PUBLIC, anon, authenticated, and service_role may execute
--
-- This file is evidence and rollback source. It is not a migration.

CREATE OR REPLACE FUNCTION public.nearby_providers(user_lat double precision, user_lng double precision, provider_type_filter text DEFAULT NULL::text, radius_km integer DEFAULT 15, result_limit integer DEFAULT 20)
 RETURNS TABLE(id uuid, name text, address text, latitude double precision, longitude double precision, distance double precision, verified boolean, status text, display_id text, provider_type text, emergency_eligible boolean, dispatch_eligible boolean, booking_eligible boolean, verification_status text, provider_source text, category_confidence numeric, phone text, rating double precision, image text, place_id text)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    h.id,
    h.name,
    h.address,
    h.latitude,
    h.longitude,
    ST_Distance(
      h.coordinates::geography,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) / 1000.0 AS distance,
    h.verified,
    h.status,
    h.display_id,
    h.provider_type,
    h.emergency_eligible,
    h.dispatch_eligible,
    h.booking_eligible,
    h.verification_status,
    h.provider_source,
    h.category_confidence,
    h.phone,
    h.rating,
    h.image,
    h.place_id
  FROM public.hospitals h
  WHERE
    h.coordinates IS NOT NULL
    AND h.status = 'available'
    AND (provider_type_filter IS NULL OR h.provider_type = provider_type_filter)
    AND ST_DWithin(
      h.coordinates::geography,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      radius_km * 1000.0
    )
  ORDER BY distance ASC
  LIMIT result_limit;
END;
$function$;
