-- 🏯 Module 08: Core RPC Functions
-- Critical functions for Edge Functions, Console, and App Discovery

-- 1. Nearby Hospitals (PostGIS Enabled)
CREATE OR REPLACE FUNCTION public.nearby_hospitals(user_lat DOUBLE PRECISION, user_lng DOUBLE PRECISION, radius_km INTEGER DEFAULT 15)
RETURNS TABLE (
    id UUID,
    name TEXT,
    address TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    distance DOUBLE PRECISION,
    verified BOOLEAN,
    status TEXT,
    display_id TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        h.id, 
        h.name, 
        h.address, 
        h.latitude, 
        h.longitude,
        ST_Distance(
            ST_SetSRID(ST_MakePoint(h.longitude, h.latitude), 4326),
            ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)
        ) / 1000 AS distance,
        h.verified,
        h.status,
        h.display_id
    FROM public.hospitals h
    WHERE ST_DWithin(
        ST_SetSRID(ST_MakePoint(h.longitude, h.latitude), 4326),
        ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326),
        radius_km * 1000
    )
    ORDER BY distance ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. Nearby Ambulances (PostGIS Enabled)
CREATE OR REPLACE FUNCTION public.nearby_ambulances(user_lat DOUBLE PRECISION, user_lng DOUBLE PRECISION, radius_km INTEGER DEFAULT 50)
RETURNS TABLE (
    id UUID,
    call_sign TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    distance DOUBLE PRECISION,
    status TEXT,
    display_id TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id, 
        a.call_sign, 
        ST_Y(a.location::geometry) as latitude,
        ST_X(a.location::geometry) as longitude,
        ST_Distance(
            a.location,
            ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)
        ) / 1000 AS distance,
        a.status,
        a.display_id
    FROM public.ambulances a
    WHERE ST_DWithin(
        a.location,
        ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326),
        radius_km * 1000
    )
    ORDER BY distance ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 3. Get All Auth Users (Console Support)
-- This requires a SECURITY DEFINER function because it reads from auth.users
CREATE OR REPLACE FUNCTION public.get_all_auth_users()
RETURNS TABLE (
    id UUID,
    email TEXT,
    phone TEXT,
    last_sign_in_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    raw_user_meta_data JSONB
) AS $$
BEGIN
    -- Security: Only allow admins to call this
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can list auth users';
    END IF;

    RETURN QUERY
    SELECT au.id, au.email, au.phone, au.last_sign_in_at, au.created_at, au.raw_user_meta_data
    FROM auth.users au;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
