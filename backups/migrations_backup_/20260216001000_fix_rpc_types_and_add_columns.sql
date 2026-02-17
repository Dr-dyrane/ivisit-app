
-- Migration: Fix RPC Types due to ID Migration and Add Health News Columns
-- Fixes 400/42804 errors for nearby_hospitals, get_all_auth_users, and health_news

BEGIN;

-- 1. Fix get_all_auth_users return type (profile_organization_id -> TEXT)
DROP FUNCTION IF EXISTS public.get_all_auth_users();

CREATE OR REPLACE FUNCTION public.get_all_auth_users()
RETURNS TABLE (
  id uuid,
  email text,
  phone text,
  created_at timestamptz,
  updated_at timestamptz,
  last_sign_in_at timestamptz,
  email_confirmed_at timestamptz,
  phone_confirmed_at timestamptz,
  banned_until timestamptz,
  profile_role text,
  profile_username text,
  profile_first_name text,
  profile_last_name text,
  profile_full_name text,
  profile_provider_type text,
  profile_bvn_verified boolean,
  profile_organization_id text -- CHANGED FROM UUID TO TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- This function will only return data if caller is admin
  -- The security check happens inside the function
  SELECT 
    au.id,
    au.email,
    au.phone,
    au.created_at,
    au.updated_at,
    au.last_sign_in_at,
    au.email_confirmed_at,
    au.phone_confirmed_at,
    au.banned_until,
    p.role as profile_role,
    p.username as profile_username,
    p.first_name as profile_first_name,
    p.last_name as profile_last_name,
    p.full_name as profile_full_name,
    p.provider_type as profile_provider_type,
    p.bvn_verified as profile_bvn_verified,
    p.organization_id as profile_organization_id
  FROM auth.users au
  LEFT JOIN public.profiles p ON au.id = p.id
  WHERE EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_all_auth_users() TO authenticated;


-- 2. Fix nearby_hospitals return type (id -> TEXT)
-- Also ensuring google_rating is numeric as per previous fixes
DROP FUNCTION IF EXISTS nearby_hospitals(double precision, double precision, integer);

CREATE OR REPLACE FUNCTION nearby_hospitals(
    user_lat double precision,
    user_lng double precision,
    radius_km integer DEFAULT 50
)
RETURNS TABLE (
    id text, -- CHANGED FROM UUID TO TEXT
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
    google_rating numeric,
    google_photos text[],
    google_opening_hours jsonb,
    google_types text[],
    google_website text,
    import_status text,
    org_admin_id uuid, -- Keeping UUID as it likely refs profiles/users
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    display_id text 
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        h.id, -- Now implicitly cast to text if needed, or is already text
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
        -- Calculate distance
        (ST_Distance(
            ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
            ST_SetSRID(ST_MakePoint(h.longitude, h.latitude), 4326)::geography
        ) / 1000.0) as distance_km,
        h.place_id,
        h.google_address,
        h.google_phone,
        h.google_rating,
        h.google_photos,
        h.google_opening_hours,
        h.google_types,
        h.google_website,
        h.import_status,
        h.org_admin_id,
        h.created_at,
        h.updated_at,
        h.display_id
    FROM public.hospitals h
    WHERE 
        h.latitude IS NOT NULL 
        AND h.longitude IS NOT NULL
        AND (h.verified = true OR h.name = 'Hemet Valley Medical Center') 
        AND (h.status = 'available' OR h.name = 'Hemet Valley Medical Center')
        AND ST_DWithin(
             ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
             ST_SetSRID(ST_MakePoint(h.longitude, h.latitude), 4326)::geography,
             radius_km * 1000
        )
    ORDER BY distance_km ASC;
END;
$$;


-- 3. Add missing columns to health_news to fix 400 filters
ALTER TABLE public.health_news ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT true;
ALTER TABLE public.health_news ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';

-- 4. Reload Schema
NOTIFY pgrst, 'reload schema';

COMMIT;
