-- Migration: Add organization_id to discovery RPCs
-- Description: Ensures organization_id is returned by nearby_hospitals and related discovery functions for UI linkage.

CREATE OR REPLACE FUNCTION public.nearby_hospitals(
    user_lat double precision,
    user_lng double precision,
    radius_km integer DEFAULT 50
)
RETURNS TABLE (
    id uuid,
    name text,
    address text,
    phone text,
    rating double precision,
    type text,
    image text,
    specialties text[],
    service_types text[],
    features text[],
    emergency_level text,
    available_beds integer,
    ambulances_count integer,
    wait_time text,
    price_range text,
    latitude double precision,
    longitude double precision,
    verified boolean,
    status text,
    distance_km double precision,
    place_id text,
    google_address text,
    google_phone text,
    google_rating double precision,
    google_photos text[],
    google_opening_hours jsonb,
    google_types text[],
    google_website text,
    import_status text,
    org_admin_id uuid,
    organization_id uuid, -- Added
    created_at timestamp with time zone,
    updated_at timestamp with time zone
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        h.id,
        h.name,
        h.address,
        h.phone,
        h.rating,
        h.type,
        h.image,
        h.specialties,
        h.service_types,
        h.features,
        h.emergency_level,
        h.available_beds,
        h.ambulances_count,
        h.wait_time,
        h.price_range,
        h.latitude,
        h.longitude,
        h.verified,
        h.status,
        CASE 
            WHEN h.latitude IS NOT NULL AND h.longitude IS NOT NULL THEN
                (ST_Distance(
                    ST_MakePoint(user_lng, user_lat)::geography,
                    ST_MakePoint(h.longitude, h.latitude)::geography
                ) / 1000.0)::double precision
            ELSE NULL
        END as distance_km,
        h.place_id,
        h.google_address,
        h.google_phone,
        h.google_rating::double precision,
        h.google_photos,
        h.google_opening_hours,
        h.google_types,
        h.google_website,
        h.import_status,
        h.org_admin_id,
        h.organization_id, -- Added
        h.created_at,
        h.updated_at
    FROM public.hospitals h
    WHERE 
        h.verified = true 
        AND h.status = 'available'
        AND h.latitude IS NOT NULL 
        AND h.longitude IS NOT NULL
        AND ST_DWithin(
            ST_MakePoint(user_lng, user_lat)::geography,
            ST_MakePoint(h.longitude, h.latitude)::geography,
            radius_km * 1000
        )
    ORDER BY distance_km ASC;
END;
$$;

NOTIFY pgrst, 'reload schema';
