-- 🏯 Module 08: Core RPC Functions
-- Critical functions for Edge Functions, Console, and App Discovery

-- 1. Nearby Hospitals (PostGIS Enabled)
-- PULLBACK NOTE: EXP-3/EXP-4 (Explore Care Refactor) — provider taxonomy contract;
-- the historically cited 20260601000000 deployment artifact is absent from Git.
-- OLD: returned any available row regardless of provider_type; return type had no taxonomy fields
-- NEW: filters commit-eligible hospitals to active, verified organizations; returns taxonomy fields
-- DROP required because return type gains new columns (PostgreSQL constraint).
DROP FUNCTION IF EXISTS public.nearby_hospitals(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER);

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

-- 1b. Nearby Providers (Explore Care)
-- Explore mode RPC — no emergency filter, category-aware.
-- The discovery contract intentionally returns only app-facing hospital/provider
-- projection fields. Organization-owned detail must come from a separately
-- verified onboarding contract, not generic category templates.
DROP FUNCTION IF EXISTS public.nearby_providers(
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  TEXT,
  INTEGER,
  INTEGER
);

CREATE OR REPLACE FUNCTION public.nearby_providers(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  provider_type_filter TEXT DEFAULT NULL,
  radius_km INTEGER DEFAULT 15,
  result_limit INTEGER DEFAULT 20
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
  booking_eligible BOOLEAN,
  verification_status TEXT,
  provider_source TEXT,
  category_confidence NUMERIC,
  phone TEXT,
  rating DOUBLE PRECISION,
  image TEXT,
  place_id TEXT
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
    h.provider_type, h.emergency_eligible, h.dispatch_eligible, h.booking_eligible,
    h.verification_status, h.provider_source, h.category_confidence,
    h.phone, h.rating, h.image, h.place_id
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
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION public.nearby_providers(
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  TEXT,
  INTEGER,
  INTEGER
) TO anon, authenticated, service_role;

-- 2. Nearby Ambulances (PostGIS Enabled)
-- BEGIN CONSOLE_NEARBY_AMBULANCES_RPC
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
DECLARE
    v_user_location GEOMETRY;
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_global_scope BOOLEAN := false;
    v_radius_km INTEGER := LEAST(100, GREATEST(1, COALESCE(radius_km, 50)));
BEGIN
    IF user_lat IS NULL OR user_lng IS NULL
       OR user_lat < -90 OR user_lat > 90
       OR user_lng < -180 OR user_lng > 180 THEN
        RAISE EXCEPTION 'A valid dispatch location is required';
    END IF;

    IF v_is_service_role THEN
        v_global_scope := true;
    ELSE
        SELECT profile.role, profile.organization_id
        INTO v_actor_role, v_actor_org_id
        FROM public.profiles profile
        WHERE profile.id = auth.uid();

        IF v_actor_role = 'admin' THEN
            v_global_scope := true;
        ELSIF v_actor_role IN ('org_admin', 'dispatcher') AND v_actor_org_id IS NOT NULL THEN
            v_global_scope := false;
        ELSE
            RAISE EXCEPTION 'Unauthorized: dispatch fleet scope is unavailable';
        END IF;
    END IF;

    v_user_location := ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326);

    RETURN QUERY
    SELECT 
        a.id, a.call_sign, 
        ST_Y(a.location::geometry) as latitude,
        ST_X(a.location::geometry) as longitude,
        ST_Distance(a.location::geography, v_user_location::geography) / 1000 AS distance,
        a.status, a.display_id
    FROM public.ambulances a
    WHERE a.location IS NOT NULL 
      AND a.status = 'available'
      AND COALESCE(
          (public.ambulance_dispatch_readiness_snapshot(a.id, NULL)->>'ready')::BOOLEAN,
          false
      )
      AND ST_DWithin(a.location::geography, v_user_location::geography, v_radius_km * 1000)
      AND (
          v_global_scope
          OR a.organization_id = v_actor_org_id
          OR (
              a.organization_id IS NULL
              AND a.hospital_id IN (
                  SELECT hospital.id
                  FROM public.hospitals hospital
                  WHERE hospital.organization_id = v_actor_org_id
              )
          )
      )
    ORDER BY distance ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;

REVOKE ALL ON FUNCTION public.nearby_ambulances(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nearby_ambulances(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) TO authenticated, service_role;
-- END CONSOLE_NEARBY_AMBULANCES_RPC

-- 3. Get All Auth Users (Console Support)
-- This requires a SECURITY DEFINER function because it reads from auth.users
CREATE OR REPLACE FUNCTION public.get_all_auth_users(p_organization_id UUID DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    email TEXT,
    phone TEXT,
    last_sign_in_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    raw_user_meta_data JSONB,
    profile_role TEXT,
    profile_username TEXT,
    profile_first_name TEXT,
    profile_last_name TEXT,
    profile_full_name TEXT,
    profile_provider_type TEXT,
    profile_bvn_verified BOOLEAN,
    profile_organization_id UUID,
    profile_display_id TEXT
) AS $$
BEGIN
    -- Security: Only allow admins/org_admins/dispatchers to call this
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND role IN ('admin', 'org_admin', 'dispatcher')
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Access denied';
    END IF;

    RETURN QUERY
    SELECT 
        au.id, 
        au.email::TEXT, 
        au.phone::TEXT, 
        au.last_sign_in_at, 
        au.created_at, 
        au.raw_user_meta_data,
        p.role::TEXT as profile_role,
        p.username::TEXT as profile_username,
        p.first_name::TEXT as profile_first_name,
        p.last_name::TEXT as profile_last_name,
        p.full_name::TEXT as profile_full_name,
        p.provider_type::TEXT as profile_provider_type,
        p.bvn_verified as profile_bvn_verified,
        p.organization_id as profile_organization_id,
        p.display_id::TEXT as profile_display_id
    FROM auth.users au
    LEFT JOIN public.profiles p ON au.id = p.id
    WHERE (p_organization_id IS NULL OR p.organization_id = p_organization_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 🏯 Module 12: Console & Admin Logic
-- RPCs for Console Admin Management

-- 1. Updates & Edits
-- BEGIN CONSOLE_HOSPITAL_UPDATE_RPC
CREATE OR REPLACE FUNCTION public.update_hospital_by_admin(target_hospital_id UUID, payload JSONB)
RETURNS JSONB AS $$
DECLARE
    v_features TEXT[];
    v_specialties TEXT[];
    v_service_types TEXT[];
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_is_platform_admin BOOLEAN := false;
BEGIN
    IF target_hospital_id IS NULL OR payload IS NULL THEN
        RAISE EXCEPTION 'Hospital id and payload are required';
    END IF;

    IF v_is_service_role THEN
        v_is_platform_admin := true;
    ELSE
        SELECT profile.role, profile.organization_id
        INTO v_actor_role, v_actor_org_id
        FROM public.profiles profile
        WHERE profile.id = auth.uid();

        v_is_platform_admin := v_actor_role = 'admin';

        IF auth.uid() IS NULL
           OR v_actor_role IS NULL
           OR v_actor_role NOT IN ('admin', 'org_admin') THEN
            RAISE EXCEPTION 'Unauthorized: hospital management role required';
        END IF;

        IF v_actor_role = 'org_admin' AND NOT EXISTS (
            SELECT 1
            FROM public.hospitals hospital
            WHERE hospital.id = target_hospital_id
              AND hospital.organization_id = v_actor_org_id
        ) THEN
            RAISE EXCEPTION 'Unauthorized: You do not manage this hospital';
        END IF;

        IF v_actor_role = 'org_admin'
           AND (payload ? 'verified' OR payload ? 'verification_status') THEN
            RAISE EXCEPTION 'Platform admin approval is required for verification changes';
        END IF;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.hospitals WHERE id = target_hospital_id) THEN
        RAISE EXCEPTION 'Hospital not found';
    END IF;

    IF v_is_platform_admin
       AND (
           COALESCE((payload->>'verified')::BOOLEAN, false) IS TRUE
           OR LOWER(COALESCE(payload->>'verification_status', '')) = 'verified'
       )
       AND NOT EXISTS (
           SELECT 1
           FROM public.hospitals hospital
           JOIN public.organizations organization
             ON organization.id = hospital.organization_id
           WHERE hospital.id = target_hospital_id
             AND organization.is_active = true
             AND organization.verification_status = 'verified'
       ) THEN
        RAISE EXCEPTION 'ORGANIZATION_VERIFICATION_REQUIRED';
    END IF;

    -- Preserve arrays when a partial payload omits the key, while an explicit []
    -- still clears the corresponding array. This is the live-proven July 8 fix.
    v_features := CASE WHEN payload ? 'features'
        THEN (SELECT COALESCE(array_agg(x), '{}') FROM jsonb_array_elements_text(payload->'features') t(x))
        ELSE NULL END;
    v_specialties := CASE WHEN payload ? 'specialties'
        THEN (SELECT COALESCE(array_agg(x), '{}') FROM jsonb_array_elements_text(payload->'specialties') t(x))
        ELSE NULL END;
    v_service_types := CASE WHEN payload ? 'service_types'
        THEN (SELECT COALESCE(array_agg(x), '{}') FROM jsonb_array_elements_text(payload->'service_types') t(x))
        ELSE NULL END;

    UPDATE public.hospitals
    SET
        name = COALESCE(payload->>'name', name),
        address = COALESCE(payload->>'address', address),
        phone = COALESCE(payload->>'phone', phone),
        rating = COALESCE((payload->>'rating')::FLOAT, rating),
        type = COALESCE(payload->>'type', type),
        latitude = COALESCE((payload->>'latitude')::FLOAT, latitude),
        longitude = COALESCE((payload->>'longitude')::FLOAT, longitude),
        
        verified = CASE
            WHEN v_is_platform_admin THEN COALESCE((payload->>'verified')::BOOLEAN, verified)
            ELSE verified
        END,
        verification_status = CASE
            WHEN v_is_platform_admin THEN COALESCE(payload->>'verification_status', verification_status)
            ELSE verification_status
        END,
        status = COALESCE(payload->>'status', status),
        place_id = COALESCE(payload->>'place_id', place_id),
        
        wait_time = COALESCE(payload->>'wait_time', wait_time),
        price_range = COALESCE(payload->>'price_range', price_range),
        available_beds = COALESCE(NULLIF(payload->>'available_beds', '')::INT, available_beds),
        icu_beds_available = COALESCE(NULLIF(payload->>'icu_beds_available', '')::INT, icu_beds_available),
        total_beds = COALESCE(NULLIF(payload->>'total_beds', '')::INT, total_beds),
        bed_availability = COALESCE(payload->'bed_availability', bed_availability),
        ambulances_count = COALESCE((payload->>'ambulances_count')::INT, ambulances_count),
        emergency_level = COALESCE(payload->>'emergency_level', emergency_level),
        image = COALESCE(payload->>'image', image),
        last_availability_update = CASE
            WHEN payload ? 'available_beds'
              OR payload ? 'icu_beds_available'
              OR payload ? 'total_beds'
              OR payload ? 'bed_availability'
            THEN NOW()
            ELSE last_availability_update
        END,
        
        specialties = COALESCE(v_specialties, specialties),
        service_types = COALESCE(v_service_types, service_types),
        features = COALESCE(v_features, features),
        
        updated_at = NOW()
    WHERE id = target_hospital_id;
    
    RETURN jsonb_build_object('success', true, 'id', target_hospital_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

REVOKE ALL ON FUNCTION public.update_hospital_by_admin(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_hospital_by_admin(UUID, JSONB) TO authenticated, service_role;
-- END CONSOLE_HOSPITAL_UPDATE_RPC

CREATE OR REPLACE FUNCTION public.delete_hospital_by_admin(target_hospital_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_deleted INTEGER := 0;
BEGIN
    IF target_hospital_id IS NULL THEN
        RAISE EXCEPTION 'target_hospital_id is required';
    END IF;

    IF NOT public.p_is_admin() AND NOT EXISTS (
        SELECT 1 FROM public.hospitals
        WHERE id = target_hospital_id AND organization_id = public.p_get_current_org_id()
    ) THEN
        RAISE EXCEPTION 'Unauthorized: You do not manage this hospital';
    END IF;

    DELETE FROM public.hospitals WHERE id = target_hospital_id;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', v_deleted > 0,
        'id', target_hospital_id,
        'deleted', v_deleted,
        'error', CASE WHEN v_deleted = 0 THEN 'Hospital not found' ELSE NULL END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Stats & Analytics
-- BEGIN CONSOLE_USER_STATISTICS_SCOPE
CREATE OR REPLACE FUNCTION public.get_user_statistics()
RETURNS TABLE (
    total_users BIGINT,
    total_profiles BIGINT,
    recent_signups BIGINT,
    email_verified_users BIGINT,
    phone_verified_users BIGINT,
    admin_count BIGINT,
    provider_count BIGINT,
    sponsor_count BIGINT,
    viewer_count BIGINT,
    patient_count BIGINT,
    org_admin_count BIGINT,
    dispatcher_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_global_scope BOOLEAN := false;
BEGIN
    IF auth.role() = 'service_role' THEN
        v_global_scope := true;
    ELSE
        SELECT profile.role, profile.organization_id
        INTO v_actor_role, v_actor_org_id
        FROM public.profiles profile
        WHERE profile.id = auth.uid();

        IF v_actor_role = 'admin' THEN
            v_global_scope := true;
        ELSIF v_actor_role = 'org_admin' AND v_actor_org_id IS NOT NULL THEN
            v_global_scope := false;
        ELSE
            RAISE EXCEPTION 'USER_STATISTICS_SCOPE_DENIED';
        END IF;
    END IF;

    RETURN QUERY SELECT
        (
            SELECT count(*)::BIGINT
            FROM auth.users auth_user
            WHERE v_global_scope OR EXISTS (
                SELECT 1
                FROM public.profiles scoped_profile
                WHERE scoped_profile.id = auth_user.id
                  AND scoped_profile.organization_id = v_actor_org_id
            )
        ),
        (
            SELECT count(*)::BIGINT
            FROM public.profiles profile
            WHERE v_global_scope OR profile.organization_id = v_actor_org_id
        ),
        (
            SELECT count(*)::BIGINT
            FROM auth.users auth_user
            WHERE auth_user.created_at > NOW() - INTERVAL '30 days'
              AND (
                  v_global_scope OR EXISTS (
                      SELECT 1
                      FROM public.profiles scoped_profile
                      WHERE scoped_profile.id = auth_user.id
                        AND scoped_profile.organization_id = v_actor_org_id
                  )
              )
        ),
        (
            SELECT count(*)::BIGINT
            FROM auth.users auth_user
            WHERE auth_user.email_confirmed_at IS NOT NULL
              AND (
                  v_global_scope OR EXISTS (
                      SELECT 1
                      FROM public.profiles scoped_profile
                      WHERE scoped_profile.id = auth_user.id
                        AND scoped_profile.organization_id = v_actor_org_id
                  )
              )
        ),
        (
            SELECT count(*)::BIGINT
            FROM auth.users auth_user
            WHERE auth_user.phone_confirmed_at IS NOT NULL
              AND (
                  v_global_scope OR EXISTS (
                      SELECT 1
                      FROM public.profiles scoped_profile
                      WHERE scoped_profile.id = auth_user.id
                        AND scoped_profile.organization_id = v_actor_org_id
                  )
              )
        ),
        (SELECT count(*)::BIGINT FROM public.profiles profile WHERE profile.role = 'admin' AND (v_global_scope OR profile.organization_id = v_actor_org_id)),
        (SELECT count(*)::BIGINT FROM public.profiles profile WHERE profile.role = 'provider' AND (v_global_scope OR profile.organization_id = v_actor_org_id)),
        (SELECT count(*)::BIGINT FROM public.profiles profile WHERE profile.role = 'sponsor' AND (v_global_scope OR profile.organization_id = v_actor_org_id)),
        (SELECT count(*)::BIGINT FROM public.profiles profile WHERE profile.role = 'viewer' AND (v_global_scope OR profile.organization_id = v_actor_org_id)),
        (SELECT count(*)::BIGINT FROM public.profiles profile WHERE profile.role = 'patient' AND (v_global_scope OR profile.organization_id = v_actor_org_id)),
        (SELECT count(*)::BIGINT FROM public.profiles profile WHERE profile.role = 'org_admin' AND (v_global_scope OR profile.organization_id = v_actor_org_id)),
        (SELECT count(*)::BIGINT FROM public.profiles profile WHERE profile.role = 'dispatcher' AND (v_global_scope OR profile.organization_id = v_actor_org_id));
END;
$$;

REVOKE ALL ON FUNCTION public.get_user_statistics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_statistics() TO authenticated, service_role;
-- END CONSOLE_USER_STATISTICS_SCOPE


-- 3. Automation Hooks (Trending)
CREATE OR REPLACE FUNCTION public.admin_update_trending_topics(payload JSONB)
RETURNS JSONB AS $$
BEGIN
    IF NOT public.p_is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
    -- Logic to upsert trending topics would go here
    -- Currently stubbed as frontend logic seems to rely on direct writes or this is legacy
    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_trending_topics_from_search()
RETURNS JSONB AS $$
BEGIN
    -- Aggregation logic
    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. User Management (Admin)
CREATE OR REPLACE FUNCTION public.delete_user_by_admin(target_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_auth_deleted INTEGER := 0;
    v_profile_deleted INTEGER := 0;
BEGIN
    IF NOT public.p_is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'target_user_id is required';
    END IF;

    IF auth.uid() = target_user_id THEN
        RAISE EXCEPTION 'You cannot delete your own account via admin console';
    END IF;

    DELETE FROM auth.users WHERE id = target_user_id;
    GET DIAGNOSTICS v_auth_deleted = ROW_COUNT;

    IF v_auth_deleted = 0 THEN
        DELETE FROM public.profiles WHERE id = target_user_id;
        GET DIAGNOSTICS v_profile_deleted = ROW_COUNT;
    END IF;

    RETURN jsonb_build_object(
        'success', (v_auth_deleted + v_profile_deleted) > 0,
        'auth_deleted', v_auth_deleted,
        'profile_deleted', v_profile_deleted,
        'target_user_id', target_user_id,
        'error', CASE WHEN (v_auth_deleted + v_profile_deleted) = 0 THEN 'User not found' ELSE NULL END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════
-- 🏯 Module 13: Missing Service RPCs (Swept & Restored)
-- All RPCs referenced by app/console services but missing from migrations
-- ═══════════════════════════════════════════════════════════

-- ─── 5. Admin Helpers ────────────────────────────────────

-- current_user_is_admin: Used by console adminService + profilesService
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- is_admin: Alias used by searchAnalyticsService
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.current_user_is_admin();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- current_user_permission_level: Used by console adminService
CREATE OR REPLACE FUNCTION public.current_user_permission_level()
RETURNS TEXT AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
    RETURN COALESCE(v_role, 'user');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ─── 6. User Search & Profile Admin ─────────────────────

-- search_auth_users: Used by console profilesService
CREATE OR REPLACE FUNCTION public.search_auth_users(search_term TEXT)
RETURNS TABLE (
    id UUID,
    email TEXT,
    phone TEXT,
    last_sign_in_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    raw_user_meta_data JSONB
) AS $$
BEGIN
    IF NOT public.p_is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
    RETURN QUERY
    SELECT au.id, au.email::TEXT, au.phone::TEXT,
           au.last_sign_in_at, au.created_at, au.raw_user_meta_data
    FROM auth.users au
    WHERE au.email ILIKE '%' || search_term || '%'
       OR au.phone ILIKE '%' || search_term || '%'
       OR (au.raw_user_meta_data->>'full_name') ILIKE '%' || search_term || '%';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- update_profile_by_admin: Used by console profilesService
-- BEGIN CONSOLE_PROFILE_ADMIN_RPC
CREATE OR REPLACE FUNCTION public.update_profile_by_admin(target_user_id UUID, profile_data JSONB)
RETURNS JSONB AS $$
DECLARE
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_target public.profiles%ROWTYPE;
    v_requested_role TEXT;
    v_requested_org_id UUID;
BEGIN
    SELECT role, organization_id INTO v_actor_role, v_actor_org_id
    FROM public.profiles
    WHERE id = auth.uid();

    IF auth.uid() IS NULL OR v_actor_role NOT IN ('admin', 'org_admin') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT * INTO v_target
    FROM public.profiles
    WHERE id = target_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profile not found';
    END IF;

    IF profile_data ? 'email' THEN
        RAISE EXCEPTION 'Email changes require the Auth account receiver';
    END IF;

    v_requested_role := NULLIF(BTRIM(profile_data->>'role'), '');
    v_requested_org_id := CASE
        WHEN profile_data ? 'organization_id' AND NULLIF(profile_data->>'organization_id', '') IS NOT NULL
            THEN (profile_data->>'organization_id')::UUID
        WHEN profile_data ? 'organization_id' THEN NULL
        ELSE v_target.organization_id
    END;

    IF v_requested_org_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = v_requested_org_id) THEN
        RAISE EXCEPTION 'Organization scope is invalid';
    END IF;

    IF v_actor_role = 'org_admin' THEN
        IF v_actor_org_id IS NULL OR v_target.organization_id IS DISTINCT FROM v_actor_org_id THEN
            RAISE EXCEPTION 'Organization scope does not match';
        END IF;

        IF profile_data ? 'bvn_verified'
           OR (profile_data ? 'organization_id' AND v_requested_org_id IS DISTINCT FROM v_actor_org_id)
           OR (v_requested_role IS NOT NULL AND v_requested_role NOT IN ('provider', 'viewer', 'dispatcher')) THEN
            RAISE EXCEPTION 'Platform admin approval is required';
        END IF;

        IF v_target.role IN ('admin', 'org_admin', 'sponsor') THEN
            RAISE EXCEPTION 'Platform admin approval is required';
        END IF;
    END IF;
    
    UPDATE public.profiles
    SET
        full_name = COALESCE(profile_data->>'full_name', full_name),
        username = CASE 
            WHEN (profile_data->>'username') = '' THEN NULL
            WHEN (profile_data->>'username') IS NOT NULL THEN profile_data->>'username'
            ELSE username
        END,
        phone = COALESCE(profile_data->>'phone', phone),
        role = COALESCE(v_requested_role, role),
        organization_id = CASE 
            WHEN profile_data ? 'organization_id' THEN v_requested_org_id
            ELSE organization_id
        END,
        provider_type = CASE 
            WHEN (profile_data->>'provider_type') = '' THEN NULL
            WHEN (profile_data->>'provider_type') IS NOT NULL THEN profile_data->>'provider_type'
            ELSE provider_type
        END,
        bvn_verified = COALESCE((profile_data->>'bvn_verified')::BOOLEAN, bvn_verified),
        address = CASE 
            WHEN (profile_data->>'address') = '' THEN NULL
            WHEN (profile_data->>'address') IS NOT NULL THEN profile_data->>'address'
            ELSE address
        END,
        gender = CASE 
            WHEN (profile_data->>'gender') = '' THEN NULL
            WHEN (profile_data->>'gender') IS NOT NULL THEN profile_data->>'gender'
            ELSE gender
        END,
        date_of_birth = CASE 
            WHEN (profile_data->>'date_of_birth') = '' THEN NULL
            WHEN (profile_data->>'date_of_birth') IS NOT NULL THEN profile_data->>'date_of_birth'
            ELSE date_of_birth
        END,
        updated_at = NOW()
    WHERE id = target_user_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'id', target_user_id,
        'role', COALESCE(v_requested_role, v_target.role),
        'organizationId', v_requested_org_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;
-- END CONSOLE_PROFILE_ADMIN_RPC

-- Compatibility facade for older app builds. Caller-supplied display fields are
-- never notification truth; the request, linked payment, and hospital own them.
CREATE OR REPLACE FUNCTION public.notify_cash_approval_org_admins_internal(
    p_request_id UUID,
    p_payment_id UUID,
    p_total_amount NUMERIC DEFAULT 0,
    p_fee_amount NUMERIC DEFAULT 0,
    p_hospital_name TEXT DEFAULT 'Hospital',
    p_service_type TEXT DEFAULT 'ambulance',
    p_display_id TEXT DEFAULT NULL,
    p_organization_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_req RECORD;
    v_payment public.payments%ROWTYPE;
    v_org_id UUID;
    v_actor_id UUID := auth.uid();
    v_actor_org_id UUID;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_recipient RECORD;
    v_notification JSONB;
    v_recipient_count INTEGER := 0;
    v_inserted_count INTEGER := 0;
    v_service_label TEXT;
    v_hospital_name TEXT;
    v_display_id TEXT;
    v_total_amount NUMERIC;
    v_fee_amount NUMERIC;
    v_message TEXT;
    v_actor_role TEXT;
BEGIN
    IF p_request_id IS NULL OR p_payment_id IS NULL THEN
        RAISE EXCEPTION 'Cash approval notification requires request and payment ids';
    END IF;

    SELECT
        request.id,
        request.user_id,
        request.hospital_id,
        request.hospital_name,
        request.service_type,
        request.display_id,
        request.payment_id,
        hospital.organization_id AS hospital_organization_id,
        hospital.name AS canonical_hospital_name
    INTO v_req
    FROM public.emergency_requests AS request
    LEFT JOIN public.hospitals AS hospital ON hospital.id = request.hospital_id
    WHERE request.id = p_request_id
    FOR UPDATE OF request;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Emergency request not found';
    END IF;

    SELECT payment.*
    INTO v_payment
    FROM public.payments AS payment
    WHERE payment.id = p_payment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment not found';
    END IF;

    IF v_payment.emergency_request_id IS DISTINCT FROM p_request_id
       OR (v_req.payment_id IS NOT NULL AND v_req.payment_id IS DISTINCT FROM p_payment_id) THEN
        RAISE EXCEPTION 'Payment is not linked to this emergency request';
    END IF;

    IF v_payment.user_id IS DISTINCT FROM v_req.user_id THEN
        RAISE EXCEPTION 'Payment owner does not match the emergency request owner';
    END IF;

    IF COALESCE(v_payment.payment_method, '') <> 'cash'
       OR COALESCE(v_payment.status, '') <> 'pending' THEN
        RAISE EXCEPTION 'Cash approval notification requires a pending cash payment';
    END IF;

    IF v_payment.organization_id IS NOT NULL
       AND v_req.hospital_organization_id IS NOT NULL
       AND v_payment.organization_id IS DISTINCT FROM v_req.hospital_organization_id THEN
        RAISE EXCEPTION 'Payment and hospital organization scope do not match';
    END IF;

    v_org_id := COALESCE(v_payment.organization_id, v_req.hospital_organization_id);
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Organization not found for emergency request';
    END IF;

    IF NOT v_is_service_role THEN
        SELECT profile.role, profile.organization_id
        INTO v_actor_role, v_actor_org_id
        FROM public.profiles
        AS profile
        WHERE profile.id = v_actor_id;

        IF v_actor_id IS DISTINCT FROM v_req.user_id
           AND COALESCE(v_actor_role, '') <> 'admin'
           AND NOT (
               v_actor_role IN ('org_admin', 'dispatcher')
               AND v_actor_org_id = v_org_id
           ) THEN
            RAISE EXCEPTION 'Unauthorized cash approval notification scope';
        END IF;
    END IF;

    v_total_amount := GREATEST(ROUND(COALESCE(v_payment.amount, 0)::NUMERIC, 2), 0);
    v_fee_amount := GREATEST(ROUND(COALESCE(v_payment.ivisit_fee_amount, 0)::NUMERIC, 2), 0);
    v_hospital_name := COALESCE(
        NULLIF(BTRIM(v_req.hospital_name), ''),
        NULLIF(BTRIM(v_req.canonical_hospital_name), ''),
        'Hospital'
    );
    v_display_id := COALESCE(NULLIF(BTRIM(v_req.display_id), ''), p_request_id::TEXT);

    -- Preserve the old signature while rejecting meaningful identity/amount
    -- conflicts. Remaining legacy copy parameters are intentionally ignored.
    IF p_organization_id IS NOT NULL AND p_organization_id IS DISTINCT FROM v_org_id THEN
        RAISE EXCEPTION 'Caller organization does not match canonical payment scope';
    END IF;
    IF COALESCE(p_total_amount, 0) > 0
       AND ROUND(p_total_amount::NUMERIC, 2) IS DISTINCT FROM v_total_amount THEN
        RAISE EXCEPTION 'Caller amount does not match canonical payment amount';
    END IF;
    IF COALESCE(p_fee_amount, 0) > 0
       AND ROUND(p_fee_amount::NUMERIC, 2) IS DISTINCT FROM v_fee_amount THEN
        RAISE EXCEPTION 'Caller fee does not match canonical payment fee';
    END IF;

    v_service_label := CASE v_req.service_type
        WHEN 'bed' THEN 'Bed Booking'
        WHEN 'booking' THEN 'Visit Booking'
        ELSE 'Ambulance Ride'
    END;

    v_message := format(
        'A patient has requested a %s (%s) at %s with cash payment of $%s. Platform fee: $%s. Tap to approve or decline.',
        v_service_label,
        v_display_id,
        v_hospital_name,
        to_char(v_total_amount, 'FM999999990.00'),
        to_char(v_fee_amount, 'FM999999990.00')
    );

    FOR v_recipient IN
        SELECT profile.id
        FROM public.profiles AS profile
        WHERE profile.role = 'admin'
           OR (profile.role = 'org_admin' AND profile.organization_id = v_org_id)
    LOOP
        v_notification := public.emit_canonical_notification(
            p_event_key => 'emergency_request:' || p_request_id::TEXT
                || ':payment:' || p_payment_id::TEXT || ':cash_approval_required',
            p_recipient_user_id => v_recipient.id,
            p_type => 'emergency',
            p_title => 'Cash Payment Approval Required',
            p_message => v_message,
            p_priority => 'urgent',
            p_action_type => 'approve_cash_payment',
            p_target_id => p_request_id,
            p_action_data => jsonb_build_object(
                'id', p_request_id,
                'paymentId', p_payment_id,
                'requestId', p_request_id,
                'totalAmount', v_total_amount,
                'feeAmount', v_fee_amount,
                'hospitalName', v_hospital_name,
                'serviceType', v_req.service_type,
                'displayId', v_display_id,
                'organizationId', v_org_id
            ),
            p_metadata => jsonb_build_object(
                'eventName', 'emergency_payment.cash_approval_required',
                'requestId', p_request_id,
                'paymentId', p_payment_id,
                'organizationId', v_org_id,
                'targetName', v_hospital_name
            ),
            p_icon => 'cash-outline',
            p_color => 'warning'
        );

        v_recipient_count := v_recipient_count + 1;
        IF COALESCE((v_notification->>'inserted')::BOOLEAN, false) THEN
            v_inserted_count := v_inserted_count + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'recipient_count', v_recipient_count,
        'inserted_count', v_inserted_count,
        'notified_count', v_recipient_count,
        'organization_id', v_org_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Authenticated callers use the compatibility facade below. The notification
-- implementation stays backend-only so patients cannot directly invoke a
-- SECURITY DEFINER fan-out, while create_emergency_v4 can still emit the
-- canonical event atomically with the request and payment.
CREATE OR REPLACE FUNCTION public.notify_cash_approval_org_admins(
    p_request_id UUID,
    p_payment_id UUID,
    p_total_amount NUMERIC DEFAULT 0,
    p_fee_amount NUMERIC DEFAULT 0,
    p_hospital_name TEXT DEFAULT 'Hospital',
    p_service_type TEXT DEFAULT 'ambulance',
    p_display_id TEXT DEFAULT NULL,
    p_organization_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_request_org_id UUID;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
BEGIN
    IF NOT v_is_service_role THEN
        IF v_actor_id IS NULL THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;

        SELECT profile.role, profile.organization_id
        INTO v_actor_role, v_actor_org_id
        FROM public.profiles AS profile
        WHERE profile.id = v_actor_id;

        IF v_actor_role NOT IN ('admin', 'org_admin', 'dispatcher') THEN
            RAISE EXCEPTION 'Unauthorized: insufficient role for cash approval notification';
        END IF;

        SELECT COALESCE(payment.organization_id, hospital.organization_id)
        INTO v_request_org_id
        FROM public.emergency_requests AS request
        JOIN public.payments AS payment
          ON payment.id = p_payment_id
         AND payment.emergency_request_id = request.id
        LEFT JOIN public.hospitals AS hospital ON hospital.id = request.hospital_id
        WHERE request.id = p_request_id;

        IF v_actor_role IN ('org_admin', 'dispatcher')
           AND (v_actor_org_id IS NULL OR v_actor_org_id IS DISTINCT FROM v_request_org_id) THEN
            RAISE EXCEPTION 'Unauthorized: request outside actor organization';
        END IF;
    END IF;

    RETURN public.notify_cash_approval_org_admins_internal(
        p_request_id,
        p_payment_id,
        p_total_amount,
        p_fee_amount,
        p_hospital_name,
        p_service_type,
        p_display_id,
        p_organization_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- delete_user: Used by app authService (self-delete)
CREATE OR REPLACE FUNCTION public.delete_user()
RETURNS JSONB AS $$
BEGIN
    DELETE FROM public.profiles WHERE id = auth.uid();
    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 7. Search & Analytics RPCs ─────────────────────────

-- get_trending_searches: Used by both app discoveryService and console searchService
CREATE OR REPLACE FUNCTION public.get_trending_searches(days_back INTEGER DEFAULT 7, limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    id UUID,
    query TEXT,
    category TEXT,
    rank INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT t.id, t.query, t.category, t.rank
    FROM public.trending_topics t
    ORDER BY t.rank ASC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- get_search_analytics: Used by console searchAnalyticsService
CREATE OR REPLACE FUNCTION public.get_search_analytics(days_back INTEGER DEFAULT 7, limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    query TEXT,
    search_count BIGINT,
    unique_users BIGINT,
    last_searched TIMESTAMPTZ,
    rank INTEGER
) AS $$
BEGIN
    IF NOT public.p_is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
    RETURN QUERY
    WITH query_stats AS (
        SELECT 
            sh.query,
            count(*)::BIGINT as s_count,
            count(DISTINCT sh.user_id)::BIGINT as u_count,
            max(sh.created_at) as last_s
        FROM public.search_history sh
        WHERE sh.created_at >= NOW() - (days_back || ' days')::INTERVAL
        GROUP BY sh.query
    )
    SELECT 
        qs.query,
        qs.s_count,
        qs.u_count,
        qs.last_s,
        (row_number() OVER (ORDER BY qs.s_count DESC))::INTEGER as rank
    FROM query_stats qs
    ORDER BY qs.s_count DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- get_search_analytics_summary: Used by console searchAnalyticsService
CREATE OR REPLACE FUNCTION public.get_search_analytics_summary(days_back INTEGER DEFAULT 7)
RETURNS TABLE (
    total_searches BIGINT,
    unique_searchers BIGINT,
    unique_queries BIGINT,
    avg_searches_per_user NUMERIC,
    top_query TEXT
) AS $$
BEGIN
    IF NOT public.p_is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
    RETURN QUERY
    WITH stats AS (
        SELECT 
            count(*)::BIGINT as t_searches,
            count(DISTINCT sh.user_id)::BIGINT as u_searchers,
            count(DISTINCT sh.query)::BIGINT as u_queries
        FROM public.search_history sh
        WHERE sh.created_at >= NOW() - (days_back || ' days')::INTERVAL
    ),
    top AS (
        SELECT sh.query as t_query
        FROM public.search_history sh
        WHERE sh.created_at >= NOW() - (days_back || ' days')::INTERVAL
        GROUP BY sh.query
        ORDER BY count(*) DESC
        LIMIT 1
    )
    SELECT 
        s.t_searches,
        s.u_searchers,
        s.u_queries,
        CASE WHEN s.u_searchers > 0 THEN (s.t_searches::NUMERIC / s.u_searchers) ELSE 0 END,
        t.t_query
    FROM stats s, (SELECT t_query FROM top UNION ALL SELECT NULL LIMIT 1) t;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 8. Activity Logging RPCs ───────────────────────────

-- log_user_activity: Used by console activityService
CREATE OR REPLACE FUNCTION public.log_user_activity(
    p_action TEXT,
    p_entity_type TEXT DEFAULT NULL,
    p_entity_id UUID DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS JSONB AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO public.user_activity (user_id, action, entity_type, entity_id, description, metadata)
    VALUES (auth.uid(), p_action, p_entity_type, p_entity_id, p_description, p_metadata)
    RETURNING id INTO v_id;
    RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- get_recent_activity: Used by console activityService
CREATE OR REPLACE FUNCTION public.get_recent_activity(limit_count INTEGER DEFAULT 20, offset_count INTEGER DEFAULT 0)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    action TEXT,
    entity_type TEXT,
    entity_id UUID,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    -- Security: RBAC check
    IF NOT public.p_is_console_allowed() THEN
        RAISE EXCEPTION 'Unauthorized: Access denied';
    END IF;

    RETURN QUERY
    SELECT ua.id, ua.user_id, ua.action, ua.entity_type, ua.entity_id, ua.description, ua.metadata, ua.created_at
    FROM public.user_activity ua
    ORDER BY ua.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- get_activity_stats: Used by console activityService
CREATE OR REPLACE FUNCTION public.get_activity_stats(days_back INTEGER DEFAULT 7)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- Security: RBAC check
    IF NOT public.p_is_console_allowed() THEN
        RAISE EXCEPTION 'Unauthorized: Access denied';
    END IF;

    SELECT jsonb_build_object(
        'total_actions', count(*),
        'unique_users', count(DISTINCT ua.user_id),
        'period_days', days_back
    ) INTO v_result
    FROM public.user_activity ua
    WHERE ua.created_at >= NOW() - (days_back || ' days')::INTERVAL;
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 9. Wallet & Payment RPCs ───────────────────────────

-- BEGIN CONSOLE_ORG_STRIPE_STATUS_RPC
-- get_org_stripe_status: Used by console walletService
CREATE OR REPLACE FUNCTION public.get_org_stripe_status(p_organization_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_stripe_id TEXT;
    v_balance NUMERIC;
BEGIN
    IF p_organization_id IS NULL THEN
        RAISE EXCEPTION 'Organization is required';
    END IF;

    IF NOT v_is_service_role THEN
        SELECT role, organization_id
        INTO v_actor_role, v_actor_org_id
        FROM public.profiles
        WHERE id = auth.uid();

        IF auth.uid() IS NULL OR v_actor_role NOT IN ('admin', 'org_admin') THEN
            RAISE EXCEPTION 'Unauthorized: organization finance role required';
        END IF;

        IF v_actor_role = 'org_admin'
           AND v_actor_org_id IS DISTINCT FROM p_organization_id THEN
            RAISE EXCEPTION 'Unauthorized: organization finance scope denied';
        END IF;
    END IF;

    SELECT stripe_account_id INTO v_stripe_id FROM public.organizations WHERE id = p_organization_id;
    SELECT balance INTO v_balance FROM public.organization_wallets WHERE organization_id = p_organization_id;
    RETURN jsonb_build_object(
        'stripe_account_id', v_stripe_id,
        'has_stripe', v_stripe_id IS NOT NULL,
        'wallet_balance', COALESCE(v_balance, 0)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

REVOKE ALL ON FUNCTION public.get_org_stripe_status(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_org_stripe_status(UUID) TO authenticated, service_role;
-- END CONSOLE_ORG_STRIPE_STATUS_RPC

-- process_cash_payment: Used by console walletService (legacy non-v2)
CREATE OR REPLACE FUNCTION public.process_cash_payment(
    p_emergency_request_id UUID,
    p_organization_id UUID,
    p_amount NUMERIC
)
RETURNS JSONB AS $$
DECLARE
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
BEGIN
    IF NOT v_is_service_role AND NOT public.p_is_console_allowed() THEN
        RAISE EXCEPTION 'Unauthorized: Access denied';
    END IF;

    -- Delegate to v2 with default currency
    RETURN public.process_cash_payment_v2(p_emergency_request_id, p_organization_id, p_amount, 'USD');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- BEGIN CONSOLE_CASH_ELIGIBILITY_RPC
-- check_cash_eligibility: Used by console walletService
CREATE OR REPLACE FUNCTION public.check_cash_eligibility(p_organization_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_balance NUMERIC;
    v_fee_pct NUMERIC;
BEGIN
    IF p_organization_id IS NULL THEN
        RAISE EXCEPTION 'Organization is required';
    END IF;

    IF NOT v_is_service_role THEN
        SELECT role, organization_id
        INTO v_actor_role, v_actor_org_id
        FROM public.profiles
        WHERE id = auth.uid();

        IF auth.uid() IS NULL OR v_actor_role NOT IN ('admin', 'org_admin') THEN
            RAISE EXCEPTION 'Unauthorized: organization finance role required';
        END IF;

        IF v_actor_role = 'org_admin'
           AND v_actor_org_id IS DISTINCT FROM p_organization_id THEN
            RAISE EXCEPTION 'Unauthorized: organization finance scope denied';
        END IF;
    END IF;

    SELECT balance INTO v_balance FROM public.organization_wallets WHERE organization_id = p_organization_id;
    SELECT ivisit_fee_percentage INTO v_fee_pct FROM public.organizations WHERE id = p_organization_id;
    RETURN jsonb_build_object(
        'eligible', COALESCE(v_balance, 0) >= 0,
        'balance', COALESCE(v_balance, 0),
        'fee_percentage', COALESCE(v_fee_pct, 2.5)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

REVOKE ALL ON FUNCTION public.check_cash_eligibility(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_cash_eligibility(UUID) TO authenticated, service_role;
-- END CONSOLE_CASH_ELIGIBILITY_RPC

-- process_wallet_payment: Used by app paymentService
CREATE OR REPLACE FUNCTION public.process_wallet_payment(
    p_user_id UUID,
    p_amount NUMERIC,
    p_emergency_request_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_request_org_id UUID;
BEGIN
    IF p_user_id IS NULL OR p_amount IS NULL OR p_amount <= 0 OR p_emergency_request_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid wallet payment payload');
    END IF;

    IF NOT v_is_service_role THEN
        IF v_actor_id IS NULL THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;

        IF v_actor_id IS DISTINCT FROM p_user_id THEN
            RAISE EXCEPTION 'Unauthorized: patient must confirm wallet payment';
        END IF;
    END IF;

    SELECT h.organization_id
    INTO v_request_org_id
    FROM public.emergency_requests er
    LEFT JOIN public.hospitals h ON h.id = er.hospital_id
    WHERE er.id = p_emergency_request_id;

    IF v_request_org_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Emergency request organization not found');
    END IF;

    RETURN public.process_wallet_payment(
        p_user_id,
        v_request_org_id,
        p_emergency_request_id,
        p_amount,
        'USD'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- calculate_emergency_cost_v2: Used by app serviceCostService + pricingService
CREATE OR REPLACE FUNCTION public.calculate_emergency_cost_v2(
    p_service_type TEXT,
    p_hospital_id UUID DEFAULT NULL,
    p_ambulance_type TEXT DEFAULT NULL,
    p_distance_km NUMERIC DEFAULT 0
)
RETURNS JSONB AS $$
BEGIN
    RETURN public.resolve_emergency_pricing(
        p_service_type => p_service_type,
        p_hospital_id => p_hospital_id,
        p_ambulance_type => p_ambulance_type,
        p_distance_km => p_distance_km
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- ─── 10. Utility RPCs ───────────────────────────────────

-- reload_schema: Used by app appMigrationsService + seederService
-- This is a no-op stub — Supabase auto-reloads schema on DDL changes
-- Patient-safe cash preflight. Unlike the Console finance projection above,
-- this returns no balance, fee, or organization-finance details.
CREATE OR REPLACE FUNCTION public.check_patient_cash_eligibility(
    p_service_type TEXT,
    p_hospital_id UUID,
    p_ambulance_type TEXT DEFAULT NULL,
    p_distance_km NUMERIC DEFAULT 0
)
RETURNS BOOLEAN AS $$
DECLARE
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_organization_id UUID;
    v_organization_active BOOLEAN;
    v_fee_percentage NUMERIC;
    v_wallet_balance NUMERIC;
    v_pricing JSONB;
    v_total_amount NUMERIC;
    v_fee_amount NUMERIC;
BEGIN
    IF NOT v_is_service_role AND auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    IF p_hospital_id IS NULL OR NULLIF(BTRIM(COALESCE(p_service_type, '')), '') IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT hospital.organization_id,
           organization.is_active,
           COALESCE(NULLIF(organization.ivisit_fee_percentage, 0), 2.5)
    INTO v_organization_id, v_organization_active, v_fee_percentage
    FROM public.hospitals hospital
    LEFT JOIN public.organizations organization
      ON organization.id = hospital.organization_id
    WHERE hospital.id = p_hospital_id;

    IF v_organization_id IS NULL OR COALESCE(v_organization_active, FALSE) IS NOT TRUE THEN
        RETURN FALSE;
    END IF;

    v_pricing := public.resolve_emergency_pricing(
        p_service_type => p_service_type,
        p_hospital_id => p_hospital_id,
        p_ambulance_type => p_ambulance_type,
        p_distance_km => GREATEST(COALESCE(p_distance_km, 0), 0)
    );
    v_total_amount := NULLIF(v_pricing->>'total_cost', '')::NUMERIC;

    IF v_total_amount IS NULL OR v_total_amount < 0 THEN
        RETURN FALSE;
    END IF;

    v_fee_amount := ROUND(
        v_total_amount * (COALESCE(v_fee_percentage, 2.5) / 100.0),
        2
    );

    SELECT wallet.balance
    INTO v_wallet_balance
    FROM public.organization_wallets wallet
    WHERE wallet.organization_id = v_organization_id;

    RETURN COALESCE(v_wallet_balance, 0) >= COALESCE(v_fee_amount, 0);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth;

REVOKE ALL ON FUNCTION public.check_patient_cash_eligibility(TEXT, UUID, TEXT, NUMERIC)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_patient_cash_eligibility(TEXT, UUID, TEXT, NUMERIC)
TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.reload_schema()
RETURNS VOID AS $$
BEGIN
    NOTIFY pgrst, 'reload schema';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════
-- 🏯 Module 14: Recovered Legacy RPCs
-- ═══════════════════════════════════════════════════════════

-- 1. Get Available Doctors (Console)
CREATE OR REPLACE FUNCTION public.get_available_doctors(
    p_hospital_id UUID,
    p_specialty TEXT DEFAULT NULL
)
RETURNS TABLE (
    doctor_id UUID,
    doctor_name TEXT,
    specialty TEXT,
    current_patients INTEGER,
    max_patients INTEGER,
    availability_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        COALESCE(p.full_name, d.name),
        d.specialization,
        d.current_patients,
        d.max_patients,
        CASE
            WHEN d.is_available AND d.current_patients < d.max_patients THEN 'Available'
            WHEN d.is_available THEN 'Full Capacity'
            ELSE 'Unavailable'
        END
    FROM public.doctors d
    LEFT JOIN public.profiles p ON d.profile_id = p.id
    WHERE d.hospital_id = p_hospital_id
      AND (p_specialty IS NULL OR d.specialization = p_specialty)
    ORDER BY
        CASE WHEN d.is_available AND d.current_patients < d.max_patients THEN 1 ELSE 2 END,
        d.current_patients ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. Manually Assign Doctor (Console)
CREATE OR REPLACE FUNCTION public.assign_doctor_to_emergency(
    p_emergency_request_id UUID,
    p_doctor_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_is_admin BOOLEAN := public.p_is_admin();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_req_status TEXT;
    v_req_hospital_id UUID;
    v_req_org_id UUID;
    v_existing_doctor_id UUID;
    v_doctor_hospital_id UUID;
    v_doctor_org_id UUID;
    v_doctor_is_available BOOLEAN;
    v_doctor_status TEXT;
    v_doctor_current_patients INTEGER;
    v_doctor_max_patients INTEGER;
    v_has_active_same_doctor BOOLEAN := FALSE;
BEGIN
    IF p_emergency_request_id IS NULL OR p_doctor_id IS NULL THEN
        RAISE EXCEPTION 'emergency request id and doctor id are required';
    END IF;

    SELECT role, organization_id
    INTO v_actor_role, v_actor_org_id
    FROM public.profiles
    WHERE id = v_actor_id;

    IF NOT v_is_service_role AND v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT er.status, er.hospital_id, h.organization_id, er.assigned_doctor_id
    INTO v_req_status, v_req_hospital_id, v_req_org_id, v_existing_doctor_id
    FROM public.emergency_requests er
    LEFT JOIN public.hospitals h ON h.id = er.hospital_id
    WHERE er.id = p_emergency_request_id
    FOR UPDATE OF er;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Emergency request not found',
            'code', 'REQUEST_NOT_FOUND'
        );
    END IF;

    v_req_status := public.canonicalize_emergency_status(v_req_status, v_req_status);
    IF v_req_status IN ('completed', 'cancelled', 'payment_declined') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Cannot assign doctor to terminal emergency request',
            'code', 'REQUEST_TERMINAL'
        );
    END IF;

    SELECT
        d.hospital_id,
        h.organization_id,
        COALESCE(d.is_available, false),
        LOWER(COALESCE(d.status, '')),
        COALESCE(d.current_patients, 0),
        GREATEST(COALESCE(NULLIF(d.max_patients, 0), 1), 1)
    INTO
        v_doctor_hospital_id,
        v_doctor_org_id,
        v_doctor_is_available,
        v_doctor_status,
        v_doctor_current_patients,
        v_doctor_max_patients
    FROM public.doctors d
    LEFT JOIN public.hospitals h ON h.id = d.hospital_id
    WHERE d.id = p_doctor_id
    FOR UPDATE OF d;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Doctor not found',
            'code', 'DOCTOR_NOT_FOUND'
        );
    END IF;

    IF NOT v_is_service_role AND NOT v_is_admin THEN
        IF v_actor_role NOT IN ('org_admin', 'dispatcher') THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;

        IF v_actor_org_id IS NULL THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;

        IF v_req_org_id IS NOT NULL AND v_actor_org_id IS DISTINCT FROM v_req_org_id THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;

        IF v_doctor_org_id IS NOT NULL AND v_actor_org_id IS DISTINCT FROM v_doctor_org_id THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;
    END IF;

    IF v_req_hospital_id IS NOT NULL AND v_doctor_hospital_id IS DISTINCT FROM v_req_hospital_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Doctor does not belong to request hospital',
            'code', 'DOCTOR_HOSPITAL_MISMATCH'
        );
    END IF;

    IF NOT v_doctor_is_available
       OR v_doctor_status <> 'available'
       OR v_doctor_current_patients >= v_doctor_max_patients THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Doctor is not available',
            'code', 'DOCTOR_UNAVAILABLE'
        );
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.emergency_doctor_assignments eda
        WHERE eda.emergency_request_id = p_emergency_request_id
          AND eda.doctor_id = p_doctor_id
          AND eda.status = 'assigned'
    ) INTO v_has_active_same_doctor;

    IF v_existing_doctor_id = p_doctor_id THEN
        IF NOT v_has_active_same_doctor THEN
            INSERT INTO public.emergency_doctor_assignments (emergency_request_id, doctor_id, status, notes)
            VALUES (p_emergency_request_id, p_doctor_id, 'assigned', NULLIF(BTRIM(p_notes), ''));
        END IF;

        UPDATE public.emergency_requests
        SET doctor_assigned_at = COALESCE(doctor_assigned_at, NOW()),
            updated_at = NOW()
        WHERE id = p_emergency_request_id;

        RETURN jsonb_build_object(
            'success', true,
            'doctor_id', p_doctor_id,
            'previous_doctor_id', v_existing_doctor_id,
            'reassigned', false,
            'idempotent', true
        );
    END IF;

    WITH released_assignments AS (
        UPDATE public.emergency_doctor_assignments
        SET status = 'cancelled',
            updated_at = NOW()
        WHERE emergency_request_id = p_emergency_request_id
          AND status = 'assigned'
        RETURNING doctor_id
    ),
    released_counts AS (
        SELECT doctor_id, COUNT(*)::INTEGER AS release_count
        FROM released_assignments
        WHERE doctor_id IS NOT NULL
        GROUP BY doctor_id
    )
    UPDATE public.doctors d
    SET current_patients = GREATEST(0, COALESCE(d.current_patients, 0) - rc.release_count),
        updated_at = NOW()
    FROM released_counts rc
    WHERE d.id = rc.doctor_id;

    INSERT INTO public.emergency_doctor_assignments (emergency_request_id, doctor_id, status, notes)
    VALUES (p_emergency_request_id, p_doctor_id, 'assigned', NULLIF(BTRIM(p_notes), ''));

    UPDATE public.doctors
    SET current_patients = COALESCE(current_patients, 0) + 1,
        updated_at = NOW()
    WHERE id = p_doctor_id;

    UPDATE public.emergency_requests
    SET assigned_doctor_id = p_doctor_id,
        doctor_assigned_at = NOW(),
        updated_at = NOW()
    WHERE id = p_emergency_request_id;

    RETURN jsonb_build_object(
        'success', true,
        'doctor_id', p_doctor_id,
        'previous_doctor_id', v_existing_doctor_id,
        'reassigned', v_existing_doctor_id IS DISTINCT FROM p_doctor_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Get Service Price
CREATE OR REPLACE FUNCTION public.get_service_price(
    p_service_type TEXT,
    p_hospital_id UUID DEFAULT NULL
)
RETURNS TABLE (service_name TEXT, price NUMERIC, currency TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT sp.service_name, sp.base_price, 'USD'::TEXT
    FROM public.service_pricing sp
    WHERE sp.service_type = p_service_type
      AND (sp.hospital_id = p_hospital_id OR sp.hospital_id IS NULL)
    ORDER BY sp.hospital_id DESC NULLS LAST
    LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 4. Get Room Price
CREATE OR REPLACE FUNCTION public.get_room_price(
    p_room_type TEXT,
    p_hospital_id UUID DEFAULT NULL
)
RETURNS TABLE (room_name TEXT, price NUMERIC, currency TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT rp.room_name, rp.price_per_night, 'USD'::TEXT
    FROM public.room_pricing rp
    WHERE rp.room_type = p_room_type
      AND (rp.hospital_id = p_hospital_id OR rp.hospital_id IS NULL)
    ORDER BY rp.hospital_id DESC NULLS LAST
    LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 5. Rate a Visit (App)
CREATE OR REPLACE FUNCTION public.rate_visit(
    p_visit_id UUID,
    p_rating SMALLINT,
    p_comment TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_visit public.visits%ROWTYPE;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'INVALID_RATING',
            'error', 'Rating must be between 1 and 5'
        );
    END IF;

    SELECT visit.*
    INTO v_visit
    FROM public.visits visit
    WHERE visit.id = p_visit_id
      AND visit.user_id = v_actor_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'VISIT_NOT_FOUND',
            'error', 'Visit not found or unauthorized'
        );
    END IF;

    IF v_visit.rated_at IS NOT NULL
       OR v_visit.rating IS NOT NULL
       OR LOWER(COALESCE(v_visit.lifecycle_state, '')) = 'rated' THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_rated', true,
            'visit', to_jsonb(v_visit)
        );
    END IF;

    IF LOWER(COALESCE(v_visit.status, '')) <> 'completed'
       AND LOWER(COALESCE(v_visit.lifecycle_state, '')) NOT IN ('completed', 'rating_pending') THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'VISIT_NOT_COMPLETE',
            'error', 'Visit must be completed before rating'
        );
    END IF;

    UPDATE public.visits
    SET rating = p_rating,
        rating_comment = LEFT(NULLIF(BTRIM(p_comment), ''), 2000),
        rated_at = v_now,
        lifecycle_state = 'rated',
        lifecycle_updated_at = v_now,
        updated_at = v_now
    WHERE id = p_visit_id
    RETURNING * INTO v_visit;

    RETURN jsonb_build_object(
        'success', true,
        'already_rated', false,
        'visit', to_jsonb(v_visit)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.skip_visit_rating(
    p_visit_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_visit public.visits%ROWTYPE;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT visit.*
    INTO v_visit
    FROM public.visits visit
    WHERE visit.id = p_visit_id
      AND visit.user_id = v_actor_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'VISIT_NOT_FOUND',
            'error', 'Visit not found or unauthorized'
        );
    END IF;

    IF v_visit.rated_at IS NOT NULL
       OR v_visit.rating IS NOT NULL
       OR LOWER(COALESCE(v_visit.lifecycle_state, '')) = 'rated' THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_rated', true,
            'visit', to_jsonb(v_visit)
        );
    END IF;

    IF LOWER(COALESCE(v_visit.lifecycle_state, '')) = 'post_completion' THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_skipped', true,
            'visit', to_jsonb(v_visit)
        );
    END IF;

    IF LOWER(COALESCE(v_visit.status, '')) <> 'completed'
       AND LOWER(COALESCE(v_visit.lifecycle_state, '')) NOT IN ('completed', 'rating_pending') THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'VISIT_NOT_COMPLETE',
            'error', 'Visit must be completed before closing rating'
        );
    END IF;

    UPDATE public.visits
    SET lifecycle_state = 'post_completion',
        lifecycle_updated_at = v_now,
        updated_at = v_now
    WHERE id = p_visit_id
    RETURNING * INTO v_visit;

    RETURN jsonb_build_object(
        'success', true,
        'already_skipped', false,
        'visit', to_jsonb(v_visit)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.rate_visit(UUID, SMALLINT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.skip_visit_rating(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rate_visit(UUID, SMALLINT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.skip_visit_rating(UUID) TO authenticated;

-- ================================================================
-- Integrated Fix Pack (2026-03-02): Console/Patient Emergency RPC Boundary
-- Source: consolidated from temporary fix migrations
-- ================================================================

CREATE OR REPLACE FUNCTION public.jsonb_to_point_geometry(p_location JSONB)
RETURNS geometry AS $$
DECLARE
    v_lat DOUBLE PRECISION;
    v_lng DOUBLE PRECISION;
BEGIN
    IF p_location IS NULL THEN
        RETURN NULL;
    END IF;

    BEGIN
        IF p_location ? 'coordinates'
           AND jsonb_typeof(p_location->'coordinates') = 'array'
           AND jsonb_array_length(p_location->'coordinates') >= 2 THEN
            v_lng := NULLIF(p_location->'coordinates'->>0, '')::DOUBLE PRECISION;
            v_lat := NULLIF(p_location->'coordinates'->>1, '')::DOUBLE PRECISION;
        ELSE
            v_lat := COALESCE(
                NULLIF(p_location->>'lat', '')::DOUBLE PRECISION,
                NULLIF(p_location->>'latitude', '')::DOUBLE PRECISION
            );
            v_lng := COALESCE(
                NULLIF(p_location->>'lng', '')::DOUBLE PRECISION,
                NULLIF(p_location->>'longitude', '')::DOUBLE PRECISION
            );
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RETURN NULL;
    END;

    IF v_lat IS NULL OR v_lng IS NULL
       OR v_lat::TEXT IN ('NaN', 'Infinity', '-Infinity')
       OR v_lng::TEXT IN ('NaN', 'Infinity', '-Infinity')
       OR v_lat < -90 OR v_lat > 90
       OR v_lng < -180 OR v_lng > 180 THEN
        RETURN NULL;
    END IF;

    RETURN ST_SetSRID(ST_MakePoint(v_lng, v_lat), 4326);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.canonicalize_emergency_status(
    p_status TEXT,
    p_default TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    v_status TEXT := LOWER(COALESCE(NULLIF(TRIM(p_status), ''), ''));
    v_default TEXT := LOWER(COALESCE(NULLIF(TRIM(p_default), ''), ''));
BEGIN
    IF v_status = '' THEN
        RETURN NULLIF(v_default, '');
    END IF;

    RETURN CASE v_status
        WHEN 'pending' THEN 'pending_approval'
        WHEN 'pending_approval' THEN 'pending_approval'
        WHEN 'dispatched' THEN 'in_progress'
        WHEN 'in_progress' THEN 'in_progress'
        WHEN 'assigned' THEN 'accepted'
        WHEN 'responding' THEN 'accepted'
        WHEN 'en_route' THEN 'accepted'
        WHEN 'accepted' THEN 'accepted'
        WHEN 'arrived' THEN 'arrived'
        WHEN 'resolved' THEN 'completed'
        WHEN 'completed' THEN 'completed'
        WHEN 'canceled' THEN 'cancelled'
        WHEN 'cancelled' THEN 'cancelled'
        WHEN 'declined' THEN 'payment_declined'
        WHEN 'payment_declined' THEN 'payment_declined'
        ELSE v_status
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.set_emergency_transition_context(
    p_source TEXT,
    p_reason TEXT DEFAULT NULL,
    p_actor_id UUID DEFAULT auth.uid(),
    p_actor_role TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::JSONB,
    p_allow_status_write BOOLEAN DEFAULT true
)
RETURNS VOID AS $$
DECLARE
    v_actor_role TEXT := NULLIF(TRIM(COALESCE(p_actor_role, '')), '');
BEGIN
    IF p_allow_status_write THEN
        PERFORM set_config('ivisit.allow_emergency_status_write', '1', true);
    END IF;

    IF p_actor_id IS NOT NULL THEN
        PERFORM set_config('ivisit.transition_actor_id', p_actor_id::TEXT, true);
    END IF;

    IF v_actor_role IS NULL AND p_actor_id IS NOT NULL THEN
        SELECT role
        INTO v_actor_role
        FROM public.profiles
        WHERE id = p_actor_id;
    END IF;

    PERFORM set_config('ivisit.transition_actor_role', COALESCE(v_actor_role, 'unknown'), true);
    PERFORM set_config('ivisit.transition_source', COALESCE(NULLIF(TRIM(p_source), ''), 'unspecified_source'), true);
    PERFORM set_config('ivisit.transition_reason', COALESCE(NULLIF(TRIM(p_reason), ''), 'status_transition'), true);
    PERFORM set_config('ivisit.transition_metadata', COALESCE(p_metadata, '{}'::JSONB)::TEXT, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- BEGIN EMERGENCY_RESPONDER_READINESS_RPCS
-- PULLBACK NOTE: assignment, responder identity, and telemetry freshness now
-- converge through one server-owned readiness snapshot.
CREATE OR REPLACE FUNCTION public.ambulance_dispatch_readiness_snapshot(
    p_ambulance_id UUID,
    p_request_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_ambulance RECORD;
    v_request RECORD;
    v_ambulance_org_id UUID;
    v_request_org_id UUID;
    v_request_dispatch_org_id UUID;
    v_status_ready BOOLEAN := FALSE;
    v_staffed BOOLEAN := FALSE;
    v_responder_eligible BOOLEAN := FALSE;
    v_organization_match BOOLEAN := FALSE;
    v_organization_ready BOOLEAN := FALSE;
    v_facility_ready BOOLEAN := FALSE;
    v_located BOOLEAN := FALSE;
    v_telemetry_fresh BOOLEAN := FALSE;
    v_type_supported BOOLEAN := FALSE;
    v_no_conflicting_call BOOLEAN := FALSE;
    v_ambulance_type_key TEXT;
    v_requested_type_key TEXT;
    v_reasons JSONB := '[]'::JSONB;
BEGIN
    SELECT
        a.*,
        p.role AS responder_role,
        p.provider_type AS responder_provider_type,
        p.organization_id AS responder_org_id,
        p.onboarding_status AS responder_onboarding_status,
        staffing.id AS active_staffing_id,
        organization.verification_status AS organization_verification_status,
        organization.is_active AS organization_is_active,
        organization.organization_type AS organization_type,
        hospital.dispatch_eligible AS facility_dispatch_eligible,
        COALESCE(a.organization_id, hospital.organization_id) AS resolved_org_id
    INTO v_ambulance
    FROM public.ambulances a
    LEFT JOIN public.profiles p ON p.id = a.profile_id
    LEFT JOIN public.hospitals hospital ON hospital.id = a.hospital_id
    LEFT JOIN public.organizations organization
      ON organization.id = COALESCE(a.organization_id, hospital.organization_id)
    LEFT JOIN public.ambulance_staff_assignments staffing
      ON staffing.ambulance_id = a.id
     AND staffing.responder_id = a.profile_id
     AND staffing.status = 'active'
     AND staffing.starts_at <= NOW()
     AND (staffing.ends_at IS NULL OR staffing.ends_at > NOW())
    WHERE a.id = p_ambulance_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'ready', false,
            'ambulance_id', p_ambulance_id,
            'request_id', p_request_id,
            'reasons', jsonb_build_array('ambulance_not_found')
        );
    END IF;

    v_ambulance_org_id := v_ambulance.resolved_org_id;

    IF p_request_id IS NOT NULL THEN
        SELECT
            er.id,
            er.status,
            er.service_type,
            er.ambulance_type,
            er.ambulance_id,
            er.current_responder_assignment_id,
            er.dispatch_organization_id,
            hospital.dispatch_eligible AS destination_dispatch_eligible,
            hospital.organization_id AS resolved_org_id
        INTO v_request
        FROM public.emergency_requests er
        LEFT JOIN public.hospitals hospital ON hospital.id = er.hospital_id
        WHERE er.id = p_request_id;

        IF NOT FOUND THEN
            RETURN jsonb_build_object(
                'ready', false,
                'ambulance_id', p_ambulance_id,
                'request_id', p_request_id,
                'reasons', jsonb_build_array('request_not_found')
            );
        END IF;
        v_request_org_id := v_request.resolved_org_id;
    END IF;

    v_status_ready := LOWER(COALESCE(v_ambulance.status, '')) = 'available'
        OR (
            p_request_id IS NOT NULL
            AND v_ambulance.current_call = p_request_id
            AND LOWER(COALESCE(v_ambulance.status, '')) IN ('dispatched', 'on_trip')
        );
    v_staffed := v_ambulance.profile_id IS NOT NULL
        AND v_ambulance.active_staffing_id IS NOT NULL;
    v_responder_eligible := v_staffed
        AND v_ambulance.responder_role = 'provider'
        AND v_ambulance.responder_provider_type = 'driver'
        AND v_ambulance.responder_onboarding_status IN ('complete', 'skipped')
        AND v_ambulance.responder_org_id IS NOT DISTINCT FROM v_ambulance_org_id;
    v_organization_ready := COALESCE(v_ambulance.organization_is_active, false)
        AND v_ambulance.organization_verification_status = 'verified';
    v_facility_ready := (
            v_ambulance.hospital_id IS NULL
            AND v_ambulance.organization_type = 'ambulance_service'
        )
        OR COALESCE(v_ambulance.facility_dispatch_eligible, false);
    v_ambulance_type_key := NULLIF(
        BTRIM(
            REGEXP_REPLACE(
                LOWER(BTRIM(COALESCE(v_ambulance.type, ''))),
                '[^a-z0-9]+',
                '_',
                'g'
            ),
            '_'
        ),
        ''
    );
    v_ambulance_type_key := CASE
        WHEN v_ambulance_type_key ~ '(^|_)(critical|icu|cct|intensive)(_|$)' THEN 'critical'
        WHEN v_ambulance_type_key ~ '(^|_)(advanced|als|cardiac)(_|$)' THEN 'advanced'
        WHEN v_ambulance_type_key ~ '(^|_)(ambulance|basic|standard|bls)(_|$)' THEN 'basic'
        ELSE v_ambulance_type_key
    END;
    IF p_request_id IS NULL THEN
        v_organization_match := true;
        v_type_supported := true;
    ELSE
        v_facility_ready := v_facility_ready
            AND COALESCE(v_request.destination_dispatch_eligible, false);
        v_organization_match := (
            v_ambulance_org_id IS NOT NULL
            AND COALESCE(
                v_request.dispatch_organization_id,
                v_request_org_id
            ) = v_ambulance_org_id
        );
        -- Pricing and older App builds use tier aliases while fleet rows use
        -- equipment codes. A legacy generic "ambulance" request has no
        -- equipment minimum; specific tiers still compare by semantic class.
        v_requested_type_key := NULLIF(
            BTRIM(
                REGEXP_REPLACE(
                    LOWER(BTRIM(COALESCE(v_request.ambulance_type, ''))),
                    '[^a-z0-9]+',
                    '_',
                    'g'
                ),
                '_'
            ),
            ''
        );
        v_requested_type_key := CASE
            WHEN v_requested_type_key ~ '(^|_)(critical|icu|cct|intensive)(_|$)' THEN 'critical'
            WHEN v_requested_type_key ~ '(^|_)(advanced|als|cardiac)(_|$)' THEN 'advanced'
            WHEN v_requested_type_key ~ '(^|_)(ambulance|basic|standard|bls)(_|$)' THEN 'basic'
            ELSE v_requested_type_key
        END;
        v_type_supported := v_request.service_type = 'ambulance'
            AND v_ambulance_type_key IS NOT NULL
            AND (
                v_requested_type_key IS NULL
                OR LOWER(BTRIM(COALESCE(v_request.ambulance_type, ''))) = 'ambulance'
                OR v_requested_type_key = v_ambulance_type_key
            );
    END IF;
    v_located := v_ambulance.location IS NOT NULL;
    v_telemetry_fresh := v_ambulance.location_received_at IS NOT NULL
        AND v_ambulance.telemetry_lease_expires_at > NOW();
    v_no_conflicting_call := v_ambulance.current_call IS NULL
        OR (p_request_id IS NOT NULL AND v_ambulance.current_call = p_request_id);

    IF NOT v_status_ready THEN v_reasons := v_reasons || jsonb_build_array('status_not_available'); END IF;
    IF NOT v_staffed THEN v_reasons := v_reasons || jsonb_build_array('responder_not_linked'); END IF;
    IF NOT v_responder_eligible THEN v_reasons := v_reasons || jsonb_build_array('responder_not_eligible'); END IF;
    IF NOT v_organization_ready THEN v_reasons := v_reasons || jsonb_build_array('organization_not_ready'); END IF;
    IF NOT v_facility_ready THEN v_reasons := v_reasons || jsonb_build_array('facility_not_dispatch_eligible'); END IF;
    IF NOT v_organization_match THEN v_reasons := v_reasons || jsonb_build_array('organization_mismatch'); END IF;
    IF NOT v_located THEN v_reasons := v_reasons || jsonb_build_array('location_missing'); END IF;
    IF NOT v_telemetry_fresh THEN v_reasons := v_reasons || jsonb_build_array('telemetry_stale'); END IF;
    IF NOT v_type_supported THEN v_reasons := v_reasons || jsonb_build_array('type_not_supported'); END IF;
    IF NOT v_no_conflicting_call THEN v_reasons := v_reasons || jsonb_build_array('conflicting_call'); END IF;

    RETURN jsonb_build_object(
        'ready', v_status_ready
            AND v_staffed
            AND v_responder_eligible
            AND v_organization_ready
            AND v_facility_ready
            AND v_organization_match
            AND v_located
            AND v_telemetry_fresh
            AND v_type_supported
            AND v_no_conflicting_call,
        'ambulance_id', p_ambulance_id,
        'request_id', p_request_id,
        'responder_id', v_ambulance.profile_id,
        'organization_id', v_ambulance_org_id,
        'status_ready', v_status_ready,
        'staffed', v_staffed,
        'responder_eligible', v_responder_eligible,
        'organization_ready', v_organization_ready,
        'facility_ready', v_facility_ready,
        'organization_match', v_organization_match,
        'located', v_located,
        'telemetry_fresh', v_telemetry_fresh,
        'type_supported', v_type_supported,
        'no_conflicting_call', v_no_conflicting_call,
        'location_received_at', v_ambulance.location_received_at,
        'telemetry_lease_expires_at', v_ambulance.telemetry_lease_expires_at,
        'reasons', v_reasons
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_ambulance_dispatch_readiness(
    p_ambulance_id UUID,
    p_request_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_ambulance_org_id UUID;
    v_request_org_id UUID;
    v_request_dispatch_org_id UUID;
    v_snapshot JSONB;
BEGIN
    SELECT role, organization_id
    INTO v_actor_role, v_actor_org_id
    FROM public.profiles
    WHERE id = v_actor_id;

    SELECT COALESCE(a.organization_id, hospital.organization_id)
    INTO v_ambulance_org_id
    FROM public.ambulances a
    LEFT JOIN public.hospitals hospital ON hospital.id = a.hospital_id
    WHERE a.id = p_ambulance_id;

    IF p_request_id IS NOT NULL THEN
        SELECT hospital.organization_id, request.dispatch_organization_id
        INTO v_request_org_id, v_request_dispatch_org_id
        FROM public.emergency_requests request
        LEFT JOIN public.hospitals hospital ON hospital.id = request.hospital_id
        WHERE request.id = p_request_id;
    END IF;

    IF v_actor_id IS NULL OR v_actor_role NOT IN ('admin', 'org_admin', 'dispatcher') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    IF v_actor_role IN ('org_admin', 'dispatcher')
       AND (
            v_actor_org_id IS NULL
            OR v_ambulance_org_id IS DISTINCT FROM v_actor_org_id
            OR (
                p_request_id IS NOT NULL
                AND v_actor_org_id IS DISTINCT FROM v_request_org_id
                AND v_actor_org_id IS DISTINCT FROM v_request_dispatch_org_id
            )
       ) THEN
        RAISE EXCEPTION 'Unauthorized: dispatch readiness outside actor organization';
    END IF;

    v_snapshot := public.ambulance_dispatch_readiness_snapshot(p_ambulance_id, p_request_id);
    RETURN v_snapshot;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_eligible_ambulance_responders(
    p_organization_id UUID DEFAULT NULL
)
RETURNS TABLE (
    responder_id UUID,
    display_id TEXT,
    full_name TEXT,
    phone TEXT,
    provider_type TEXT,
    linked_ambulance_id UUID,
    active_request_id UUID,
    is_available BOOLEAN
) AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_target_org_id UUID;
BEGIN
    SELECT role, organization_id
    INTO v_actor_role, v_actor_org_id
    FROM public.profiles
    WHERE id = v_actor_id;

    IF v_actor_id IS NULL OR v_actor_role NOT IN ('admin', 'org_admin', 'dispatcher') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    v_target_org_id := COALESCE(p_organization_id, v_actor_org_id);
    IF v_target_org_id IS NULL THEN
        RAISE EXCEPTION 'organization id is required';
    END IF;

    IF v_actor_role IN ('org_admin', 'dispatcher') AND v_target_org_id IS DISTINCT FROM v_actor_org_id THEN
        RAISE EXCEPTION 'Unauthorized: responder roster outside actor organization';
    END IF;

    RETURN QUERY
    SELECT
        profile.id,
        profile.display_id,
        profile.full_name,
        profile.phone,
        profile.provider_type,
        staffing.ambulance_id,
        ambulance.current_call,
        staffing.id IS NULL
            OR (
                ambulance.current_call IS NULL
                AND LOWER(COALESCE(ambulance.status, 'available')) NOT IN ('dispatched', 'on_trip', 'en_route', 'on_scene')
            )
    FROM public.profiles profile
    LEFT JOIN public.ambulance_staff_assignments staffing
      ON staffing.responder_id = profile.id
     AND staffing.status = 'active'
     AND staffing.starts_at <= NOW()
     AND (staffing.ends_at IS NULL OR staffing.ends_at > NOW())
    LEFT JOIN public.ambulances ambulance ON ambulance.id = staffing.ambulance_id
    WHERE profile.organization_id = v_target_org_id
      AND profile.role = 'provider'
      AND profile.provider_type = 'driver'
      AND profile.onboarding_status IN ('complete', 'skipped')
    ORDER BY COALESCE(profile.full_name, profile.display_id, profile.id::TEXT);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.staff_ambulance_responder(
    p_ambulance_id UUID,
    p_responder_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_ambulance RECORD;
    v_responder RECORD;
    v_existing_ambulance_id UUID;
    v_active_staffing public.ambulance_staff_assignments%ROWTYPE;
    v_staffing_id UUID;
BEGIN
    IF p_ambulance_id IS NULL OR p_responder_id IS NULL THEN
        RAISE EXCEPTION 'ambulance id and responder id are required';
    END IF;

    SELECT role, organization_id
    INTO v_actor_role, v_actor_org_id
    FROM public.profiles
    WHERE id = v_actor_id;

    IF NOT v_is_service_role
       AND (v_actor_id IS NULL OR v_actor_role NOT IN ('admin', 'org_admin')) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT a.*, COALESCE(a.organization_id, hospital.organization_id) AS resolved_org_id
    INTO v_ambulance
    FROM public.ambulances a
    LEFT JOIN public.hospitals hospital ON hospital.id = a.hospital_id
    WHERE a.id = p_ambulance_id
    FOR UPDATE OF a;

    IF NOT FOUND THEN RAISE EXCEPTION 'Ambulance not found'; END IF;

    IF NOT v_is_service_role
       AND v_actor_role = 'org_admin'
       AND (v_actor_org_id IS NULL OR v_ambulance.resolved_org_id IS DISTINCT FROM v_actor_org_id) THEN
        RAISE EXCEPTION 'Unauthorized: ambulance outside actor organization';
    END IF;

    IF v_ambulance.current_call IS NOT NULL
       OR LOWER(COALESCE(v_ambulance.status, '')) IN ('dispatched', 'on_trip', 'en_route', 'on_scene') THEN
        RAISE EXCEPTION 'Cannot change responder while ambulance has an active call';
    END IF;

    SELECT id, role, provider_type, organization_id, onboarding_status
    INTO v_responder
    FROM public.profiles
    WHERE id = p_responder_id
    FOR UPDATE;

    IF NOT FOUND
       OR v_responder.role <> 'provider'
       OR v_responder.provider_type <> 'driver'
       OR v_responder.onboarding_status NOT IN ('complete', 'skipped')
       OR v_responder.organization_id IS DISTINCT FROM v_ambulance.resolved_org_id THEN
        RAISE EXCEPTION 'Responder is not an eligible driver for this organization';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.organizations organization
        WHERE organization.id = v_ambulance.resolved_org_id
          AND organization.is_active = true
          AND organization.verification_status = 'verified'
    ) THEN
        RAISE EXCEPTION 'Organization is not dispatch ready';
    END IF;

    SELECT staffing.*
    INTO v_active_staffing
    FROM public.ambulance_staff_assignments staffing
    WHERE staffing.responder_id = p_responder_id
      AND staffing.status = 'active'
    FOR UPDATE;

    IF FOUND AND v_active_staffing.ambulance_id = p_ambulance_id THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_staffed', true,
            'staffing_id', v_active_staffing.id,
            'ambulance_id', p_ambulance_id,
            'responder_id', p_responder_id
        );
    END IF;

    v_existing_ambulance_id := CASE
        WHEN v_active_staffing.id IS NULL THEN NULL
        ELSE v_active_staffing.ambulance_id
    END;

    IF v_existing_ambulance_id IS NOT NULL THEN
        RAISE EXCEPTION 'Responder is already linked to another ambulance';
    END IF;

    UPDATE public.ambulance_staff_assignments
    SET status = 'ended',
        ends_at = COALESCE(ends_at, NOW()),
        ended_by = v_actor_id,
        end_reason = 'replaced_by_staffing_command',
        updated_at = NOW()
    WHERE ambulance_id = p_ambulance_id
      AND status = 'active';

    INSERT INTO public.ambulance_staff_assignments (
        ambulance_id,
        responder_id,
        organization_id,
        duty_role,
        status,
        assigned_by,
        metadata
    ) VALUES (
        p_ambulance_id,
        p_responder_id,
        v_ambulance.resolved_org_id,
        'driver',
        'active',
        v_actor_id,
        jsonb_build_object('source', 'staff_ambulance_responder')
    )
    RETURNING id INTO v_staffing_id;

    UPDATE public.ambulances
    SET profile_id = p_responder_id,
        organization_id = COALESCE(organization_id, v_ambulance.resolved_org_id),
        updated_at = NOW()
    WHERE id = p_ambulance_id;

    INSERT INTO public.admin_audit_log (admin_id, action, details)
    VALUES (
        v_actor_id,
        'staff_ambulance_responder',
        jsonb_build_object(
            'ambulance_id', p_ambulance_id,
            'responder_id', p_responder_id,
            'organization_id', v_ambulance.resolved_org_id,
            'actor_role', CASE WHEN v_is_service_role THEN 'service_role' ELSE v_actor_role END
        )
    );

    PERFORM public.emit_canonical_notification(
        p_event_key => 'ambulance_staffing:' || v_staffing_id::TEXT || ':assigned',
        p_recipient_user_id => p_responder_id,
        p_type => 'system',
        p_title => 'Ambulance assignment updated',
        p_message => 'You are now assigned to ' || COALESCE(
            NULLIF(BTRIM(v_ambulance.call_sign), ''),
            NULLIF(BTRIM(v_ambulance.vehicle_number), ''),
            'an ambulance'
        ) || '.',
        p_priority => 'high',
        p_action_type => 'view_driver_assignment',
        p_target_id => p_ambulance_id,
        p_action_data => jsonb_build_object(
            'id', p_ambulance_id,
            'ambulanceId', p_ambulance_id,
            'staffingId', v_staffing_id
        ),
        p_metadata => jsonb_build_object(
            'eventName', 'ambulance_staffing.assigned',
            'ambulanceId', p_ambulance_id,
            'staffingId', v_staffing_id,
            'organizationId', v_ambulance.resolved_org_id
        ),
        p_icon => 'car-outline',
        p_color => 'info'
    );

    RETURN jsonb_build_object(
        'success', true,
        'staffing_id', v_staffing_id,
        'ambulance_id', p_ambulance_id,
        'responder_id', p_responder_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.offer_responder_assignment(
    p_request_id UUID,
    p_ambulance_id UUID,
    p_offered_by UUID DEFAULT auth.uid(),
    p_source TEXT DEFAULT 'dispatch'
)
RETURNS JSONB AS $$
DECLARE
    v_request RECORD;
    v_ambulance RECORD;
    v_payment_state JSONB;
    v_readiness JSONB;
    v_assignment_id UUID;
    v_current_assignment public.emergency_responder_assignments%ROWTYPE;
BEGIN
    SELECT
        request.*,
        hospital.organization_id AS resolved_org_id
    INTO v_request
    FROM public.emergency_requests request
    LEFT JOIN public.hospitals hospital ON hospital.id = request.hospital_id
    WHERE request.id = p_request_id
    FOR UPDATE OF request;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Emergency request not found', 'code', 'REQUEST_NOT_FOUND');
    END IF;

    IF public.canonicalize_emergency_status(v_request.status, v_request.status) <> 'in_progress' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Request is not awaiting responder acceptance',
            'code', 'REQUEST_NOT_DISPATCHABLE',
            'request_status', v_request.status
        );
    END IF;

    v_payment_state := public.emergency_dispatch_payment_snapshot(p_request_id);
    IF COALESCE((v_payment_state->>'ready')::BOOLEAN, false) = false THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Emergency payment is not ready for dispatch',
            'code', 'PAYMENT_NOT_CONFIRMED',
            'payment', v_payment_state
        );
    END IF;

    SELECT a.*, COALESCE(a.organization_id, hospital.organization_id) AS resolved_org_id
    INTO v_ambulance
    FROM public.ambulances a
    LEFT JOIN public.hospitals hospital ON hospital.id = a.hospital_id
    WHERE a.id = p_ambulance_id
    FOR UPDATE OF a;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ambulance not found', 'code', 'AMBULANCE_NOT_FOUND');
    END IF;

    IF v_request.current_responder_assignment_id IS NOT NULL THEN
        SELECT assignment.*
        INTO v_current_assignment
        FROM public.emergency_responder_assignments assignment
        WHERE assignment.id = v_request.current_responder_assignment_id
          AND assignment.emergency_request_id = p_request_id
        FOR UPDATE;

        IF FOUND AND v_current_assignment.ambulance_id = p_ambulance_id THEN
            IF v_current_assignment.status = 'offered'
               AND v_current_assignment.offer_expires_at > NOW() THEN
                RETURN jsonb_build_object(
                    'success', true,
                    'already_offered', true,
                    'assignment_id', v_current_assignment.id,
                    'ambulance_id', p_ambulance_id,
                    'responder_id', v_current_assignment.responder_id,
                    'offer_expires_at', v_current_assignment.offer_expires_at,
                    'request_status', v_request.status,
                    'assignment_status', v_current_assignment.status
                );
            END IF;

            IF v_current_assignment.status IN ('accepted', 'arrived') THEN
                RETURN jsonb_build_object(
                    'success', true,
                    'already_active', true,
                    'assignment_id', v_current_assignment.id,
                    'ambulance_id', p_ambulance_id,
                    'responder_id', v_current_assignment.responder_id,
                    'request_status', v_request.status,
                    'assignment_status', v_current_assignment.status
                );
            END IF;

            IF v_current_assignment.status = 'offered'
               AND v_current_assignment.offer_expires_at <= NOW() THEN
                RETURN public.release_current_responder_assignment(
                    p_request_id,
                    'released',
                    'responder_offer_expired',
                    p_offered_by,
                    'automation'
                ) || jsonb_build_object('code', 'OFFER_EXPIRED_REQUEUED');
            END IF;
        ELSIF FOUND AND v_current_assignment.status <> 'offered' THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'An accepted responder assignment cannot be replaced by an offer',
                'code', 'ACTIVE_ASSIGNMENT_EXISTS',
                'assignment_id', v_current_assignment.id
            );
        END IF;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.emergency_responder_assignments assignment
        WHERE assignment.emergency_request_id = p_request_id
          AND assignment.ambulance_id = p_ambulance_id
          AND assignment.status IN ('declined', 'released')
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'This responder was already released from the request',
            'code', 'RESPONDER_PREVIOUSLY_RELEASED'
        );
    END IF;

    v_readiness := public.ambulance_dispatch_readiness_snapshot(p_ambulance_id, p_request_id);
    IF COALESCE((v_readiness->>'ready')::BOOLEAN, false) = false THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Ambulance is not dispatch ready',
            'code', 'AMBULANCE_NOT_READY',
            'readiness', v_readiness
        );
    END IF;

    IF v_request.current_responder_assignment_id IS NOT NULL THEN
        UPDATE public.emergency_responder_assignments
        SET status = 'released',
            decline_reason = 'replaced_by_dispatch',
            ended_at = NOW(),
            metadata = metadata || jsonb_build_object('replacement_ambulance_id', p_ambulance_id)
        WHERE id = v_request.current_responder_assignment_id
          AND status = 'offered';

        UPDATE public.ambulances
        SET status = 'available',
            current_call = NULL,
            eta = NULL,
            updated_at = NOW()
        WHERE id = v_request.ambulance_id
          AND current_call = p_request_id;
    END IF;

    v_assignment_id := gen_random_uuid();
    INSERT INTO public.emergency_responder_assignments (
        id,
        emergency_request_id,
        ambulance_id,
        responder_id,
        organization_id,
        status,
        offered_by,
        metadata
    ) VALUES (
        v_assignment_id,
        p_request_id,
        p_ambulance_id,
        v_ambulance.profile_id,
        v_ambulance.resolved_org_id,
        'offered',
        p_offered_by,
        jsonb_build_object('source', COALESCE(NULLIF(BTRIM(p_source), ''), 'dispatch'))
    );

    UPDATE public.ambulances
    SET status = 'dispatched',
        current_call = p_request_id,
        updated_at = NOW()
    WHERE id = p_ambulance_id;

    UPDATE public.emergency_requests request
    SET ambulance_id = p_ambulance_id,
        dispatch_organization_id = v_ambulance.resolved_org_id,
        current_responder_assignment_id = v_assignment_id,
        updated_at = NOW()
    WHERE request.id = p_request_id;

    PERFORM public.emit_canonical_notification(
        p_event_key => 'emergency_request:' || p_request_id::TEXT
            || ':assignment:' || v_assignment_id::TEXT || ':offered',
        p_recipient_user_id => v_ambulance.profile_id,
        p_type => 'emergency',
        p_title => 'New emergency offer',
        p_message => 'An emergency request is waiting for your response.',
        p_priority => 'urgent',
        p_action_type => 'respond_emergency_offer',
        p_target_id => p_request_id,
        p_action_data => jsonb_build_object(
            'id', p_request_id,
            'requestId', p_request_id,
            'assignmentId', v_assignment_id
        ),
        p_metadata => jsonb_build_object(
            'eventName', 'emergency_assignment.offered',
            'requestId', p_request_id,
            'assignmentId', v_assignment_id,
            'ambulanceId', p_ambulance_id
        ),
        p_icon => 'alert-circle-outline',
        p_color => 'warning'
    );

    RETURN jsonb_build_object(
        'success', true,
        'assignment_id', v_assignment_id,
        'ambulance_id', p_ambulance_id,
        'responder_id', v_ambulance.profile_id,
        'request_status', 'in_progress',
        'assignment_status', 'offered'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- BEGIN EMERGENCY_RESPONDER_LIFECYCLE_COMMANDS
CREATE OR REPLACE FUNCTION public.release_current_responder_assignment(
    p_request_id UUID,
    p_disposition TEXT,
    p_reason TEXT,
    p_actor_id UUID DEFAULT auth.uid(),
    p_actor_role TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_request public.emergency_requests%ROWTYPE;
    v_assignment public.emergency_responder_assignments%ROWTYPE;
    v_ambulance public.ambulances%ROWTYPE;
    v_next_status TEXT;
    v_was_accepted BOOLEAN := false;
BEGIN
    IF p_disposition NOT IN ('declined', 'released') THEN
        RAISE EXCEPTION 'Invalid assignment release disposition';
    END IF;
    IF NULLIF(BTRIM(COALESCE(p_reason, '')), '') IS NULL THEN
        RAISE EXCEPTION 'A release reason is required';
    END IF;

    SELECT request.*
    INTO v_request
    FROM public.emergency_requests request
    WHERE request.id = p_request_id
    FOR UPDATE;

    IF NOT FOUND OR v_request.current_responder_assignment_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Current responder assignment not found');
    END IF;

    SELECT assignment.*
    INTO v_assignment
    FROM public.emergency_responder_assignments assignment
    WHERE assignment.id = v_request.current_responder_assignment_id
      AND assignment.emergency_request_id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Current responder assignment not found');
    END IF;

    IF p_disposition = 'declined' AND v_assignment.status <> 'offered' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Only an offered assignment can be declined');
    END IF;
    IF p_disposition = 'released' AND v_assignment.status NOT IN ('offered', 'accepted') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Assignment cannot be released in its current state');
    END IF;

    v_was_accepted := v_assignment.status = 'accepted';

    SELECT ambulance.*
    INTO v_ambulance
    FROM public.ambulances ambulance
    WHERE ambulance.id = v_assignment.ambulance_id
    FOR UPDATE;

    UPDATE public.emergency_responder_assignments
    SET status = p_disposition,
        decline_reason = BTRIM(p_reason),
        ended_at = COALESCE(ended_at, NOW()),
        metadata = metadata || jsonb_build_object(
            'released_by', p_actor_id,
            'released_by_role', COALESCE(NULLIF(p_actor_role, ''), 'unknown')
        ),
        updated_at = NOW()
    WHERE id = v_assignment.id;

    UPDATE public.ambulances
    SET status = CASE
            WHEN LOWER(COALESCE(status, '')) IN ('offline', 'maintenance') THEN status
            ELSE 'available'
        END,
        current_call = NULL,
        eta = NULL,
        updated_at = NOW()
    WHERE id = v_assignment.ambulance_id
      AND current_call = p_request_id;

    v_next_status := CASE
        WHEN v_request.status = 'accepted' THEN 'in_progress'
        ELSE v_request.status
    END;

    IF v_next_status IS DISTINCT FROM v_request.status THEN
        PERFORM public.set_emergency_transition_context(
            p_source => CASE
                WHEN p_disposition = 'declined' THEN 'responder_decline_emergency'
                ELSE 'dispatcher_release_responder_assignment'
            END,
            p_reason => BTRIM(p_reason),
            p_actor_id => p_actor_id,
            p_actor_role => COALESCE(NULLIF(p_actor_role, ''), 'unknown'),
            p_metadata => jsonb_build_object(
                'request_id', p_request_id,
                'assignment_id', v_assignment.id,
                'ambulance_id', v_assignment.ambulance_id,
                'disposition', p_disposition
            ),
            p_allow_status_write => true
        );
    END IF;

    UPDATE public.emergency_requests
    SET status = v_next_status,
        ambulance_id = NULL,
        dispatch_organization_id = NULL,
        current_responder_assignment_id = NULL,
        responder_id = NULL,
        responder_name = NULL,
        responder_phone = NULL,
        responder_vehicle_type = NULL,
        responder_vehicle_plate = NULL,
        responder_location = NULL,
        responder_heading = NULL,
        responder_location_accuracy_meters = NULL,
        responder_location_observed_at = NULL,
        responder_location_received_at = NULL,
        responder_telemetry_sequence = NULL,
        responder_telemetry_lease_expires_at = NULL,
        updated_at = NOW()
    WHERE id = p_request_id;

    IF v_was_accepted AND v_request.user_id IS NOT NULL THEN
        PERFORM public.emit_canonical_notification(
            p_event_key => 'emergency_request:' || p_request_id::TEXT
                || ':assignment:' || v_assignment.id::TEXT || ':released',
            p_recipient_user_id => v_request.user_id,
            p_type => 'emergency',
            p_title => 'A new responder is being found',
            p_message => 'Your previous responder is no longer assigned. Dispatch is finding the next available team.',
            p_priority => 'high',
            p_action_type => 'track_emergency',
            p_target_id => p_request_id,
            p_action_data => jsonb_build_object('id', p_request_id, 'requestId', p_request_id),
            p_metadata => jsonb_build_object(
                'eventName', 'emergency_assignment.released',
                'requestId', p_request_id,
                'assignmentId', v_assignment.id,
                'disposition', p_disposition
            ),
            p_icon => 'refresh-outline',
            p_color => 'warning'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'queued', true,
        'request_id', p_request_id,
        'assignment_id', v_assignment.id,
        'disposition', p_disposition,
        'request_status', v_next_status
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.responder_accept_emergency(p_request_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_request public.emergency_requests%ROWTYPE;
    v_assignment public.emergency_responder_assignments%ROWTYPE;
    v_ambulance public.ambulances%ROWTYPE;
    v_profile public.profiles%ROWTYPE;
    v_payment_state JSONB;
    v_readiness JSONB;
    v_updated public.emergency_requests%ROWTYPE;
BEGIN
    SELECT request.* INTO v_request
    FROM public.emergency_requests request
    WHERE request.id = p_request_id
    FOR UPDATE;

    IF NOT FOUND OR v_request.current_responder_assignment_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Current responder offer not found');
    END IF;

    SELECT assignment.* INTO v_assignment
    FROM public.emergency_responder_assignments assignment
    WHERE assignment.id = v_request.current_responder_assignment_id
      AND assignment.emergency_request_id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Current responder offer not found');
    END IF;

    IF NOT v_is_service_role AND v_actor_id IS DISTINCT FROM v_assignment.responder_id THEN
        RAISE EXCEPTION 'Unauthorized: assignment belongs to another responder';
    END IF;

    IF v_assignment.status IN ('accepted', 'arrived', 'completed')
       AND v_request.status IN ('accepted', 'arrived', 'completed') THEN
        RETURN jsonb_build_object('success', true, 'already_accepted', true, 'assignment_id', v_assignment.id);
    END IF;

    IF v_assignment.status <> 'offered' OR v_request.status <> 'in_progress' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Responder offer is no longer accept-ready');
    END IF;

    IF v_assignment.offer_expires_at <= NOW() THEN
        RETURN public.release_current_responder_assignment(
            p_request_id,
            'released',
            'responder_offer_expired',
            COALESCE(v_actor_id, v_assignment.responder_id),
            CASE WHEN v_is_service_role THEN 'service_role' ELSE 'provider' END
        ) || jsonb_build_object(
            'success', false,
            'error', 'Responder offer expired',
            'code', 'OFFER_EXPIRED_REQUEUED'
        );
    END IF;

    v_payment_state := public.emergency_dispatch_payment_snapshot(p_request_id);
    IF COALESCE((v_payment_state->>'ready')::BOOLEAN, false) = false THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment is not dispatch ready', 'payment', v_payment_state);
    END IF;

    SELECT ambulance.* INTO v_ambulance
    FROM public.ambulances ambulance
    WHERE ambulance.id = v_assignment.ambulance_id
      AND ambulance.current_call = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Assigned ambulance no longer owns this call');
    END IF;

    v_readiness := public.ambulance_dispatch_readiness_snapshot(v_assignment.ambulance_id, p_request_id);
    IF COALESCE((v_readiness->>'ready')::BOOLEAN, false) = false THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Responder is no longer dispatch ready',
            'code', 'RESPONDER_NOT_READY',
            'readiness', v_readiness
        );
    END IF;

    SELECT profile.* INTO v_profile
    FROM public.profiles profile
    WHERE profile.id = v_assignment.responder_id;

    PERFORM public.set_emergency_transition_context(
        p_source => 'responder_accept_emergency',
        p_reason => 'responder_accepted_offer',
        p_actor_id => COALESCE(v_actor_id, v_assignment.responder_id),
        p_actor_role => CASE WHEN v_is_service_role THEN 'service_role' ELSE 'provider' END,
        p_metadata => jsonb_build_object('assignment_id', v_assignment.id, 'ambulance_id', v_assignment.ambulance_id),
        p_allow_status_write => true
    );

    UPDATE public.emergency_responder_assignments
    SET status = 'accepted',
        accepted_at = COALESCE(accepted_at, NOW()),
        updated_at = NOW()
    WHERE id = v_assignment.id;

    UPDATE public.ambulances
    SET status = 'on_trip',
        current_call = p_request_id,
        updated_at = NOW()
    WHERE id = v_assignment.ambulance_id;

    UPDATE public.emergency_requests
    SET status = 'accepted',
        ambulance_id = v_assignment.ambulance_id,
        dispatch_organization_id = v_assignment.organization_id,
        responder_id = v_assignment.responder_id,
        responder_name = COALESCE(
            NULLIF(BTRIM(v_profile.full_name), ''),
            NULLIF(BTRIM(v_ambulance.call_sign), ''),
            NULLIF(BTRIM(v_ambulance.vehicle_number), ''),
            'Responder'
        ),
        responder_phone = NULLIF(BTRIM(v_profile.phone), ''),
        responder_vehicle_type = NULLIF(BTRIM(v_ambulance.type), ''),
        responder_vehicle_plate = COALESCE(
            NULLIF(BTRIM(v_ambulance.license_plate), ''),
            NULLIF(BTRIM(v_ambulance.vehicle_number), '')
        ),
        responder_location = v_ambulance.location,
        responder_heading = v_ambulance.heading,
        responder_location_accuracy_meters = v_ambulance.location_accuracy_meters,
        responder_location_observed_at = v_ambulance.location_observed_at,
        responder_location_received_at = v_ambulance.location_received_at,
        responder_telemetry_sequence = v_ambulance.telemetry_sequence,
        responder_telemetry_lease_expires_at = v_ambulance.telemetry_lease_expires_at,
        updated_at = NOW()
    WHERE id = p_request_id
    RETURNING * INTO v_updated;

    IF v_updated.user_id IS NOT NULL THEN
        PERFORM public.emit_canonical_notification(
            p_event_key => 'emergency_request:' || p_request_id::TEXT
                || ':assignment:' || v_assignment.id::TEXT || ':accepted',
            p_recipient_user_id => v_updated.user_id,
            p_type => 'emergency',
            p_title => 'Responder assigned',
            p_message => 'A responder accepted your request and is on the way.',
            p_priority => 'urgent',
            p_action_type => 'track_emergency',
            p_target_id => p_request_id,
            p_action_data => jsonb_build_object(
                'id', p_request_id,
                'requestId', p_request_id,
                'assignmentId', v_assignment.id
            ),
            p_metadata => jsonb_build_object(
                'eventName', 'emergency_assignment.accepted',
                'requestId', p_request_id,
                'assignmentId', v_assignment.id,
                'responderId', v_assignment.responder_id
            ),
            p_icon => 'car-outline',
            p_color => 'success'
        );
    END IF;

    RETURN jsonb_build_object('success', true, 'assignment_id', v_assignment.id, 'request', to_jsonb(v_updated));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.responder_arrive_emergency(p_request_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_request public.emergency_requests%ROWTYPE;
    v_assignment public.emergency_responder_assignments%ROWTYPE;
    v_updated public.emergency_requests%ROWTYPE;
BEGIN
    SELECT request.* INTO v_request
    FROM public.emergency_requests request
    WHERE request.id = p_request_id
    FOR UPDATE;

    IF NOT FOUND OR v_request.current_responder_assignment_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Current responder assignment not found');
    END IF;

    SELECT assignment.* INTO v_assignment
    FROM public.emergency_responder_assignments assignment
    WHERE assignment.id = v_request.current_responder_assignment_id
    FOR UPDATE;

    IF NOT FOUND OR (NOT v_is_service_role AND v_actor_id IS DISTINCT FROM v_assignment.responder_id) THEN
        RAISE EXCEPTION 'Unauthorized: assignment belongs to another responder';
    END IF;

    IF v_assignment.status IN ('arrived', 'completed') AND v_request.status IN ('arrived', 'completed') THEN
        RETURN jsonb_build_object('success', true, 'already_arrived', true, 'assignment_id', v_assignment.id);
    END IF;

    IF v_assignment.status <> 'accepted' OR v_request.status <> 'accepted' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Responder must accept before arrival');
    END IF;

    IF v_request.responder_location IS NULL
       OR v_request.responder_telemetry_lease_expires_at IS NULL
       OR v_request.responder_telemetry_lease_expires_at <= NOW() THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Live responder location is required before arrival',
            'code', 'TELEMETRY_STALE'
        );
    END IF;

    PERFORM public.set_emergency_transition_context(
        p_source => 'responder_arrive_emergency',
        p_reason => 'responder_arrived',
        p_actor_id => COALESCE(v_actor_id, v_assignment.responder_id),
        p_actor_role => CASE WHEN v_is_service_role THEN 'service_role' ELSE 'provider' END,
        p_metadata => jsonb_build_object('assignment_id', v_assignment.id),
        p_allow_status_write => true
    );

    UPDATE public.emergency_responder_assignments
    SET status = 'arrived', arrived_at = COALESCE(arrived_at, NOW()), updated_at = NOW()
    WHERE id = v_assignment.id;

    UPDATE public.emergency_requests
    SET status = 'arrived', updated_at = NOW()
    WHERE id = p_request_id
    RETURNING * INTO v_updated;

    IF v_updated.user_id IS NOT NULL THEN
        PERFORM public.emit_canonical_notification(
            p_event_key => 'emergency_request:' || p_request_id::TEXT
                || ':assignment:' || v_assignment.id::TEXT || ':arrived',
            p_recipient_user_id => v_updated.user_id,
            p_type => 'emergency',
            p_title => 'Responder has arrived',
            p_message => 'Your responder marked the pickup as arrived. Confirm when you can see the team.',
            p_priority => 'urgent',
            p_action_type => 'acknowledge_responder_arrival',
            p_target_id => p_request_id,
            p_action_data => jsonb_build_object(
                'id', p_request_id,
                'requestId', p_request_id,
                'assignmentId', v_assignment.id
            ),
            p_metadata => jsonb_build_object(
                'eventName', 'emergency_assignment.arrived',
                'requestId', p_request_id,
                'assignmentId', v_assignment.id
            ),
            p_icon => 'location-outline',
            p_color => 'success'
        );
    END IF;

    RETURN jsonb_build_object('success', true, 'assignment_id', v_assignment.id, 'request', to_jsonb(v_updated));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.responder_complete_emergency(p_request_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_request public.emergency_requests%ROWTYPE;
    v_assignment public.emergency_responder_assignments%ROWTYPE;
    v_updated public.emergency_requests%ROWTYPE;
BEGIN
    SELECT request.* INTO v_request
    FROM public.emergency_requests request
    WHERE request.id = p_request_id
    FOR UPDATE;

    IF NOT FOUND OR v_request.current_responder_assignment_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Current responder assignment not found');
    END IF;

    SELECT assignment.* INTO v_assignment
    FROM public.emergency_responder_assignments assignment
    WHERE assignment.id = v_request.current_responder_assignment_id
    FOR UPDATE;

    IF NOT FOUND OR (NOT v_is_service_role AND v_actor_id IS DISTINCT FROM v_assignment.responder_id) THEN
        RAISE EXCEPTION 'Unauthorized: assignment belongs to another responder';
    END IF;

    IF v_assignment.status = 'completed' AND v_request.status = 'completed' THEN
        RETURN jsonb_build_object('success', true, 'already_completed', true, 'assignment_id', v_assignment.id);
    END IF;

    IF v_assignment.status <> 'arrived' OR v_request.status <> 'arrived' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Responder must arrive before completion');
    END IF;

    IF v_request.patient_acknowledged_arrival_at IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Patient must confirm arrival before completion',
            'code', 'PATIENT_ARRIVAL_ACK_REQUIRED'
        );
    END IF;

    PERFORM public.set_emergency_transition_context(
        p_source => 'responder_complete_emergency',
        p_reason => 'responder_completed',
        p_actor_id => COALESCE(v_actor_id, v_assignment.responder_id),
        p_actor_role => CASE WHEN v_is_service_role THEN 'service_role' ELSE 'provider' END,
        p_metadata => jsonb_build_object('assignment_id', v_assignment.id),
        p_allow_status_write => true
    );

    UPDATE public.emergency_responder_assignments
    SET status = 'completed',
        completed_at = COALESCE(completed_at, NOW()),
        ended_at = COALESCE(ended_at, NOW()),
        updated_at = NOW()
    WHERE id = v_assignment.id;

    UPDATE public.emergency_requests
    SET status = 'completed',
        completed_at = COALESCE(completed_at, NOW()),
        updated_at = NOW()
    WHERE id = p_request_id
    RETURNING * INTO v_updated;

    UPDATE public.ambulances
    SET status = CASE
            WHEN LOWER(COALESCE(status, '')) IN ('offline', 'maintenance') THEN status
            ELSE 'available'
        END,
        current_call = NULL,
        eta = NULL,
        updated_at = NOW()
    WHERE id = v_assignment.ambulance_id
      AND current_call = p_request_id;

    IF v_updated.user_id IS NOT NULL THEN
        PERFORM public.emit_canonical_notification(
            p_event_key => 'emergency_request:' || p_request_id::TEXT
                || ':assignment:' || v_assignment.id::TEXT || ':completed',
            p_recipient_user_id => v_updated.user_id,
            p_type => 'emergency',
            p_title => 'Emergency visit completed',
            p_message => 'Your responder marked this emergency visit as completed.',
            p_priority => 'high',
            p_action_type => 'view_emergency_visit',
            p_target_id => p_request_id,
            p_action_data => jsonb_build_object(
                'id', p_request_id,
                'requestId', p_request_id,
                'assignmentId', v_assignment.id
            ),
            p_metadata => jsonb_build_object(
                'eventName', 'emergency_assignment.completed',
                'requestId', p_request_id,
                'assignmentId', v_assignment.id
            ),
            p_icon => 'checkmark-circle-outline',
            p_color => 'success'
        );
    END IF;

    RETURN jsonb_build_object('success', true, 'assignment_id', v_assignment.id, 'request', to_jsonb(v_updated));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.responder_decline_emergency(
    p_request_id UUID,
    p_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_assignment public.emergency_responder_assignments%ROWTYPE;
BEGIN
    SELECT assignment.* INTO v_assignment
    FROM public.emergency_requests request
    JOIN public.emergency_responder_assignments assignment
      ON assignment.id = request.current_responder_assignment_id
    WHERE request.id = p_request_id
    FOR UPDATE OF request, assignment;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Current responder offer not found');
    END IF;
    IF v_actor_id IS DISTINCT FROM v_assignment.responder_id THEN
        RAISE EXCEPTION 'Unauthorized: assignment belongs to another responder';
    END IF;

    RETURN public.release_current_responder_assignment(
        p_request_id,
        'declined',
        p_reason,
        v_actor_id,
        'provider'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.dispatcher_release_responder_assignment(
    p_request_id UUID,
    p_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_request_dispatch_org_id UUID;
    v_request_hospital_org_id UUID;
BEGIN
    SELECT actor.role, actor.organization_id
    INTO v_actor_role, v_actor_org_id
    FROM public.profiles actor
    WHERE actor.id = v_actor_id;

    IF v_actor_id IS NULL OR v_actor_role NOT IN ('admin', 'org_admin', 'dispatcher') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT request.dispatch_organization_id, hospital.organization_id
    INTO v_request_dispatch_org_id, v_request_hospital_org_id
    FROM public.emergency_requests request
    LEFT JOIN public.hospitals hospital ON hospital.id = request.hospital_id
    WHERE request.id = p_request_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Emergency request not found');
    END IF;

    IF v_actor_role <> 'admin'
       AND v_actor_org_id IS DISTINCT FROM v_request_dispatch_org_id
       AND v_actor_org_id IS DISTINCT FROM v_request_hospital_org_id THEN
        RAISE EXCEPTION 'Unauthorized: request outside actor organization';
    END IF;

    RETURN public.release_current_responder_assignment(
        p_request_id,
        'released',
        p_reason,
        v_actor_id,
        v_actor_role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.patient_acknowledge_responder_arrival(p_request_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_request public.emergency_requests%ROWTYPE;
BEGIN
    SELECT request.* INTO v_request
    FROM public.emergency_requests request
    WHERE request.id = p_request_id
    FOR UPDATE;

    IF NOT FOUND OR v_request.user_id IS DISTINCT FROM v_actor_id THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;
    IF v_request.status NOT IN ('arrived', 'completed') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Responder arrival has not been confirmed');
    END IF;

    UPDATE public.emergency_requests
    SET patient_acknowledged_arrival_at = COALESCE(patient_acknowledged_arrival_at, NOW()),
        updated_at = CASE
            WHEN patient_acknowledged_arrival_at IS NULL THEN NOW()
            ELSE updated_at
        END
    WHERE id = p_request_id
    RETURNING * INTO v_request;

    IF v_request.responder_id IS NOT NULL THEN
        PERFORM public.emit_canonical_notification(
            p_event_key => 'emergency_request:' || p_request_id::TEXT
                || ':arrival_acknowledged',
            p_recipient_user_id => v_request.responder_id,
            p_type => 'emergency',
            p_title => 'Patient confirmed your arrival',
            p_message => 'The patient confirmed that they can see the responder team.',
            p_priority => 'high',
            p_action_type => 'view_emergency_assignment',
            p_target_id => p_request_id,
            p_action_data => jsonb_build_object('id', p_request_id, 'requestId', p_request_id),
            p_metadata => jsonb_build_object(
                'eventName', 'emergency_request.arrival_acknowledged',
                'requestId', p_request_id,
                'assignmentId', v_request.current_responder_assignment_id
            ),
            p_icon => 'checkmark-circle-outline',
            p_color => 'success'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'acknowledged_at', v_request.patient_acknowledged_arrival_at,
        'request_status', v_request.status
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.release_current_responder_assignment(UUID, TEXT, TEXT, UUID, TEXT)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_current_responder_assignment(UUID, TEXT, TEXT, UUID, TEXT)
    TO service_role;

REVOKE ALL ON FUNCTION public.responder_accept_emergency(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.responder_arrive_emergency(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.responder_complete_emergency(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.responder_decline_emergency(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dispatcher_release_responder_assignment(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.patient_acknowledge_responder_arrival(UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.responder_accept_emergency(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.responder_arrive_emergency(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.responder_complete_emergency(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.responder_decline_emergency(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.dispatcher_release_responder_assignment(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.patient_acknowledge_responder_arrival(UUID) TO authenticated, service_role;
-- END EMERGENCY_RESPONDER_LIFECYCLE_COMMANDS

-- BEGIN EMERGENCY_RESPONDER_TELEMETRY_COMMANDS
CREATE OR REPLACE FUNCTION public.report_responder_telemetry(
    p_payload JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_ambulance_id UUID;
    v_request_id UUID;
    v_assignment_id UUID;
    v_sequence BIGINT;
    v_observed_at TIMESTAMPTZ;
    v_heading DOUBLE PRECISION;
    v_accuracy DOUBLE PRECISION;
    v_location GEOMETRY;
    v_now TIMESTAMPTZ := NOW();
    v_lease_expires_at TIMESTAMPTZ;
    v_ambulance public.ambulances%ROWTYPE;
    v_staffing public.ambulance_staff_assignments%ROWTYPE;
    v_assignment public.emergency_responder_assignments%ROWTYPE;
    v_request public.emergency_requests%ROWTYPE;
BEGIN
    IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid telemetry payload');
    END IF;

    BEGIN
        v_ambulance_id := NULLIF(p_payload->>'ambulance_id', '')::UUID;
        v_request_id := NULLIF(p_payload->>'request_id', '')::UUID;
        v_assignment_id := NULLIF(p_payload->>'assignment_id', '')::UUID;
        v_sequence := NULLIF(p_payload->>'sequence', '')::BIGINT;
        v_observed_at := NULLIF(p_payload->>'observed_at', '')::TIMESTAMPTZ;
        v_heading := NULLIF(p_payload->>'heading', '')::DOUBLE PRECISION;
        v_accuracy := NULLIF(p_payload->>'accuracy_meters', '')::DOUBLE PRECISION;
        v_location := public.jsonb_to_point_geometry(p_payload->'location');
    EXCEPTION
        WHEN invalid_text_representation
          OR invalid_datetime_format
          OR datetime_field_overflow
          OR numeric_value_out_of_range THEN
            RETURN jsonb_build_object('success', false, 'error', 'Invalid telemetry payload');
    END;

    IF v_ambulance_id IS NULL OR v_sequence IS NULL OR v_sequence <= 0
       OR v_observed_at IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid telemetry payload');
    END IF;

    IF v_location IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid telemetry location');
    END IF;

    IF v_observed_at > v_now + INTERVAL '30 seconds'
       OR v_observed_at < v_now - INTERVAL '10 minutes' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Telemetry observation time is outside the accepted window');
    END IF;

    IF v_accuracy IS NOT NULL AND (v_accuracy < 0 OR v_accuracy > 5000) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Telemetry accuracy is outside the accepted range');
    END IF;

    IF v_heading IS NOT NULL THEN
        IF v_heading::TEXT IN ('NaN', 'Infinity', '-Infinity') THEN
            RETURN jsonb_build_object('success', false, 'error', 'Telemetry heading is invalid');
        END IF;
        v_heading := v_heading - FLOOR(v_heading / 360::DOUBLE PRECISION) * 360::DOUBLE PRECISION;
        IF v_heading < 0 THEN
            v_heading := v_heading + 360::DOUBLE PRECISION;
        END IF;
    END IF;

    SELECT ambulance.* INTO v_ambulance
    FROM public.ambulances ambulance
    WHERE ambulance.id = v_ambulance_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ambulance not found');
    END IF;

    SELECT staffing.* INTO v_staffing
    FROM public.ambulance_staff_assignments staffing
    WHERE staffing.ambulance_id = v_ambulance_id
      AND staffing.status = 'active'
      AND staffing.starts_at <= v_now
      AND (staffing.ends_at IS NULL OR staffing.ends_at > v_now)
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ambulance has no active responder staffing');
    END IF;

    IF NOT v_is_service_role AND v_actor_id IS DISTINCT FROM v_staffing.responder_id THEN
        RAISE EXCEPTION 'Unauthorized: telemetry belongs to another responder';
    END IF;

    IF (v_request_id IS NULL) <> (v_assignment_id IS NULL) THEN
        RETURN jsonb_build_object('success', false, 'error', 'request_id and assignment_id must be provided together');
    END IF;

    IF v_assignment_id IS NOT NULL THEN
        SELECT request.* INTO v_request
        FROM public.emergency_requests request
        WHERE request.id = v_request_id
        FOR UPDATE;

        SELECT assignment.* INTO v_assignment
        FROM public.emergency_responder_assignments assignment
        WHERE assignment.id = v_assignment_id
          AND assignment.emergency_request_id = v_request_id
          AND assignment.ambulance_id = v_ambulance_id
          AND assignment.responder_id = v_staffing.responder_id
        FOR UPDATE;

        IF v_request.id IS NULL
           OR v_assignment.id IS NULL
           OR v_request.current_responder_assignment_id IS DISTINCT FROM v_assignment_id
           OR v_assignment.status NOT IN ('offered', 'accepted', 'arrived')
           OR v_ambulance.current_call IS DISTINCT FROM v_request_id THEN
            RETURN jsonb_build_object('success', false, 'error', 'Telemetry assignment generation is no longer current');
        END IF;
    ELSIF v_ambulance.current_call IS NOT NULL
          OR LOWER(COALESCE(v_ambulance.status, '')) <> 'available' THEN
        RETURN jsonb_build_object('success', false, 'error', 'An active call requires assignment-bound telemetry');
    END IF;

    IF v_sequence < COALESCE(v_ambulance.telemetry_sequence, 0) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Telemetry sequence is stale', 'code', 'STALE_SEQUENCE');
    END IF;

    IF v_sequence = COALESCE(v_ambulance.telemetry_sequence, 0) THEN
        IF v_ambulance.location_observed_at = v_observed_at
           AND ST_Equals(v_ambulance.location, v_location) THEN
            RETURN jsonb_build_object(
                'success', true,
                'already_received', true,
                'sequence', v_sequence,
                'received_at', v_ambulance.location_received_at,
                'lease_expires_at', v_ambulance.telemetry_lease_expires_at
            );
        END IF;

        RETURN jsonb_build_object('success', false, 'error', 'Telemetry sequence replay does not match prior payload', 'code', 'SEQUENCE_CONFLICT');
    END IF;

    v_lease_expires_at := v_now + INTERVAL '45 seconds';

    UPDATE public.ambulances
    SET location = v_location,
        heading = v_heading,
        location_accuracy_meters = v_accuracy,
        location_observed_at = v_observed_at,
        location_received_at = v_now,
        telemetry_sequence = v_sequence,
        telemetry_lease_expires_at = v_lease_expires_at,
        updated_at = NOW()
    WHERE id = v_ambulance_id;

    IF v_assignment_id IS NOT NULL THEN
        UPDATE public.emergency_responder_assignments
        SET responder_location = v_location,
            responder_heading = v_heading,
            location_accuracy_meters = v_accuracy,
            location_observed_at = v_observed_at,
            location_received_at = v_now,
            telemetry_sequence = v_sequence,
            telemetry_lease_expires_at = v_lease_expires_at,
            updated_at = NOW()
        WHERE id = v_assignment_id;

        UPDATE public.emergency_requests
        SET responder_location = v_location,
            responder_heading = v_heading,
            responder_location_accuracy_meters = v_accuracy,
            responder_location_observed_at = v_observed_at,
            responder_location_received_at = v_now,
            responder_telemetry_sequence = v_sequence,
            responder_telemetry_lease_expires_at = v_lease_expires_at,
            updated_at = NOW()
        WHERE id = v_request_id
          AND current_responder_assignment_id = v_assignment_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'ambulance_id', v_ambulance_id,
        'request_id', v_request_id,
        'assignment_id', v_assignment_id,
        'sequence', v_sequence,
        'received_at', v_now,
        'lease_expires_at', v_lease_expires_at
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_responder_telemetry_state(p_request_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_request RECORD;
    v_age_seconds DOUBLE PRECISION;
    v_state TEXT := 'lost';
BEGIN
    SELECT role, organization_id
    INTO v_actor_role, v_actor_org_id
    FROM public.profiles
    WHERE id = v_actor_id;

    SELECT
        request.*,
        assignment.responder_id AS assignment_responder_id,
        assignment.organization_id AS assignment_organization_id,
        assignment.status AS assignment_status
    INTO v_request
    FROM public.emergency_requests request
    LEFT JOIN public.emergency_responder_assignments assignment
      ON assignment.id = request.current_responder_assignment_id
    WHERE request.id = p_request_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Emergency request not found');
    END IF;

    IF v_actor_id IS NULL OR NOT (
        public.p_is_admin()
        OR v_request.user_id = v_actor_id
        OR v_request.assignment_responder_id = v_actor_id
        OR (
            v_actor_role IN ('org_admin', 'dispatcher')
            AND v_actor_org_id IS NOT NULL
            AND v_actor_org_id IN (v_request.assignment_organization_id, v_request.dispatch_organization_id)
        )
    ) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    IF v_request.responder_location_received_at IS NOT NULL THEN
        v_age_seconds := EXTRACT(EPOCH FROM (NOW() - v_request.responder_location_received_at));
        v_state := CASE
            WHEN v_request.responder_telemetry_lease_expires_at > NOW() AND v_age_seconds <= 45 THEN 'live'
            WHEN v_age_seconds <= 120 THEN 'delayed'
            ELSE 'lost'
        END;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'state', v_state,
        'last_known', v_request.responder_location IS NOT NULL,
        'lat', CASE WHEN v_request.responder_location IS NULL THEN NULL ELSE ST_Y(v_request.responder_location) END,
        'lng', CASE WHEN v_request.responder_location IS NULL THEN NULL ELSE ST_X(v_request.responder_location) END,
        'heading', v_request.responder_heading,
        'accuracy_meters', v_request.responder_location_accuracy_meters,
        'observed_at', v_request.responder_location_observed_at,
        'received_at', v_request.responder_location_received_at,
        'lease_expires_at', v_request.responder_telemetry_lease_expires_at,
        'sequence', v_request.responder_telemetry_sequence
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_current_emergency_responder(p_request_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_request RECORD;
BEGIN
    SELECT role, organization_id
    INTO v_actor_role, v_actor_org_id
    FROM public.profiles
    WHERE id = v_actor_id;

    SELECT
        request.*,
        assignment.status AS assignment_status,
        assignment.responder_id AS assignment_responder_id,
        assignment.organization_id AS assignment_organization_id
    INTO v_request
    FROM public.emergency_requests request
    LEFT JOIN public.emergency_responder_assignments assignment
      ON assignment.id = request.current_responder_assignment_id
    WHERE request.id = p_request_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Emergency request not found');
    END IF;

    IF v_actor_id IS NULL OR NOT (
        public.p_is_admin()
        OR v_request.user_id = v_actor_id
        OR v_request.assignment_responder_id = v_actor_id
        OR (
            v_actor_role IN ('org_admin', 'dispatcher')
            AND v_actor_org_id IS NOT NULL
            AND v_actor_org_id IN (v_request.assignment_organization_id, v_request.dispatch_organization_id)
        )
    ) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    IF v_request.status NOT IN ('accepted', 'arrived', 'completed')
       OR v_request.assignment_status NOT IN ('accepted', 'arrived', 'completed') THEN
        RETURN jsonb_build_object(
            'success', true,
            'available', false,
            'request_status', v_request.status
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'available', true,
        'request_status', v_request.status,
        'assignment_status', v_request.assignment_status,
        'responder_id', v_request.responder_id,
        'responder_name', v_request.responder_name,
        'responder_phone', v_request.responder_phone,
        'vehicle_type', v_request.responder_vehicle_type,
        'vehicle_plate', v_request.responder_vehicle_plate,
        'patient_acknowledged_arrival_at', v_request.patient_acknowledged_arrival_at
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_driver_dispatch_feed()
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_provider_type TEXT;
    v_items JSONB;
BEGIN
    SELECT role, provider_type
    INTO v_actor_role, v_actor_provider_type
    FROM public.profiles
    WHERE id = v_actor_id;

    IF v_actor_id IS NULL OR v_actor_role <> 'provider' OR v_actor_provider_type <> 'driver' THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT COALESCE(jsonb_agg(item ORDER BY item->>'offered_at' DESC), '[]'::JSONB)
    INTO v_items
    FROM (
        SELECT jsonb_build_object(
            'assignment_id', assignment.id,
            'assignment_status', assignment.status,
            'offer_expires_at', assignment.offer_expires_at,
            'offered_at', assignment.offered_at,
            'request_id', request.id,
            'request_display_id', request.display_id,
            'request_status', request.status,
            'service_type', request.service_type,
            'ambulance_type', request.ambulance_type,
            'hospital_id', request.hospital_id,
            'hospital_name', request.hospital_name,
            'patient_location', CASE
                WHEN request.patient_location IS NULL THEN NULL
                ELSE jsonb_build_object('lat', ST_Y(request.patient_location), 'lng', ST_X(request.patient_location))
            END,
            'ambulance_id', assignment.ambulance_id
        ) AS item
        FROM public.emergency_responder_assignments assignment
        JOIN public.emergency_requests request
          ON request.id = assignment.emergency_request_id
         AND request.current_responder_assignment_id = assignment.id
        WHERE assignment.responder_id = v_actor_id
          AND assignment.status IN ('offered', 'accepted', 'arrived')
          AND (assignment.status <> 'offered' OR assignment.offer_expires_at > NOW())
    ) feed;

    RETURN jsonb_build_object('success', true, 'items', v_items);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.expire_responder_offers(p_limit INTEGER DEFAULT 100)
RETURNS JSONB AS $$
DECLARE
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_is_internal_executor BOOLEAN := session_user IN ('postgres', 'supabase_admin');
    v_offer RECORD;
    v_request RECORD;
    v_retry_result JSONB;
    v_expired INTEGER := 0;
    v_retried INTEGER := 0;
    v_offered INTEGER := 0;
BEGIN
    IF NOT v_is_service_role AND NOT v_is_internal_executor THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    FOR v_offer IN
        SELECT assignment.emergency_request_id
        FROM public.emergency_responder_assignments assignment
        WHERE assignment.status = 'offered'
          AND assignment.offer_expires_at <= NOW()
        ORDER BY assignment.offer_expires_at
        LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500)
        FOR UPDATE SKIP LOCKED
    LOOP
        PERFORM public.release_current_responder_assignment(
            v_offer.emergency_request_id,
            'released',
            'responder_offer_expired',
            NULL,
            'automation'
        );
        v_expired := v_expired + 1;
    END LOOP;

    FOR v_request IN
        SELECT request.id
        FROM public.emergency_requests request
        WHERE request.service_type = 'ambulance'
          AND request.status = 'in_progress'
          AND request.payment_status IN ('paid', 'completed')
          AND request.current_responder_assignment_id IS NULL
          AND request.ambulance_id IS NULL
          AND request.responder_id IS NULL
          AND NOT EXISTS (
              SELECT 1
              FROM public.emergency_responder_assignments assignment
              WHERE assignment.emergency_request_id = request.id
                AND assignment.status IN ('offered', 'accepted', 'arrived')
          )
        ORDER BY request.created_at
        LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500)
        FOR UPDATE OF request SKIP LOCKED
    LOOP
        v_retry_result := public.auto_assign_ambulance(v_request.id, 50, NULL);
        v_retried := v_retried + 1;
        IF COALESCE((v_retry_result->>'success')::BOOLEAN, false)
           AND COALESCE((v_retry_result->>'auto_assigned')::BOOLEAN, false) THEN
            v_offered := v_offered + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'expired', v_expired,
        'retried', v_retried,
        'offered', v_offered
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.report_responder_telemetry(JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_responder_telemetry_state(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_current_emergency_responder(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_driver_dispatch_feed() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.expire_responder_offers(INTEGER) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.report_responder_telemetry(JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_responder_telemetry_state(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_current_emergency_responder(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_driver_dispatch_feed() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.expire_responder_offers(INTEGER) TO service_role;

DO $$
DECLARE
    v_job_exists BOOLEAN := false;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        SELECT EXISTS (
            SELECT 1
            FROM cron.job
            WHERE jobname = 'ivisit-expire-responder-offers'
        ) INTO v_job_exists;

        IF NOT v_job_exists THEN
            PERFORM cron.schedule(
                'ivisit-expire-responder-offers',
                '* * * * *',
                'SELECT public.expire_responder_offers(100);'
            );
        END IF;
    END IF;
END;
$$;
-- END EMERGENCY_RESPONDER_TELEMETRY_COMMANDS

REVOKE ALL ON FUNCTION public.ambulance_dispatch_readiness_snapshot(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.offer_responder_assignment(UUID, UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_ambulance_dispatch_readiness(UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_eligible_ambulance_responders(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.staff_ambulance_responder(UUID, UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.ambulance_dispatch_readiness_snapshot(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.offer_responder_assignment(UUID, UUID, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_ambulance_dispatch_readiness(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_eligible_ambulance_responders(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.staff_ambulance_responder(UUID, UUID) TO authenticated, service_role;
-- END EMERGENCY_RESPONDER_READINESS_RPCS


-- BEGIN CONSOLE_EMERGENCY_CREATE_VISIT_RPC
CREATE OR REPLACE FUNCTION public.console_create_emergency_request(p_payload JSONB)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_is_admin BOOLEAN := public.p_is_admin();
    v_user_id UUID;
    v_hospital_id UUID;
    v_service_type TEXT;
    v_status TEXT;
    v_total_cost NUMERIC;
    v_payment_status TEXT;
    v_patient_snapshot JSONB;
    v_patient_location geometry;
    v_transition_reason TEXT;
    v_request public.emergency_requests%ROWTYPE;
    v_visit public.visits%ROWTYPE;
BEGIN
    SELECT role, organization_id
    INTO v_actor_role, v_actor_org_id
    FROM public.profiles
    WHERE id = v_actor_id;

    IF v_actor_id IS NULL OR v_actor_role NOT IN ('admin', 'org_admin', 'dispatcher') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
        RAISE EXCEPTION 'Payload is required';
    END IF;

    v_user_id := NULLIF(p_payload->>'user_id', '')::UUID;
    v_hospital_id := NULLIF(p_payload->>'hospital_id', '')::UUID;
    v_service_type := LOWER(
        COALESCE(
            NULLIF(p_payload->>'service_type', ''),
            CASE
                WHEN NULLIF(p_payload->>'bed_number', '') IS NOT NULL THEN 'bed'
                ELSE 'ambulance'
            END
        )
    );
    -- Console creation establishes request intent only. Lifecycle and payment
    -- truth must be advanced by their canonical backend receivers.
    v_status := 'pending_approval';
    v_total_cost := COALESCE(NULLIF(p_payload->>'total_cost', '')::NUMERIC, 0);
    v_payment_status := 'pending';
    v_patient_snapshot := COALESCE(
        p_payload->'patient_snapshot',
        CASE
            WHEN NULLIF(p_payload->>'description', '') IS NOT NULL
                THEN jsonb_build_object('description', p_payload->>'description')
            ELSE '{}'::JSONB
        END
    );
    v_patient_location := public.jsonb_to_point_geometry(
        COALESCE(
            p_payload->'patient_location',
            jsonb_build_object(
                'lat', p_payload->>'latitude',
                'lng', p_payload->>'longitude'
            )
        )
    );

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'user_id is required';
    END IF;

    IF v_service_type NOT IN ('ambulance', 'bed', 'booking') THEN
        v_service_type := 'ambulance';
    END IF;

    IF v_status NOT IN ('pending_approval', 'payment_declined', 'in_progress', 'accepted', 'arrived', 'completed', 'cancelled') THEN
        v_status := 'pending_approval';
    END IF;

    IF v_payment_status NOT IN ('pending', 'paid', 'completed', 'failed', 'refunded', 'declined') THEN
        v_payment_status := 'pending';
    END IF;

    v_transition_reason := COALESCE(
        NULLIF(p_payload->>'transition_reason', ''),
        NULLIF(p_payload->>'reason', ''),
        'console_created_emergency'
    );

    PERFORM public.set_emergency_transition_context(
        p_source => 'console_create_emergency_request',
        p_reason => v_transition_reason,
        p_actor_id => v_actor_id,
        p_actor_role => v_actor_role,
        p_metadata =>
        jsonb_build_object(
            'service_type', v_service_type,
            'payment_status', v_payment_status
        ),
        p_allow_status_write => false
    );

    IF NOT v_is_admin THEN
        IF v_hospital_id IS NULL THEN
            RAISE EXCEPTION 'hospital_id is required for org scoped creation';
        END IF;

        IF NOT EXISTS (
            SELECT 1
            FROM public.hospitals h
            WHERE h.id = v_hospital_id
              AND h.organization_id = v_actor_org_id
        ) THEN
            RAISE EXCEPTION 'Unauthorized: hospital out of scope';
        END IF;
    END IF;

    INSERT INTO public.emergency_requests (
        user_id,
        hospital_id,
        status,
        service_type,
        hospital_name,
        specialty,
        ambulance_type,
        bed_number,
        patient_snapshot,
        patient_location,
        total_cost,
        payment_status,
        updated_at
    ) VALUES (
        v_user_id,
        v_hospital_id,
        v_status,
        v_service_type,
        NULLIF(p_payload->>'hospital_name', ''),
        NULLIF(p_payload->>'specialty', ''),
        NULLIF(p_payload->>'ambulance_type', ''),
        NULLIF(p_payload->>'bed_number', ''),
        v_patient_snapshot,
        v_patient_location,
        v_total_cost,
        v_payment_status,
        NOW()
    )
    RETURNING * INTO v_request;

    -- Match the patient create_emergency_v4 contract: request creation is not
    -- successful unless its linked visit evidence is created in the same transaction.
    INSERT INTO public.visits (
        user_id,
        hospital_id,
        request_id,
        status,
        date,
        time,
        type,
        lifecycle_state,
        lifecycle_updated_at
    ) VALUES (
        v_user_id,
        v_hospital_id,
        v_request.id,
        'pending',
        TO_CHAR(NOW(), 'YYYY-MM-DD'),
        TO_CHAR(NOW(), 'HH24:MI:SS'),
        'emergency',
        'initiated',
        NOW()
    )
    RETURNING * INTO v_visit;

    RETURN jsonb_build_object(
        'success', true,
        'request_id', v_request.id,
        'request', to_jsonb(v_request),
        'visit_id', v_visit.id,
        'visit', to_jsonb(v_visit)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- END CONSOLE_EMERGENCY_CREATE_VISIT_RPC


CREATE OR REPLACE FUNCTION public.console_update_emergency_request(p_request_id UUID, p_payload JSONB)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_is_admin BOOLEAN := public.p_is_admin();
    v_request_org_id UUID;
    v_request_dispatch_org_id UUID;
    v_current_status TEXT;
    v_current_service_type TEXT;
    v_hospital_id UUID;
    v_hospital_name TEXT;
    v_requested_service_type TEXT;
    v_updated public.emergency_requests%ROWTYPE;
BEGIN
    IF p_request_id IS NULL THEN
        RAISE EXCEPTION 'request id is required';
    END IF;

    IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
        RAISE EXCEPTION 'A JSON object payload is required';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM jsonb_object_keys(p_payload) AS payload_key(key)
        WHERE payload_key.key <> ALL (ARRAY[
            'hospital_id',
            'hospital_name',
            'service_type',
            'specialty',
            'ambulance_type',
            'bed_number'
        ]::TEXT[])
    ) THEN
        RAISE EXCEPTION 'Unsupported emergency update field';
    END IF;

    SELECT role, organization_id
    INTO v_actor_role, v_actor_org_id
    FROM public.profiles
    WHERE id = v_actor_id;

    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT h.organization_id, er.dispatch_organization_id, er.status, er.service_type
    INTO v_request_org_id, v_request_dispatch_org_id, v_current_status, v_current_service_type
    FROM public.emergency_requests er
    LEFT JOIN public.hospitals h ON h.id = er.hospital_id
    WHERE er.id = p_request_id
    FOR UPDATE OF er;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Emergency request not found';
    END IF;

    IF NOT v_is_admin AND (
        v_actor_role NOT IN ('org_admin', 'dispatcher')
        OR v_actor_org_id IS NULL
        OR (
            v_actor_org_id IS DISTINCT FROM v_request_org_id
            AND v_actor_org_id IS DISTINCT FROM v_request_dispatch_org_id
        )
    ) THEN
        RAISE EXCEPTION 'Unauthorized: emergency out of scope';
    END IF;

    IF v_current_status IN ('completed', 'cancelled', 'payment_declined') THEN
        RAISE EXCEPTION 'Terminal emergency requests are read-only';
    END IF;

    v_hospital_id := NULLIF(p_payload->>'hospital_id', '')::UUID;
    IF v_hospital_id IS NOT NULL THEN
        SELECT hospital.name
        INTO v_hospital_name
        FROM public.hospitals hospital
        WHERE hospital.id = v_hospital_id
          AND (
              v_is_admin
              OR hospital.organization_id = v_actor_org_id
          );

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Target hospital is unavailable or outside actor scope';
        END IF;
    ELSIF p_payload ? 'hospital_name' THEN
        RAISE EXCEPTION 'hospital_name must be derived from hospital_id';
    END IF;

    v_requested_service_type := LOWER(NULLIF(BTRIM(p_payload->>'service_type'), ''));
    IF v_requested_service_type IS NOT NULL
       AND v_requested_service_type NOT IN ('ambulance', 'bed') THEN
        RAISE EXCEPTION 'Invalid emergency service type';
    END IF;
    IF v_requested_service_type IS DISTINCT FROM v_current_service_type
       AND v_requested_service_type IS NOT NULL
       AND v_current_status <> 'pending_approval' THEN
        RAISE EXCEPTION 'Service type cannot change after payment review begins';
    END IF;

    UPDATE public.emergency_requests er
    SET hospital_id = COALESCE(v_hospital_id, er.hospital_id),
        hospital_name = COALESCE(v_hospital_name, er.hospital_name),
        service_type = COALESCE(v_requested_service_type, er.service_type),
        specialty = COALESCE(NULLIF(p_payload->>'specialty', ''), er.specialty),
        ambulance_type = COALESCE(NULLIF(p_payload->>'ambulance_type', ''), er.ambulance_type),
        bed_number = COALESCE(NULLIF(p_payload->>'bed_number', ''), er.bed_number),
        updated_at = NOW()
    WHERE er.id = p_request_id
    RETURNING * INTO v_updated;

    RETURN jsonb_build_object('success', true, 'request', to_jsonb(v_updated));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


CREATE OR REPLACE FUNCTION public.console_accept_bed_emergency(
    p_request_id UUID,
    p_hospital_id UUID DEFAULT NULL,
    p_bed_number TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_is_admin BOOLEAN := public.p_is_admin();
    v_request public.emergency_requests%ROWTYPE;
    v_request_org_id UUID;
    v_target_hospital_id UUID;
    v_target_hospital_name TEXT;
    v_target_hospital_org_id UUID;
    v_payment_state JSONB;
    v_updated public.emergency_requests%ROWTYPE;
BEGIN
    IF p_request_id IS NULL THEN
        RAISE EXCEPTION 'request id is required';
    END IF;

    SELECT profile.role, profile.organization_id
    INTO v_actor_role, v_actor_org_id
    FROM public.profiles profile
    WHERE profile.id = v_actor_id;

    IF NOT v_is_service_role
       AND (v_actor_id IS NULL OR v_actor_role NOT IN ('admin', 'org_admin', 'dispatcher')) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT request.*
    INTO v_request
    FROM public.emergency_requests request
    WHERE request.id = p_request_id
    FOR UPDATE OF request;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Emergency request not found';
    END IF;

    SELECT hospital.organization_id
    INTO v_request_org_id
    FROM public.hospitals hospital
    WHERE hospital.id = v_request.hospital_id;

    IF NOT v_is_service_role AND NOT v_is_admin
       AND (v_actor_org_id IS NULL OR v_request_org_id IS DISTINCT FROM v_actor_org_id) THEN
        RAISE EXCEPTION 'Unauthorized: bed request outside actor organization';
    END IF;
    IF v_request.service_type <> 'bed' THEN
        RAISE EXCEPTION 'Only bed requests can use this command';
    END IF;
    IF v_request.status = 'accepted' THEN
        RETURN jsonb_build_object('success', true, 'already_accepted', true, 'request', to_jsonb(v_request));
    END IF;
    IF v_request.status <> 'in_progress' THEN
        RAISE EXCEPTION 'Bed request is not ready for acceptance';
    END IF;

    v_target_hospital_id := COALESCE(p_hospital_id, v_request.hospital_id);
    SELECT hospital.name, hospital.organization_id
    INTO v_target_hospital_name, v_target_hospital_org_id
    FROM public.hospitals hospital
    WHERE hospital.id = v_target_hospital_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Target hospital not found';
    END IF;
    IF NOT v_is_service_role AND NOT v_is_admin AND (
        v_actor_org_id IS NULL
        OR v_target_hospital_org_id IS DISTINCT FROM v_actor_org_id
    ) THEN
        RAISE EXCEPTION 'Unauthorized: bed request outside actor organization';
    END IF;

    v_payment_state := public.emergency_dispatch_payment_snapshot(p_request_id);
    IF COALESCE((v_payment_state->>'ready')::BOOLEAN, false) = false THEN
        RAISE EXCEPTION 'Cannot accept a bed request before backend payment confirmation';
    END IF;

    PERFORM public.set_emergency_transition_context(
        p_source => 'console_accept_bed_emergency',
        p_reason => 'bed_reservation_accepted',
        p_actor_id => v_actor_id,
        p_actor_role => CASE WHEN v_is_service_role THEN 'service_role' ELSE v_actor_role END,
        p_metadata => jsonb_build_object(
            'request_id', p_request_id,
            'hospital_id', v_target_hospital_id,
            'bed_number', NULLIF(BTRIM(p_bed_number), '')
        ),
        p_allow_status_write => true
    );

    UPDATE public.emergency_requests
    SET hospital_id = v_target_hospital_id,
        hospital_name = v_target_hospital_name,
        bed_number = COALESCE(NULLIF(BTRIM(p_bed_number), ''), bed_number),
        status = 'accepted',
        updated_at = NOW()
    WHERE id = p_request_id
    RETURNING * INTO v_updated;

    IF v_updated.user_id IS NOT NULL THEN
        PERFORM public.emit_canonical_notification(
            p_event_key => 'emergency_request:' || p_request_id::TEXT || ':bed_accepted',
            p_recipient_user_id => v_updated.user_id,
            p_type => 'emergency',
            p_title => 'Bed request accepted',
            p_message => v_target_hospital_name || ' accepted your bed request.',
            p_priority => 'urgent',
            p_action_type => 'view_emergency_request',
            p_target_id => p_request_id,
            p_action_data => jsonb_build_object('id', p_request_id, 'requestId', p_request_id),
            p_metadata => jsonb_build_object(
                'eventName', 'emergency_request.bed_accepted',
                'requestId', p_request_id,
                'hospitalId', v_target_hospital_id,
                'organizationId', v_target_hospital_org_id
            ),
            p_icon => 'bed-outline',
            p_color => 'success'
        );
    END IF;

    RETURN jsonb_build_object('success', true, 'request', to_jsonb(v_updated));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.console_accept_bed_emergency(UUID, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.console_accept_bed_emergency(UUID, UUID, TEXT) TO authenticated, service_role;


CREATE OR REPLACE FUNCTION public.console_dispatch_emergency(
    p_request_id UUID,
    p_ambulance_id UUID,
    p_hospital_id UUID DEFAULT NULL,
    p_hospital_name TEXT DEFAULT NULL,
    p_bed_number TEXT DEFAULT NULL,
    p_responder_name TEXT DEFAULT NULL,
    p_responder_phone TEXT DEFAULT NULL,
    p_responder_vehicle_type TEXT DEFAULT NULL,
    p_responder_vehicle_plate TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_is_admin BOOLEAN := public.p_is_admin();
    v_req_status TEXT;
    v_req_payment_status TEXT;
    v_req_hospital_id UUID;
    v_req_org_id UUID;
    v_req_current_ambulance_id UUID;
    v_amb_status TEXT;
    v_amb_hospital_id UUID;
    v_amb_org_id UUID;
    v_amb_profile_id UUID;
    v_amb_current_call UUID;
    v_driver_name TEXT;
    v_driver_phone TEXT;
    v_amb_type TEXT;
    v_amb_plate TEXT;
    v_effective_hospital_id UUID;
    v_effective_hospital_name TEXT;
    v_updated public.emergency_requests%ROWTYPE;
    v_payment_state JSONB;
    v_offer_result JSONB;
BEGIN
    IF p_request_id IS NULL OR p_ambulance_id IS NULL THEN
        RAISE EXCEPTION 'request id and ambulance id are required';
    END IF;

    SELECT role, organization_id
    INTO v_actor_role, v_actor_org_id
    FROM public.profiles
    WHERE id = v_actor_id;

    IF v_actor_id IS NULL OR v_actor_role NOT IN ('admin', 'org_admin', 'dispatcher') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT er.status, er.payment_status, er.hospital_id,
           COALESCE(er.dispatch_organization_id, h.organization_id), er.ambulance_id
    INTO v_req_status, v_req_payment_status, v_req_hospital_id, v_req_org_id, v_req_current_ambulance_id
    FROM public.emergency_requests er
    LEFT JOIN public.hospitals h ON h.id = er.hospital_id
    WHERE er.id = p_request_id
    FOR UPDATE OF er;

    v_req_status := public.canonicalize_emergency_status(v_req_status, v_req_status);
    v_req_payment_status := LOWER(COALESCE(v_req_payment_status, 'pending'));
    IF v_req_status IS NULL THEN
        RAISE EXCEPTION 'Emergency request not found';
    END IF;

    IF v_req_status IN ('completed', 'cancelled', 'payment_declined') THEN
        RAISE EXCEPTION 'Cannot dispatch a terminal emergency request';
    END IF;

    IF v_req_status <> 'in_progress' THEN
        RAISE EXCEPTION 'Request is not awaiting a responder offer';
    END IF;

    v_payment_state := public.emergency_dispatch_payment_snapshot(p_request_id);
    IF COALESCE((v_payment_state->>'ready')::BOOLEAN, false) = false THEN
        RAISE EXCEPTION 'Cannot dispatch before backend payment confirmation';
    END IF;

    SELECT a.status, a.hospital_id, COALESCE(a.organization_id, h.organization_id),
           a.profile_id, a.current_call, a.type, a.vehicle_number, p.full_name, p.phone
    INTO v_amb_status, v_amb_hospital_id, v_amb_org_id, v_amb_profile_id, v_amb_current_call, v_amb_type, v_amb_plate, v_driver_name, v_driver_phone
    FROM public.ambulances a
    LEFT JOIN public.hospitals h ON h.id = a.hospital_id
    LEFT JOIN public.profiles p ON p.id = a.profile_id
    WHERE a.id = p_ambulance_id
    FOR UPDATE OF a;

    IF v_amb_status IS NULL THEN
        RAISE EXCEPTION 'Ambulance not found';
    END IF;

    IF v_amb_status NOT IN ('available', 'dispatched') THEN
        RAISE EXCEPTION 'Ambulance is not dispatchable';
    END IF;

    IF v_amb_status = 'dispatched' AND v_amb_current_call IS DISTINCT FROM p_request_id THEN
        RAISE EXCEPTION 'Ambulance is currently assigned to another request';
    END IF;

    IF NOT v_is_admin THEN
        IF v_actor_org_id IS NULL OR v_req_org_id IS DISTINCT FROM v_actor_org_id OR v_amb_org_id IS DISTINCT FROM v_actor_org_id THEN
            RAISE EXCEPTION 'Unauthorized: dispatch scope violation';
        END IF;
    END IF;

    v_effective_hospital_id := COALESCE(p_hospital_id, v_req_hospital_id, v_amb_hospital_id);
    v_effective_hospital_name := p_hospital_name;
    IF v_effective_hospital_name IS NULL AND v_effective_hospital_id IS NOT NULL THEN
        SELECT name INTO v_effective_hospital_name FROM public.hospitals WHERE id = v_effective_hospital_id;
    END IF;

    IF NOT v_is_admin AND v_effective_hospital_id IS NOT NULL AND NOT EXISTS (
        SELECT 1
        FROM public.hospitals hospital
        WHERE hospital.id = v_effective_hospital_id
          AND hospital.organization_id = v_actor_org_id
    ) THEN
        RAISE EXCEPTION 'Unauthorized: target hospital outside actor organization';
    END IF;

    UPDATE public.emergency_requests er
    SET hospital_id = COALESCE(v_effective_hospital_id, er.hospital_id),
        hospital_name = COALESCE(v_effective_hospital_name, er.hospital_name),
        bed_number = COALESCE(NULLIF(p_bed_number, ''), er.bed_number),
        updated_at = NOW()
    WHERE er.id = p_request_id;

    v_offer_result := public.offer_responder_assignment(
        p_request_id,
        p_ambulance_id,
        v_actor_id,
        'console_dispatch_emergency'
    );

    IF COALESCE((v_offer_result->>'success')::BOOLEAN, false) = false THEN
        RETURN v_offer_result;
    END IF;

    SELECT * INTO v_updated
    FROM public.emergency_requests
    WHERE id = p_request_id;

    RETURN v_offer_result || jsonb_build_object('request', to_jsonb(v_updated));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION public.console_complete_emergency(p_request_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_is_admin BOOLEAN := public.p_is_admin();
    v_req_org_id UUID;
    v_req_dispatch_org_id UUID;
    v_req_responder_id UUID;
    v_service_type TEXT;
    v_status TEXT;
    v_updated public.emergency_requests%ROWTYPE;
BEGIN
    IF p_request_id IS NULL THEN
        RAISE EXCEPTION 'request id is required';
    END IF;

    SELECT role, organization_id
    INTO v_actor_role, v_actor_org_id
    FROM public.profiles
    WHERE id = v_actor_id;

    IF NOT v_is_service_role AND v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT h.organization_id, er.dispatch_organization_id, er.responder_id, er.service_type, er.status
    INTO v_req_org_id, v_req_dispatch_org_id, v_req_responder_id, v_service_type, v_status
    FROM public.emergency_requests er
    LEFT JOIN public.hospitals h ON h.id = er.hospital_id
    WHERE er.id = p_request_id
    FOR UPDATE OF er;

    v_status := public.canonicalize_emergency_status(v_status, v_status);
    IF v_status IS NULL THEN
        RAISE EXCEPTION 'Emergency request not found';
    END IF;

    IF NOT v_is_service_role AND v_actor_role = 'provider' THEN
        IF v_service_type <> 'ambulance' OR v_req_responder_id IS DISTINCT FROM v_actor_id THEN
            RAISE EXCEPTION 'Unauthorized: emergency not assigned to provider';
        END IF;
        RETURN public.responder_complete_emergency(p_request_id);
    END IF;

    IF NOT v_is_service_role AND NOT v_is_admin AND (
        v_actor_role NOT IN ('org_admin', 'dispatcher')
        OR v_actor_org_id IS NULL
        OR (
            v_actor_org_id IS DISTINCT FROM v_req_org_id
            AND v_actor_org_id IS DISTINCT FROM v_req_dispatch_org_id
        )
    ) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    IF v_service_type = 'ambulance' THEN
        IF v_is_service_role THEN
            RETURN public.responder_complete_emergency(p_request_id);
        END IF;
        RAISE EXCEPTION 'The assigned responder must complete an ambulance request';
    END IF;
    IF v_service_type <> 'bed' THEN
        RAISE EXCEPTION 'Unsupported emergency service type';
    END IF;

    IF v_status = 'completed' THEN
        RETURN jsonb_build_object('success', true, 'already_completed', true);
    END IF;

    IF v_status IN ('cancelled', 'payment_declined') THEN
        RAISE EXCEPTION 'Cannot complete terminal cancelled/declined request';
    END IF;

    IF NOT public.is_valid_emergency_status_transition(v_status, 'completed') THEN
        RAISE EXCEPTION 'Illegal emergency status transition: % -> completed', v_status;
    END IF;

    PERFORM public.set_emergency_transition_context(
        p_source => 'console_complete_emergency',
        p_reason => 'console_complete',
        p_actor_id => v_actor_id,
        p_actor_role => CASE WHEN v_is_service_role THEN 'service_role' ELSE v_actor_role END,
        p_metadata => jsonb_build_object(
            'request_id', p_request_id,
            'previous_status', v_status
        ),
        p_allow_status_write => true
    );

    UPDATE public.emergency_requests
    SET status = 'completed',
        completed_at = COALESCE(completed_at, NOW()),
        updated_at = NOW()
    WHERE id = p_request_id
    RETURNING * INTO v_updated;

    IF v_updated.user_id IS NOT NULL THEN
        PERFORM public.emit_canonical_notification(
            p_event_key => 'emergency_request:' || p_request_id::TEXT || ':bed_completed',
            p_recipient_user_id => v_updated.user_id,
            p_type => 'emergency',
            p_title => 'Bed visit completed',
            p_message => 'Your hospital marked this bed visit as completed.',
            p_priority => 'high',
            p_action_type => 'view_emergency_visit',
            p_target_id => p_request_id,
            p_action_data => jsonb_build_object('id', p_request_id, 'requestId', p_request_id),
            p_metadata => jsonb_build_object(
                'eventName', 'emergency_request.bed_completed',
                'requestId', p_request_id
            ),
            p_icon => 'checkmark-circle-outline',
            p_color => 'success'
        );
    END IF;

    RETURN jsonb_build_object('success', true, 'request', to_jsonb(v_updated));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


CREATE OR REPLACE FUNCTION public.console_cancel_emergency(p_request_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_is_admin BOOLEAN := public.p_is_admin();
    v_req_org_id UUID;
    v_req_dispatch_org_id UUID;
    v_ambulance_id UUID;
    v_assignment_id UUID;
    v_responder_id UUID;
    v_status TEXT;
    v_updated public.emergency_requests%ROWTYPE;
BEGIN
    IF p_request_id IS NULL THEN
        RAISE EXCEPTION 'request id is required';
    END IF;

    SELECT role, organization_id
    INTO v_actor_role, v_actor_org_id
    FROM public.profiles
    WHERE id = v_actor_id;

    IF v_actor_id IS NULL AND NOT v_is_service_role THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT h.organization_id, er.dispatch_organization_id, er.ambulance_id,
           er.current_responder_assignment_id, er.responder_id, er.status
    INTO v_req_org_id, v_req_dispatch_org_id, v_ambulance_id, v_assignment_id, v_responder_id, v_status
    FROM public.emergency_requests er
    LEFT JOIN public.hospitals h ON h.id = er.hospital_id
    WHERE er.id = p_request_id
    FOR UPDATE OF er;

    v_status := public.canonicalize_emergency_status(v_status, v_status);
    IF v_status IS NULL THEN
        RAISE EXCEPTION 'Emergency request not found';
    END IF;

    IF NOT v_is_service_role AND NOT v_is_admin AND (
        v_actor_role NOT IN ('org_admin', 'dispatcher')
        OR v_actor_org_id IS NULL
        OR (
            v_actor_org_id IS DISTINCT FROM v_req_org_id
            AND v_actor_org_id IS DISTINCT FROM v_req_dispatch_org_id
        )
    ) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    IF v_status = 'cancelled' THEN
        RETURN jsonb_build_object('success', true, 'already_cancelled', true);
    END IF;

    IF v_status = 'completed' THEN
        RAISE EXCEPTION 'Cannot cancel completed request';
    END IF;

    IF NOT public.is_valid_emergency_status_transition(v_status, 'cancelled') THEN
        RAISE EXCEPTION 'Illegal emergency status transition: % -> cancelled', v_status;
    END IF;

    PERFORM public.set_emergency_transition_context(
        p_source => 'console_cancel_emergency',
        p_reason => COALESCE(NULLIF(p_reason, ''), 'console_cancel'),
        p_actor_id => v_actor_id,
        p_actor_role => CASE WHEN v_is_service_role THEN 'service_role' ELSE v_actor_role END,
        p_metadata => jsonb_build_object(
            'request_id', p_request_id,
            'previous_status', v_status
        ),
        p_allow_status_write => true
    );

    IF v_assignment_id IS NOT NULL THEN
        UPDATE public.emergency_responder_assignments
        SET status = 'cancelled',
            decline_reason = COALESCE(NULLIF(BTRIM(p_reason), ''), 'request_cancelled'),
            ended_at = COALESCE(ended_at, NOW()),
            metadata = metadata || jsonb_build_object(
                'cancelled_by', v_actor_id,
                'cancelled_by_role', CASE WHEN v_is_service_role THEN 'service_role' ELSE v_actor_role END
            ),
            updated_at = NOW()
        WHERE id = v_assignment_id
          AND emergency_request_id = p_request_id
          AND status IN ('offered', 'accepted', 'arrived');
    END IF;

    UPDATE public.emergency_requests
    SET status = 'cancelled',
        cancelled_at = COALESCE(cancelled_at, NOW()),
        ambulance_id = NULL,
        dispatch_organization_id = NULL,
        current_responder_assignment_id = NULL,
        responder_id = NULL,
        responder_name = NULL,
        responder_phone = NULL,
        responder_vehicle_type = NULL,
        responder_vehicle_plate = NULL,
        responder_location = NULL,
        responder_heading = NULL,
        responder_location_accuracy_meters = NULL,
        responder_location_observed_at = NULL,
        responder_location_received_at = NULL,
        responder_telemetry_sequence = NULL,
        responder_telemetry_lease_expires_at = NULL,
        updated_at = NOW()
    WHERE id = p_request_id
    RETURNING * INTO v_updated;

    IF v_ambulance_id IS NOT NULL THEN
        UPDATE public.ambulances
        SET status = CASE
                WHEN LOWER(COALESCE(status, '')) IN ('offline', 'maintenance') THEN status
                ELSE 'available'
            END,
            current_call = NULL,
            eta = NULL,
            updated_at = NOW()
        WHERE id = v_ambulance_id
          AND current_call = p_request_id;
    END IF;

    IF v_updated.user_id IS NOT NULL THEN
        PERFORM public.emit_canonical_notification(
            p_event_key => 'emergency_request:' || p_request_id::TEXT || ':cancelled_by_operator',
            p_recipient_user_id => v_updated.user_id,
            p_type => 'emergency',
            p_title => 'Emergency request cancelled',
            p_message => 'The care team cancelled this emergency request. Open the request for the latest details.',
            p_priority => 'urgent',
            p_action_type => 'view_emergency_request',
            p_target_id => p_request_id,
            p_action_data => jsonb_build_object('id', p_request_id, 'requestId', p_request_id),
            p_metadata => jsonb_build_object(
                'eventName', 'emergency_request.cancelled_by_operator',
                'requestId', p_request_id,
                'reason', NULLIF(BTRIM(p_reason), '')
            ),
            p_icon => 'close-circle-outline',
            p_color => 'danger'
        );
    END IF;

    IF v_responder_id IS NOT NULL THEN
        PERFORM public.emit_canonical_notification(
            p_event_key => 'emergency_request:' || p_request_id::TEXT
                || ':assignment:' || COALESCE(v_assignment_id::TEXT, 'none') || ':cancelled_by_operator',
            p_recipient_user_id => v_responder_id,
            p_type => 'emergency',
            p_title => 'Emergency assignment cancelled',
            p_message => 'Dispatch cancelled this emergency assignment.',
            p_priority => 'urgent',
            p_action_type => 'view_emergency_assignment',
            p_target_id => p_request_id,
            p_action_data => jsonb_build_object('id', p_request_id, 'requestId', p_request_id),
            p_metadata => jsonb_build_object(
                'eventName', 'emergency_assignment.cancelled_by_operator',
                'requestId', p_request_id,
                'assignmentId', v_assignment_id
            ),
            p_icon => 'close-circle-outline',
            p_color => 'danger'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'reason', p_reason,
        'request', to_jsonb(v_updated)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


CREATE OR REPLACE FUNCTION public.console_update_responder_location(
    p_request_id UUID,
    p_location JSONB,
    p_heading DOUBLE PRECISION DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_req_status TEXT;
    v_assignment_id UUID;
    v_assignment_responder_id UUID;
    v_ambulance_id UUID;
    v_sequence BIGINT;
    v_result JSONB;
BEGIN
    IF p_request_id IS NULL THEN
        RAISE EXCEPTION 'request id is required';
    END IF;
    IF v_actor_id IS NULL AND NOT v_is_service_role THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT public.canonicalize_emergency_status(er.status, er.status),
           assignment.id, assignment.responder_id, assignment.ambulance_id,
           COALESCE(ambulance.telemetry_sequence, 0) + 1
    INTO v_req_status, v_assignment_id, v_assignment_responder_id, v_ambulance_id, v_sequence
    FROM public.emergency_requests er
    JOIN public.emergency_responder_assignments assignment
      ON assignment.id = er.current_responder_assignment_id
     AND assignment.emergency_request_id = er.id
     AND assignment.status IN ('offered', 'accepted', 'arrived')
    JOIN public.ambulances ambulance
      ON ambulance.id = assignment.ambulance_id
    WHERE er.id = p_request_id
    FOR UPDATE OF er, assignment, ambulance;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cannot update responder location before dispatch';
    END IF;
    IF v_req_status NOT IN ('in_progress', 'accepted', 'arrived') THEN
        RAISE EXCEPTION 'Cannot update responder location for an inactive emergency';
    END IF;
    IF NOT v_is_service_role AND v_assignment_responder_id IS DISTINCT FROM v_actor_id THEN
        RAISE EXCEPTION 'Unauthorized: assignment belongs to another responder';
    END IF;

    v_result := public.report_responder_telemetry(
        jsonb_build_object(
            'ambulance_id', v_ambulance_id,
            'request_id', p_request_id,
            'assignment_id', v_assignment_id,
            'sequence', v_sequence,
            'observed_at', NOW(),
            'location', p_location,
            'heading', p_heading
        )
    );

    RETURN v_result || jsonb_build_object('compatibility_command', 'console_update_responder_location');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


CREATE OR REPLACE FUNCTION public.patient_update_emergency_request(
    p_request_id UUID,
    p_payload JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_owner_id UUID;
    v_current_status TEXT;
    v_next_status TEXT;
    v_ambulance_id UUID;
    v_assignment_id UUID;
    v_responder_id UUID;
    v_patient_location geometry;
    v_triage_snapshot JSONB;
    v_updated public.emergency_requests%ROWTYPE;
BEGIN
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    IF p_request_id IS NULL THEN
        RAISE EXCEPTION 'request id is required';
    END IF;

    IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
        RAISE EXCEPTION 'A JSON object payload is required';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM jsonb_object_keys(p_payload) AS payload_key(key)
        WHERE payload_key.key <> ALL (ARRAY[
            'status',
            'transition_reason',
            'reason',
            'patient_location',
            'triage_snapshot',
            'triage'
        ]::TEXT[])
    ) THEN
        RAISE EXCEPTION 'Unsupported patient emergency update field';
    END IF;

    SELECT er.user_id, er.status, er.ambulance_id, er.current_responder_assignment_id, er.responder_id
    INTO v_owner_id, v_current_status, v_ambulance_id, v_assignment_id, v_responder_id
    FROM public.emergency_requests er
    WHERE er.id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Emergency request not found';
    END IF;

    IF v_owner_id IS DISTINCT FROM v_actor_id THEN
        RAISE EXCEPTION 'Unauthorized: emergency request does not belong to user';
    END IF;

    v_next_status := public.canonicalize_emergency_status(
        p_payload->>'status',
        NULL
    );
    IF v_next_status IS NOT NULL AND v_next_status <> 'cancelled' THEN
        RAISE EXCEPTION 'Patients may only cancel their emergency request';
    END IF;
    IF v_next_status = 'cancelled'
       AND NOT public.is_valid_emergency_status_transition(v_current_status, 'cancelled') THEN
        RAISE EXCEPTION 'Illegal emergency status transition: % -> cancelled', v_current_status;
    END IF;

    IF v_current_status = 'cancelled' AND v_next_status = 'cancelled' THEN
        SELECT request.* INTO v_updated
        FROM public.emergency_requests request
        WHERE request.id = p_request_id;
        RETURN jsonb_build_object('success', true, 'already_cancelled', true, 'request', to_jsonb(v_updated));
    END IF;

    IF v_current_status IN ('completed', 'cancelled', 'payment_declined') THEN
        RAISE EXCEPTION 'Terminal emergency requests are read-only';
    END IF;

    IF v_next_status = 'cancelled' THEN
        PERFORM public.set_emergency_transition_context(
            p_source => 'patient_update_emergency_request',
            p_reason => COALESCE(NULLIF(p_payload->>'transition_reason', ''), NULLIF(p_payload->>'reason', ''), 'patient_cancelled'),
            p_actor_id => v_actor_id,
            p_actor_role => 'patient',
            p_metadata => jsonb_build_object(
                'request_id', p_request_id,
                'current_status', v_current_status,
                'requested_status', v_next_status
            ),
            p_allow_status_write => true
        );
    END IF;

    IF p_payload ? 'patient_location' THEN
        v_patient_location := public.jsonb_to_point_geometry(p_payload->'patient_location');
        IF v_patient_location IS NULL THEN
            RAISE EXCEPTION 'Invalid patient location payload';
        END IF;
    END IF;

    IF p_payload ? 'triage_snapshot' THEN
        v_triage_snapshot := p_payload->'triage_snapshot';
    ELSIF p_payload ? 'triage' THEN
        v_triage_snapshot := p_payload->'triage';
    END IF;

    IF v_triage_snapshot IS NOT NULL AND jsonb_typeof(v_triage_snapshot) <> 'object' THEN
        RAISE EXCEPTION 'Invalid triage snapshot payload';
    END IF;

    IF v_next_status = 'cancelled' THEN
        IF v_assignment_id IS NOT NULL THEN
            UPDATE public.emergency_responder_assignments
            SET status = 'cancelled',
                decline_reason = COALESCE(NULLIF(BTRIM(p_payload->>'reason'), ''), 'patient_cancelled'),
                ended_at = COALESCE(ended_at, NOW()),
                metadata = metadata || jsonb_build_object('cancelled_by', v_actor_id, 'cancelled_by_role', 'patient'),
                updated_at = NOW()
            WHERE id = v_assignment_id
              AND emergency_request_id = p_request_id
              AND status IN ('offered', 'accepted', 'arrived');
        END IF;

        UPDATE public.emergency_requests er
        SET patient_location = COALESCE(v_patient_location, er.patient_location),
            patient_snapshot = CASE
                WHEN v_triage_snapshot IS NULL THEN er.patient_snapshot
                ELSE jsonb_set(COALESCE(er.patient_snapshot, '{}'::JSONB), '{triage}', v_triage_snapshot, true)
            END,
            status = 'cancelled',
            cancelled_at = COALESCE(er.cancelled_at, NOW()),
            ambulance_id = NULL,
            dispatch_organization_id = NULL,
            current_responder_assignment_id = NULL,
            responder_id = NULL,
            responder_name = NULL,
            responder_phone = NULL,
            responder_vehicle_type = NULL,
            responder_vehicle_plate = NULL,
            responder_location = NULL,
            responder_heading = NULL,
            responder_location_accuracy_meters = NULL,
            responder_location_observed_at = NULL,
            responder_location_received_at = NULL,
            responder_telemetry_sequence = NULL,
            responder_telemetry_lease_expires_at = NULL,
            updated_at = NOW()
        WHERE er.id = p_request_id
        RETURNING * INTO v_updated;

        IF v_ambulance_id IS NOT NULL THEN
            UPDATE public.ambulances
            SET status = CASE
                    WHEN LOWER(COALESCE(status, '')) IN ('offline', 'maintenance') THEN status
                    ELSE 'available'
                END,
                current_call = NULL,
                eta = NULL,
                updated_at = NOW()
            WHERE id = v_ambulance_id
              AND current_call = p_request_id;
        END IF;

        IF v_responder_id IS NOT NULL THEN
            PERFORM public.emit_canonical_notification(
                p_event_key => 'emergency_request:' || p_request_id::TEXT
                    || ':assignment:' || COALESCE(v_assignment_id::TEXT, 'none') || ':cancelled_by_patient',
                p_recipient_user_id => v_responder_id,
                p_type => 'emergency',
                p_title => 'Patient cancelled the emergency',
                p_message => 'The patient cancelled this emergency assignment.',
                p_priority => 'urgent',
                p_action_type => 'view_emergency_assignment',
                p_target_id => p_request_id,
                p_action_data => jsonb_build_object('id', p_request_id, 'requestId', p_request_id),
                p_metadata => jsonb_build_object(
                    'eventName', 'emergency_assignment.cancelled_by_patient',
                    'requestId', p_request_id,
                    'assignmentId', v_assignment_id
                ),
                p_icon => 'close-circle-outline',
                p_color => 'danger'
            );
        END IF;
    ELSE
        UPDATE public.emergency_requests er
        SET patient_location = COALESCE(v_patient_location, er.patient_location),
            patient_snapshot = CASE
                WHEN v_triage_snapshot IS NULL THEN er.patient_snapshot
                ELSE jsonb_set(COALESCE(er.patient_snapshot, '{}'::JSONB), '{triage}', v_triage_snapshot, true)
            END,
            updated_at = NOW()
        WHERE er.id = p_request_id
        RETURNING * INTO v_updated;
    END IF;

    RETURN jsonb_build_object('success', true, 'request', to_jsonb(v_updated));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.assign_ambulance_to_emergency(
    p_emergency_request_id UUID,
    p_ambulance_id UUID,
    p_priority INTEGER DEFAULT 1
)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_is_internal_executor BOOLEAN := session_user IN ('postgres', 'supabase_admin');
    v_is_admin BOOLEAN := public.p_is_admin();
    v_req_status TEXT;
    v_req_hospital_id UUID;
    v_req_org_id UUID;
    v_req_current_ambulance_id UUID;
    v_amb_status TEXT;
    v_amb_hospital_id UUID;
    v_amb_org_id UUID;
    v_amb_profile_id UUID;
    v_amb_current_call UUID;
    v_amb_type TEXT;
    v_amb_plate TEXT;
    v_driver_name TEXT;
    v_driver_phone TEXT;
    v_transition_source TEXT := COALESCE(
        NULLIF(current_setting('ivisit.transition_source', true), ''),
        'assign_ambulance_to_emergency'
    );
    v_transition_reason TEXT := COALESCE(
        NULLIF(current_setting('ivisit.transition_reason', true), ''),
        'manual_ambulance_assignment'
    );
    v_transition_metadata JSONB := COALESCE(
        NULLIF(current_setting('ivisit.transition_metadata', true), '')::JSONB,
        '{}'::JSONB
    );
    v_updated public.emergency_requests%ROWTYPE;
    v_offer_result JSONB;
BEGIN
    IF p_emergency_request_id IS NULL OR p_ambulance_id IS NULL THEN
        RAISE EXCEPTION 'emergency request id and ambulance id are required';
    END IF;

    SELECT role, organization_id
    INTO v_actor_role, v_actor_org_id
    FROM public.profiles
    WHERE id = v_actor_id;

    IF NOT v_is_service_role AND NOT v_is_internal_executor AND v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT er.status, er.hospital_id,
           COALESCE(er.dispatch_organization_id, h.organization_id), er.ambulance_id
    INTO v_req_status, v_req_hospital_id, v_req_org_id, v_req_current_ambulance_id
    FROM public.emergency_requests er
    LEFT JOIN public.hospitals h ON h.id = er.hospital_id
    WHERE er.id = p_emergency_request_id
    FOR UPDATE OF er;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Emergency request not found',
            'code', 'REQUEST_NOT_FOUND'
        );
    END IF;

    v_req_status := public.canonicalize_emergency_status(v_req_status, v_req_status);

    IF v_req_status IN ('completed', 'cancelled', 'payment_declined') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Cannot assign ambulance to terminal emergency request',
            'code', 'REQUEST_TERMINAL'
        );
    END IF;

    IF v_req_status <> 'in_progress' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Request is not awaiting a responder offer',
            'code', 'INVALID_TRANSITION',
            'from_status', v_req_status,
            'to_status', 'offered'
        );
    END IF;

    SELECT a.status, a.hospital_id, COALESCE(a.organization_id, h.organization_id),
           a.profile_id, a.current_call, a.type, a.vehicle_number, p.full_name, p.phone
    INTO v_amb_status, v_amb_hospital_id, v_amb_org_id, v_amb_profile_id, v_amb_current_call, v_amb_type, v_amb_plate, v_driver_name, v_driver_phone
    FROM public.ambulances a
    LEFT JOIN public.hospitals h ON h.id = a.hospital_id
    LEFT JOIN public.profiles p ON p.id = a.profile_id
    WHERE a.id = p_ambulance_id
    FOR UPDATE OF a;

    IF v_amb_status IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Ambulance not found',
            'code', 'AMBULANCE_NOT_FOUND'
        );
    END IF;

    v_amb_status := LOWER(COALESCE(v_amb_status, ''));
    IF v_amb_status <> 'available' THEN
        IF v_amb_current_call IS NULL OR v_amb_current_call IS DISTINCT FROM p_emergency_request_id THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Ambulance not available',
                'code', 'AMBULANCE_UNAVAILABLE',
                'current_status', v_amb_status
            );
        END IF;
    END IF;

    IF NOT v_is_service_role AND NOT v_is_internal_executor AND NOT v_is_admin THEN
        IF v_actor_role NOT IN ('org_admin', 'dispatcher') THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;

        IF v_actor_org_id IS NULL THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;

        IF v_req_org_id IS NULL OR v_actor_org_id IS DISTINCT FROM v_req_org_id THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;

        IF v_amb_org_id IS NULL OR v_actor_org_id IS DISTINCT FROM v_amb_org_id THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;
    END IF;

    v_offer_result := public.offer_responder_assignment(
        p_emergency_request_id,
        p_ambulance_id,
        v_actor_id,
        v_transition_source
    );

    IF COALESCE((v_offer_result->>'success')::BOOLEAN, false) = false THEN
        RETURN v_offer_result;
    END IF;

    SELECT * INTO v_updated
    FROM public.emergency_requests
    WHERE id = p_emergency_request_id;

    RETURN v_offer_result || jsonb_build_object(
        'request', to_jsonb(v_updated),
        'priority', p_priority
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.auto_assign_ambulance(
    p_emergency_request_id UUID,
    p_max_distance_km INTEGER DEFAULT 50,
    p_specialty_required TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_request_location geometry;
    v_max_distance_m DOUBLE PRECISION := GREATEST(COALESCE(p_max_distance_km, 50), 1) * 1000.0;
    v_best_ambulance_id UUID;
    v_best_distance_m DOUBLE PRECISION;
    v_assignment_result JSONB;
BEGIN
    IF p_emergency_request_id IS NULL THEN
        RAISE EXCEPTION 'emergency request id is required';
    END IF;

    SELECT er.patient_location
    INTO v_request_location
    FROM public.emergency_requests er
    WHERE er.id = p_emergency_request_id
    FOR UPDATE OF er;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Emergency request not found',
            'code', 'REQUEST_NOT_FOUND'
        );
    END IF;

    PERFORM set_config('ivisit.transition_source', 'auto_assign_ambulance', true);
    PERFORM set_config('ivisit.transition_reason', 'auto_ambulance_assignment', true);
    PERFORM set_config(
        'ivisit.transition_metadata',
        jsonb_build_object(
            'request_id', p_emergency_request_id,
            'max_distance_km', p_max_distance_km,
            'specialty_required', p_specialty_required
        )::TEXT,
        true
    );

    SELECT a.id,
           ST_Distance(a.location::GEOGRAPHY, v_request_location::GEOGRAPHY)
    INTO v_best_ambulance_id, v_best_distance_m
    FROM public.ambulances a
    WHERE a.status = 'available'
      AND a.current_call IS NULL
      AND a.profile_id IS NOT NULL
      AND COALESCE(
            (public.ambulance_dispatch_readiness_snapshot(a.id, p_emergency_request_id)->>'ready')::BOOLEAN,
            false
      )
      AND NOT EXISTS (
            SELECT 1
            FROM public.emergency_responder_assignments previous
            WHERE previous.emergency_request_id = p_emergency_request_id
              AND previous.ambulance_id = a.id
              AND previous.status IN ('declined', 'released')
      )
      AND (
            p_specialty_required IS NULL
            OR COALESCE(a.type, '') ILIKE '%' || p_specialty_required || '%'
            OR COALESCE(a.call_sign, '') ILIKE '%' || p_specialty_required || '%'
      )
      AND (
            v_request_location IS NULL
            OR a.location IS NULL
            OR ST_DWithin(a.location::GEOGRAPHY, v_request_location::GEOGRAPHY, v_max_distance_m)
      )
    ORDER BY
        COALESCE(ST_Distance(a.location::GEOGRAPHY, v_request_location::GEOGRAPHY), 1000000000),
        a.updated_at ASC
    LIMIT 1
    FOR UPDATE OF a SKIP LOCKED;

    IF v_best_ambulance_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No available ambulances found',
            'code', 'NO_AMBULANCE_AVAILABLE',
            'auto_assigned', false
        );
    END IF;

    SELECT public.assign_ambulance_to_emergency(
        p_emergency_request_id,
        v_best_ambulance_id,
        1
    ) INTO v_assignment_result;

    IF COALESCE((v_assignment_result->>'success')::BOOLEAN, false) = false THEN
        RETURN v_assignment_result || jsonb_build_object('auto_assigned', false);
    END IF;

    RETURN v_assignment_result || jsonb_build_object(
        'auto_assigned', true,
        'distance_km', CASE
            WHEN v_best_distance_m IS NULL THEN NULL
            ELSE ROUND((v_best_distance_m / 1000.0)::NUMERIC, 3)
        END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Demo-only settlement receiver. It preserves the same payment-to-dispatch
-- lifecycle handoff as cash approval without posting a fee or touching wallets.
CREATE OR REPLACE FUNCTION public.approve_demo_cash_payment(
    p_payment_id UUID,
    p_request_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_payment RECORD;
    v_request RECORD;
BEGIN
    IF NOT v_is_service_role THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT p.*
    INTO v_payment
    FROM public.payments p
    WHERE p.id = p_payment_id
      AND p.emergency_request_id = p_request_id
    FOR UPDATE;

    IF v_payment.id IS NULL OR COALESCE(v_payment.payment_method, '') <> 'cash' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Demo cash payment/request pair not found');
    END IF;

    SELECT er.*, h.place_id, h.verification_status, h.features
    INTO v_request
    FROM public.emergency_requests er
    INNER JOIN public.hospitals h ON h.id = er.hospital_id
    WHERE er.id = p_request_id
    FOR UPDATE OF er;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Demo emergency request not found');
    END IF;

    IF NOT (
        COALESCE(v_request.place_id, '') ILIKE 'demo:%'
        OR COALESCE(v_request.verification_status, '') ILIKE 'demo%'
        OR COALESCE(v_request.features, ARRAY[]::TEXT[]) && ARRAY['demo_seed', 'demo_verified', 'demo_complete', 'ivisit_demo']::TEXT[]
        OR EXISTS (
            SELECT 1
            FROM unnest(COALESCE(v_request.features, ARRAY[]::TEXT[])) feature
            WHERE feature ILIKE 'demo_scope:%' OR feature ILIKE 'demo_owner:%'
        )
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Demo settlement is only available for demo hospitals');
    END IF;

    IF COALESCE(v_payment.status, '') = 'completed'
       AND COALESCE(v_request.payment_status, '') IN ('paid', 'completed') THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_completed', true,
            'demo', true,
            'settlement', 'simulated',
            'payment_id', p_payment_id,
            'request_id', p_request_id
        );
    END IF;

    IF COALESCE(v_payment.status, '') <> 'pending'
       OR public.canonicalize_emergency_status(v_request.status, v_request.status) <> 'pending_approval'
       OR COALESCE(v_request.payment_status, 'pending') NOT IN ('pending', 'requires_approval') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Demo cash payment is not awaiting approval');
    END IF;

    PERFORM public.set_emergency_transition_context(
        p_source => 'approve_demo_cash_payment',
        p_reason => 'demo_cash_payment_auto_approved',
        p_actor_id => NULL,
        p_actor_role => 'service_role',
        p_metadata => jsonb_build_object(
            'payment_id', p_payment_id,
            'request_id', p_request_id,
            'demo', true,
            'settlement', 'simulated'
        ),
        p_allow_status_write => true
    );

    UPDATE public.payments
    SET status = 'completed',
        processed_at = NOW(),
        ivisit_fee_amount = 0,
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
            'source', 'approve_demo_cash_payment',
            'demo', true,
            'settlement', 'simulated',
            'original_fee_amount', COALESCE(v_payment.ivisit_fee_amount, 0),
            'fee_amount', 0,
            'fee', 0
        ),
        updated_at = NOW()
    WHERE id = p_payment_id;

    UPDATE public.emergency_requests
    SET status = 'in_progress',
        payment_status = 'completed',
        updated_at = NOW()
    WHERE id = p_request_id;

    RETURN jsonb_build_object(
        'success', true,
        'demo', true,
        'settlement', 'simulated',
        'fee_deducted', 0,
        'new_balance', NULL,
        'payment_id', p_payment_id,
        'request_id', p_request_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.approve_cash_payment(
    p_payment_id UUID,
    p_request_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_payment RECORD;
    v_request_org_id UUID;
    v_request_status TEXT;
    v_request_payment_status TEXT;
    v_request_service_type TEXT;
    v_org_wallet_id UUID;
    v_org_balance NUMERIC;
    v_platform_wallet_id UUID;
    v_org_ledger_id UUID;
    v_platform_ledger_id UUID;
    v_fee_amount NUMERIC;
    v_fee_percentage NUMERIC;
    v_assigned_ambulance_id UUID;
    v_responder_name TEXT;
    v_responder_phone TEXT;
    v_responder_vehicle_type TEXT;
    v_responder_vehicle_plate TEXT;
BEGIN
    SELECT
        p.*,
        NULLIF((p.metadata->>'fee_amount')::NUMERIC, 0) AS calculated_fee,
        NULLIF((p.metadata->>'fee')::NUMERIC, 0) AS legacy_calculated_fee
    INTO v_payment
    FROM public.payments p
    WHERE p.id = p_payment_id
      AND p.emergency_request_id = p_request_id
    FOR UPDATE;

    IF v_payment.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment/request pair not found');
    END IF;

    IF COALESCE(v_payment.payment_method, '') <> 'cash' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment is not a cash payment');
    END IF;

    SELECT er.service_type, h.organization_id, er.status, er.payment_status
    INTO v_request_service_type, v_request_org_id, v_request_status, v_request_payment_status
    FROM public.emergency_requests er
    LEFT JOIN public.hospitals h ON h.id = er.hospital_id
    WHERE er.id = p_request_id
    FOR UPDATE OF er;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Emergency request not found');
    END IF;

    v_request_status := public.canonicalize_emergency_status(v_request_status, v_request_status);

    IF v_payment.organization_id IS DISTINCT FROM v_request_org_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment/request organization mismatch');
    END IF;

    IF NOT v_is_service_role THEN
        IF v_actor_id IS NULL THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;

        SELECT role, organization_id
        INTO v_actor_role, v_actor_org_id
        FROM public.profiles
        WHERE id = v_actor_id;

        IF v_actor_role NOT IN ('admin', 'org_admin', 'dispatcher') THEN
            RAISE EXCEPTION 'Unauthorized: insufficient role for cash approval';
        END IF;

        IF v_actor_role IN ('org_admin', 'dispatcher') THEN
            IF v_actor_org_id IS NULL OR v_actor_org_id IS DISTINCT FROM v_request_org_id THEN
                RAISE EXCEPTION 'Unauthorized: request outside actor organization';
            END IF;
        END IF;
    END IF;

    IF COALESCE(v_payment.status, '') = 'completed'
       AND COALESCE(v_request_payment_status, '') IN ('paid', 'completed') THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_completed', true,
            'payment_id', p_payment_id,
            'request_id', p_request_id,
            'request_status', v_request_status
        );
    END IF;

    IF COALESCE(v_payment.status, '') <> 'pending' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Cash payment is not pending approval',
            'payment_status', v_payment.status
        );
    END IF;

    IF v_request_status <> 'pending_approval' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Request is not awaiting cash approval',
            'request_status', v_request_status
        );
    END IF;

    IF COALESCE(v_request_payment_status, 'pending') NOT IN ('pending', 'requires_approval') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Request payment is not in a pending approval state',
            'payment_status', v_request_payment_status
        );
    END IF;

    IF NOT public.is_valid_emergency_status_transition(v_request_status, 'in_progress') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Illegal emergency status transition',
            'from_status', v_request_status,
            'to_status', 'in_progress'
        );
    END IF;

    PERFORM public.set_emergency_transition_context(
        p_source => 'approve_cash_payment',
        p_reason => 'cash_payment_approved',
        p_actor_id => v_actor_id,
        p_actor_role => CASE
            WHEN v_is_service_role THEN 'service_role'
            ELSE COALESCE(v_actor_role, 'unknown')
        END,
        p_metadata => jsonb_build_object(
            'payment_id', p_payment_id,
            'request_id', p_request_id,
            'previous_status', v_request_status,
            'service_type', v_request_service_type
        ),
        p_allow_status_write => true
    );

    SELECT id, balance INTO v_org_wallet_id, v_org_balance
    FROM public.organization_wallets
    WHERE organization_id = v_payment.organization_id
    FOR UPDATE;

    IF v_org_wallet_id IS NULL AND v_payment.organization_id IS NOT NULL THEN
        INSERT INTO public.organization_wallets (organization_id, balance)
        VALUES (v_payment.organization_id, 0)
        RETURNING id, balance INTO v_org_wallet_id, v_org_balance;
    END IF;

    SELECT id INTO v_platform_wallet_id FROM public.ivisit_main_wallet LIMIT 1 FOR UPDATE;

    IF v_platform_wallet_id IS NULL THEN
        INSERT INTO public.ivisit_main_wallet (balance, currency, last_updated)
        VALUES (0, COALESCE(NULLIF(v_payment.currency, ''), 'USD'), NOW())
        RETURNING id INTO v_platform_wallet_id;
    END IF;

    SELECT ivisit_fee_percentage
    INTO v_fee_percentage
    FROM public.organizations
    WHERE id = v_request_org_id;

    v_fee_amount := COALESCE(
        NULLIF(v_payment.ivisit_fee_amount, 0),
        v_payment.calculated_fee,
        v_payment.legacy_calculated_fee,
        ROUND(COALESCE(v_payment.amount, 0) * (COALESCE(v_fee_percentage, 2.5) / 100.0), 2),
        0
    );

    IF v_fee_amount > 0 THEN
        IF v_org_balance < v_fee_amount THEN
            RETURN jsonb_build_object('success', false, 'error', 'Organization balance insufficient for platform fee');
        END IF;

        INSERT INTO public.wallet_ledger (
            wallet_id, amount, transaction_type, description, reference_id,
            idempotency_key, metadata
        ) VALUES (
            v_org_wallet_id, -v_fee_amount, 'debit',
            'iVisit Platform Fee (Cash Payment)', p_payment_id,
            'payment:' || p_payment_id::TEXT || ':cash_org_fee_debit',
            jsonb_build_object('source', 'approve_cash_payment')
        )
        ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
        RETURNING id INTO v_org_ledger_id;

        INSERT INTO public.wallet_ledger (
            wallet_id, amount, transaction_type, description, reference_id,
            idempotency_key, metadata
        ) VALUES (
            v_platform_wallet_id, v_fee_amount, 'credit',
            'Platform Fee (Cash Payment)', p_payment_id,
            'payment:' || p_payment_id::TEXT || ':cash_platform_fee_credit',
            jsonb_build_object('source', 'approve_cash_payment')
        )
        ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
        RETURNING id INTO v_platform_ledger_id;

        IF v_org_ledger_id IS NULL OR v_platform_ledger_id IS NULL THEN
            RAISE EXCEPTION 'Cash settlement retry state is inconsistent';
        END IF;

        UPDATE public.organization_wallets
        SET balance = balance - v_fee_amount,
            updated_at = NOW()
        WHERE id = v_org_wallet_id;

        UPDATE public.ivisit_main_wallet
        SET balance = balance + v_fee_amount,
            last_updated = NOW()
        WHERE id = v_platform_wallet_id;
    END IF;

    UPDATE public.payments
    SET status = 'completed',
        processed_at = NOW(),
        ivisit_fee_amount = v_fee_amount,
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
            'source', 'approve_cash_payment',
            'fee_amount', v_fee_amount,
            'fee', v_fee_amount
        ),
        updated_at = NOW()
    WHERE id = p_payment_id;

    UPDATE public.emergency_requests
    SET status = 'in_progress',
        payment_status = 'completed',
        updated_at = NOW()
    WHERE id = p_request_id;

    IF v_request_service_type = 'ambulance'
       AND EXISTS (
            SELECT 1
            FROM public.emergency_requests request
            WHERE request.id = p_request_id
              AND request.status IN ('accepted', 'arrived')
       ) THEN
        UPDATE public.emergency_requests er
        SET responder_id = COALESCE(er.responder_id, a.profile_id),
            responder_name = COALESCE(
                NULLIF(BTRIM(er.responder_name), ''),
                NULLIF(BTRIM(p.full_name), ''),
                NULLIF(BTRIM(a.call_sign), ''),
                NULLIF(BTRIM(a.vehicle_number), ''),
                NULLIF(BTRIM(a.type), ''),
                'Responder'
            ),
            responder_phone = COALESCE(
                NULLIF(BTRIM(er.responder_phone), ''),
                NULLIF(BTRIM(p.phone), '')
            ),
            responder_vehicle_type = COALESCE(
                NULLIF(BTRIM(er.responder_vehicle_type), ''),
                NULLIF(BTRIM(a.type), '')
            ),
            responder_vehicle_plate = COALESCE(
                NULLIF(BTRIM(er.responder_vehicle_plate), ''),
                NULLIF(BTRIM(a.license_plate), ''),
                NULLIF(BTRIM(a.vehicle_number), '')
            ),
            updated_at = NOW()
        FROM public.ambulances a
        LEFT JOIN public.profiles p ON p.id = a.profile_id
        WHERE er.id = p_request_id
          AND er.ambulance_id = a.id;
    END IF;

    SELECT ambulance_id, responder_name, responder_phone, responder_vehicle_type, responder_vehicle_plate
    INTO v_assigned_ambulance_id, v_responder_name, v_responder_phone, v_responder_vehicle_type, v_responder_vehicle_plate
    FROM public.emergency_requests
    WHERE id = p_request_id;

    RETURN jsonb_build_object(
        'success', true,
        'fee_deducted', v_fee_amount,
        'new_balance', COALESCE((v_org_balance - v_fee_amount), 0),
        'ambulance_id', v_assigned_ambulance_id,
        'responder_name', v_responder_name,
        'responder_phone', v_responder_phone,
        'responder_vehicle_type', v_responder_vehicle_type,
        'responder_vehicle_plate', v_responder_vehicle_plate
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.decline_cash_payment(
    p_payment_id UUID,
    p_request_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_payment RECORD;
    v_request_org_id UUID;
    v_request_status TEXT;
    v_request_payment_status TEXT;
BEGIN
    SELECT p.*
    INTO v_payment
    FROM public.payments p
    WHERE p.id = p_payment_id
      AND p.emergency_request_id = p_request_id
    FOR UPDATE;

    IF v_payment.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment/request pair not found');
    END IF;

    IF COALESCE(v_payment.payment_method, '') <> 'cash' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment is not a cash payment');
    END IF;

    SELECT h.organization_id, er.status, er.payment_status
    INTO v_request_org_id, v_request_status, v_request_payment_status
    FROM public.emergency_requests er
    LEFT JOIN public.hospitals h ON h.id = er.hospital_id
    WHERE er.id = p_request_id
    FOR UPDATE OF er;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Emergency request not found');
    END IF;

    v_request_status := public.canonicalize_emergency_status(v_request_status, v_request_status);

    IF v_payment.organization_id IS DISTINCT FROM v_request_org_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment/request organization mismatch');
    END IF;

    IF NOT v_is_service_role THEN
        IF v_actor_id IS NULL THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;

        SELECT role, organization_id
        INTO v_actor_role, v_actor_org_id
        FROM public.profiles
        WHERE id = v_actor_id;

        IF v_actor_role NOT IN ('admin', 'org_admin', 'dispatcher') THEN
            RAISE EXCEPTION 'Unauthorized: insufficient role for cash decline';
        END IF;

        IF v_actor_role IN ('org_admin', 'dispatcher') THEN
            IF v_actor_org_id IS NULL OR v_actor_org_id IS DISTINCT FROM v_request_org_id THEN
                RAISE EXCEPTION 'Unauthorized: request outside actor organization';
            END IF;
        END IF;
    END IF;

    IF v_payment.status IN ('failed', 'declined')
       AND v_request_status = 'payment_declined'
       AND v_request_payment_status IN ('failed', 'declined') THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_declined', true,
            'payment_id', p_payment_id,
            'request_id', p_request_id
        );
    END IF;

    IF v_payment.status <> 'pending' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Cash payment is not pending approval',
            'payment_status', v_payment.status
        );
    END IF;

    IF v_request_status <> 'pending_approval' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Request is not awaiting cash approval',
            'request_status', v_request_status
        );
    END IF;

    IF COALESCE(v_request_payment_status, 'pending') <> 'pending' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Request payment is not in a pending approval state',
            'payment_status', v_request_payment_status
        );
    END IF;

    IF NOT public.is_valid_emergency_status_transition(v_request_status, 'payment_declined') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Illegal emergency status transition',
            'from_status', v_request_status,
            'to_status', 'payment_declined'
        );
    END IF;

    PERFORM public.set_emergency_transition_context(
        p_source => 'decline_cash_payment',
        p_reason => 'cash_payment_declined',
        p_actor_id => v_actor_id,
        p_actor_role => CASE
            WHEN v_is_service_role THEN 'service_role'
            ELSE COALESCE(v_actor_role, 'unknown')
        END,
        p_metadata => jsonb_build_object(
            'payment_id', p_payment_id,
            'request_id', p_request_id,
            'previous_status', v_request_status
        ),
        p_allow_status_write => true
    );

    UPDATE public.payments
    SET status = 'failed',
        updated_at = NOW()
    WHERE id = p_payment_id;

    UPDATE public.emergency_requests
    SET status = 'payment_declined',
        payment_status = 'failed',
        updated_at = NOW()
    WHERE id = p_request_id;

    RETURN jsonb_build_object('success', true, 'status', 'declined');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.discharge_patient(request_uuid TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_request_id UUID;
    v_request_org_id UUID;
    v_service_type TEXT;
    v_current_status TEXT;
BEGIN
    IF request_uuid IS NULL OR BTRIM(request_uuid) = '' THEN
        RETURN FALSE;
    END IF;

    IF request_uuid ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
        v_request_id := request_uuid::UUID;
    ELSE
        v_request_id := public.get_entity_id(request_uuid);
    END IF;

    IF v_request_id IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT h.organization_id, er.service_type, er.status
    INTO v_request_org_id, v_service_type, v_current_status
    FROM public.emergency_requests er
    LEFT JOIN public.hospitals h ON h.id = er.hospital_id
    WHERE er.id = v_request_id
    FOR UPDATE OF er;

    IF NOT FOUND OR v_service_type IS DISTINCT FROM 'bed' THEN
        RETURN FALSE;
    END IF;

    v_current_status := public.canonicalize_emergency_status(v_current_status, v_current_status);
    IF v_current_status = 'completed' THEN
        RETURN TRUE;
    END IF;

    IF NOT v_is_service_role THEN
        IF v_actor_id IS NULL THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;

        SELECT role, organization_id
        INTO v_actor_role, v_actor_org_id
        FROM public.profiles
        WHERE id = v_actor_id;

        IF v_actor_role NOT IN ('admin', 'org_admin', 'dispatcher') THEN
            RAISE EXCEPTION 'Unauthorized: insufficient role for bed discharge';
        END IF;

        IF v_actor_role IN ('org_admin', 'dispatcher')
           AND (v_actor_org_id IS NULL OR v_actor_org_id IS DISTINCT FROM v_request_org_id) THEN
            RAISE EXCEPTION 'Unauthorized: request outside actor organization';
        END IF;
    END IF;

    IF NOT public.is_valid_emergency_status_transition(v_current_status, 'completed') THEN
        RAISE EXCEPTION 'Illegal emergency status transition: % -> completed', v_current_status;
    END IF;

    PERFORM public.set_emergency_transition_context(
        p_source => 'discharge_patient',
        p_reason => 'patient_discharged',
        p_actor_id => v_actor_id,
        p_actor_role => CASE
            WHEN v_is_service_role THEN 'service_role'
            ELSE COALESCE(v_actor_role, 'unknown')
        END,
        p_metadata => jsonb_build_object(
            'request_id', v_request_id,
            'service_type', v_service_type,
            'previous_status', v_current_status
        ),
        p_allow_status_write => true
    );

    UPDATE public.emergency_requests
    SET status = 'completed',
        updated_at = NOW()
    WHERE id = v_request_id
      AND service_type = 'bed';

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.cancel_bed_reservation(request_uuid TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_request_id UUID;
    v_request_org_id UUID;
    v_service_type TEXT;
    v_current_status TEXT;
BEGIN
    IF request_uuid IS NULL OR BTRIM(request_uuid) = '' THEN
        RETURN FALSE;
    END IF;

    IF request_uuid ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
        v_request_id := request_uuid::UUID;
    ELSE
        v_request_id := public.get_entity_id(request_uuid);
    END IF;

    IF v_request_id IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT h.organization_id, er.service_type, er.status
    INTO v_request_org_id, v_service_type, v_current_status
    FROM public.emergency_requests er
    LEFT JOIN public.hospitals h ON h.id = er.hospital_id
    WHERE er.id = v_request_id
    FOR UPDATE OF er;

    IF NOT FOUND OR v_service_type IS DISTINCT FROM 'bed' THEN
        RETURN FALSE;
    END IF;

    v_current_status := public.canonicalize_emergency_status(v_current_status, v_current_status);
    IF v_current_status = 'cancelled' THEN
        RETURN TRUE;
    END IF;

    IF v_current_status = 'completed' THEN
        RAISE EXCEPTION 'Cannot cancel completed bed reservation';
    END IF;

    IF NOT v_is_service_role THEN
        IF v_actor_id IS NULL THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;

        SELECT role, organization_id
        INTO v_actor_role, v_actor_org_id
        FROM public.profiles
        WHERE id = v_actor_id;

        IF v_actor_role NOT IN ('admin', 'org_admin', 'dispatcher') THEN
            RAISE EXCEPTION 'Unauthorized: insufficient role for bed cancel';
        END IF;

        IF v_actor_role IN ('org_admin', 'dispatcher')
           AND (v_actor_org_id IS NULL OR v_actor_org_id IS DISTINCT FROM v_request_org_id) THEN
            RAISE EXCEPTION 'Unauthorized: request outside actor organization';
        END IF;
    END IF;

    IF NOT public.is_valid_emergency_status_transition(v_current_status, 'cancelled') THEN
        RAISE EXCEPTION 'Illegal emergency status transition: % -> cancelled', v_current_status;
    END IF;

    PERFORM public.set_emergency_transition_context(
        p_source => 'cancel_bed_reservation',
        p_reason => 'bed_reservation_cancelled',
        p_actor_id => v_actor_id,
        p_actor_role => CASE
            WHEN v_is_service_role THEN 'service_role'
            ELSE COALESCE(v_actor_role, 'unknown')
        END,
        p_metadata => jsonb_build_object(
            'request_id', v_request_id,
            'service_type', v_service_type,
            'previous_status', v_current_status
        ),
        p_allow_status_write => true
    );

    UPDATE public.emergency_requests
    SET status = 'cancelled',
        updated_at = NOW()
    WHERE id = v_request_id
      AND service_type = 'bed';

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Legacy trip aliases remain for deployed clients, but lifecycle authority is
-- delegated to the canonical responder/console commands above.
CREATE OR REPLACE FUNCTION public.complete_trip(request_uuid TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_request_id UUID;
    v_result JSONB;
BEGIN
    IF request_uuid IS NULL OR BTRIM(request_uuid) = '' THEN
        RETURN FALSE;
    END IF;

    IF request_uuid ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
        v_request_id := request_uuid::UUID;
    ELSE
        v_request_id := public.get_entity_id(request_uuid);
    END IF;

    IF v_request_id IS NULL THEN
        RETURN FALSE;
    END IF;

    v_result := public.console_complete_emergency(v_request_id);
    RETURN COALESCE((v_result->>'success')::BOOLEAN, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.cancel_trip(request_uuid TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_request_id UUID;
    v_result JSONB;
BEGIN
    IF request_uuid IS NULL OR BTRIM(request_uuid) = '' THEN
        RETURN FALSE;
    END IF;

    IF request_uuid ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
        v_request_id := request_uuid::UUID;
    ELSE
        v_request_id := public.get_entity_id(request_uuid);
    END IF;

    IF v_request_id IS NULL THEN
        RETURN FALSE;
    END IF;

    v_result := public.console_cancel_emergency(v_request_id, 'legacy_cancel_trip');
    RETURN COALESCE((v_result->>'success')::BOOLEAN, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


CREATE OR REPLACE FUNCTION public.ensure_emergency_chat_room(p_request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_request RECORD;
    v_room public.emergency_chat_rooms%ROWTYPE;
BEGIN
    IF p_request_id IS NULL THEN
        RAISE EXCEPTION 'request_id is required';
    END IF;

    SELECT er.*, h.organization_id AS request_org_id, v.id AS visit_id
    INTO v_request
    FROM public.emergency_requests er
    LEFT JOIN public.hospitals h ON h.id = er.hospital_id
    LEFT JOIN public.visits v ON v.request_id = er.id
    WHERE er.id = p_request_id
    ORDER BY v.created_at DESC
    LIMIT 1
    FOR UPDATE OF er;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Emergency request not found';
    END IF;

    IF NOT v_is_service_role THEN
        IF v_actor_id IS NULL THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;

        SELECT role, organization_id
        INTO v_actor_role, v_actor_org_id
        FROM public.profiles
        WHERE id = v_actor_id;

        IF NOT (
            v_actor_id = v_request.user_id
            OR v_actor_id = v_request.responder_id
            OR v_actor_role = 'admin'
            OR (
                v_actor_role IN ('org_admin', 'dispatcher', 'provider')
                AND v_actor_org_id IS NOT NULL
                AND v_request.request_org_id IS NOT NULL
                AND v_actor_org_id = v_request.request_org_id
            )
        ) THEN
            RAISE EXCEPTION 'Unauthorized: request outside actor scope';
        END IF;
    END IF;

    INSERT INTO public.emergency_chat_rooms (
        emergency_request_id,
        visit_id,
        created_by
    )
    VALUES (
        p_request_id,
        v_request.visit_id,
        v_actor_id
    )
    ON CONFLICT (emergency_request_id) DO UPDATE
    SET visit_id = COALESCE(EXCLUDED.visit_id, public.emergency_chat_rooms.visit_id)
    RETURNING * INTO v_room;

    UPDATE public.emergency_requests
    SET communication_room_id = v_room.id,
        updated_at = NOW()
    WHERE id = p_request_id
      AND communication_room_id IS DISTINCT FROM v_room.id;

    IF v_request.user_id IS NOT NULL THEN
        INSERT INTO public.emergency_chat_participants (
            room_id,
            user_id,
            role,
            display_name_snapshot
        )
        SELECT
            v_room.id,
            p.id,
            'patient',
            COALESCE(
                NULLIF(BTRIM(p.full_name), ''),
                NULLIF(BTRIM(CONCAT_WS(' ', NULLIF(p.first_name, ''), NULLIF(p.last_name, ''))), ''),
                NULLIF(BTRIM(p.email), ''),
                NULLIF(BTRIM(p.phone), '')
            )
        FROM public.profiles p
        WHERE p.id = v_request.user_id
        ON CONFLICT (room_id, user_id) DO UPDATE
        SET left_at = NULL,
            updated_at = NOW();
    END IF;

    IF v_request.responder_id IS NOT NULL
       AND v_request.responder_id IS DISTINCT FROM v_request.user_id THEN
        INSERT INTO public.emergency_chat_participants (
            room_id,
            user_id,
            role,
            display_name_snapshot
        )
        SELECT
            v_room.id,
            p.id,
            CASE WHEN v_request.service_type = 'ambulance' THEN 'driver' ELSE 'provider' END,
            COALESCE(
                NULLIF(BTRIM(p.full_name), ''),
                NULLIF(BTRIM(CONCAT_WS(' ', NULLIF(p.first_name, ''), NULLIF(p.last_name, ''))), ''),
                NULLIF(BTRIM(p.email), ''),
                NULLIF(BTRIM(p.phone), '')
            )
        FROM public.profiles p
        WHERE p.id = v_request.responder_id
        ON CONFLICT (room_id, user_id) DO UPDATE
        SET left_at = NULL,
            updated_at = NOW();
    END IF;

    RETURN jsonb_build_object(
        'room',
        to_jsonb(v_room),
        'participants',
        (
            SELECT COALESCE(jsonb_agg(to_jsonb(ecp) ORDER BY ecp.joined_at), '[]'::jsonb)
            FROM public.emergency_chat_participants ecp
            WHERE ecp.room_id = v_room.id
        )
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.send_emergency_chat_message(
    p_room_id UUID,
    p_body TEXT,
    p_kind TEXT DEFAULT 'text',
    p_client_message_id TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_kind TEXT := COALESCE(NULLIF(BTRIM(p_kind), ''), 'text');
    v_body TEXT := BTRIM(COALESCE(p_body, ''));
    v_sender_role TEXT;
    v_profile RECORD;
    v_room_status TEXT;
    v_message public.emergency_chat_messages%ROWTYPE;
BEGIN
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    IF p_room_id IS NULL THEN
        RAISE EXCEPTION 'room_id is required';
    END IF;

    IF v_kind NOT IN ('text', 'quick_action', 'status_event') THEN
        RAISE EXCEPTION 'Unsupported chat message kind: %', v_kind;
    END IF;

    IF char_length(v_body) < 1 OR char_length(v_body) > 1000 THEN
        RAISE EXCEPTION 'Message must be between 1 and 1000 characters';
    END IF;

    SELECT status
    INTO v_room_status
    FROM public.emergency_chat_rooms
    WHERE id = p_room_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Chat room not found';
    END IF;

    IF v_room_status = 'archived' THEN
        RAISE EXCEPTION 'Chat room is archived';
    END IF;

    IF NOT public.p_is_emergency_chat_participant(p_room_id) THEN
        RAISE EXCEPTION 'Unauthorized: chat room outside actor scope';
    END IF;

    IF p_client_message_id IS NOT NULL THEN
        SELECT *
        INTO v_message
        FROM public.emergency_chat_messages
        WHERE room_id = p_room_id
          AND sender_id = v_actor_id
          AND client_message_id = p_client_message_id
        LIMIT 1;

        IF FOUND THEN
            RETURN to_jsonb(v_message);
        END IF;
    END IF;

    SELECT role
    INTO v_sender_role
    FROM public.emergency_chat_participants
    WHERE room_id = p_room_id
      AND user_id = v_actor_id
      AND left_at IS NULL
    LIMIT 1;

    IF v_sender_role IS NULL THEN
        SELECT role, full_name, first_name, last_name, email, phone
        INTO v_profile
        FROM public.profiles
        WHERE id = v_actor_id;

        v_sender_role := CASE
            WHEN v_profile.role = 'dispatcher' THEN 'dispatcher'
            WHEN v_profile.role = 'org_admin' THEN 'hospital_admin'
            WHEN v_profile.role = 'provider' THEN 'provider'
            WHEN v_profile.role = 'admin' THEN 'support'
            ELSE 'patient'
        END;

        INSERT INTO public.emergency_chat_participants (
            room_id,
            user_id,
            role,
            display_name_snapshot
        )
        VALUES (
            p_room_id,
            v_actor_id,
            v_sender_role,
            COALESCE(
                NULLIF(BTRIM(v_profile.full_name), ''),
                NULLIF(BTRIM(CONCAT_WS(' ', NULLIF(v_profile.first_name, ''), NULLIF(v_profile.last_name, ''))), ''),
                NULLIF(BTRIM(v_profile.email), ''),
                NULLIF(BTRIM(v_profile.phone), '')
            )
        )
        ON CONFLICT (room_id, user_id) DO UPDATE
        SET role = EXCLUDED.role,
            left_at = NULL,
            updated_at = NOW()
        RETURNING role INTO v_sender_role;
    END IF;

    INSERT INTO public.emergency_chat_messages (
        room_id,
        sender_id,
        sender_role,
        kind,
        body,
        client_message_id,
        metadata
    )
    VALUES (
        p_room_id,
        v_actor_id,
        v_sender_role,
        v_kind,
        v_body,
        NULLIF(BTRIM(COALESCE(p_client_message_id, '')), ''),
        COALESCE(p_metadata, '{}'::jsonb)
    )
    RETURNING * INTO v_message;

    UPDATE public.emergency_chat_rooms
    SET last_message_at = v_message.created_at,
        updated_at = NOW()
    WHERE id = p_room_id;

    UPDATE public.emergency_chat_participants
    SET last_read_message_id = v_message.id,
        last_read_at = v_message.created_at,
        updated_at = NOW()
    WHERE room_id = p_room_id
      AND user_id = v_actor_id;

    RETURN to_jsonb(v_message);
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_emergency_chat_room_read(
    p_room_id UUID,
    p_message_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_message_id UUID := p_message_id;
BEGIN
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    IF p_room_id IS NULL THEN
        RAISE EXCEPTION 'room_id is required';
    END IF;

    IF NOT public.p_is_emergency_chat_participant(p_room_id) THEN
        RAISE EXCEPTION 'Unauthorized: chat room outside actor scope';
    END IF;

    IF v_message_id IS NULL THEN
        SELECT id
        INTO v_message_id
        FROM public.emergency_chat_messages
        WHERE room_id = p_room_id
          AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1;
    ELSE
        PERFORM 1
        FROM public.emergency_chat_messages
        WHERE id = v_message_id
          AND room_id = p_room_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Message does not belong to room';
        END IF;
    END IF;

    UPDATE public.emergency_chat_participants
    SET last_read_message_id = v_message_id,
        last_read_at = NOW(),
        updated_at = NOW()
    WHERE room_id = p_room_id
      AND user_id = v_actor_id
      AND left_at IS NULL;

    RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_emergency_chat_room_on_request_close()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.status IN ('completed', 'cancelled')
       AND OLD.status IS DISTINCT FROM NEW.status THEN
        UPDATE public.emergency_chat_rooms
        SET status = 'archived',
            archived_at = COALESCE(archived_at, NOW()),
            updated_at = NOW()
        WHERE emergency_request_id = NEW.id
          AND status <> 'archived';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_emergency_archive_chat_room ON public.emergency_requests;
CREATE TRIGGER on_emergency_archive_chat_room
AFTER UPDATE OF status ON public.emergency_requests
FOR EACH ROW
EXECUTE FUNCTION public.archive_emergency_chat_room_on_request_close();

-- ============================================================
-- Scheduled visits and asynchronous consults
-- ============================================================
-- BEGIN SCHEDULED_VISITS_ASYNC_CONSULT_RPCS

CREATE OR REPLACE FUNCTION public.p_scheduled_visit_duration(p_care_mode TEXT)
RETURNS INTERVAL
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
    SELECT CASE LOWER(BTRIM(COALESCE(p_care_mode, '')))
        WHEN 'in_person' THEN INTERVAL '45 minutes'
        WHEN 'telemedicine_async' THEN INTERVAL '30 minutes'
        ELSE NULL
    END;
$$;

CREATE OR REPLACE FUNCTION public.p_select_bookable_doctor(
    p_hospital_id UUID,
    p_specialty TEXT,
    p_care_mode TEXT,
    p_scheduled_start_at TIMESTAMPTZ,
    p_scheduled_end_at TIMESTAMPTZ,
    p_exclude_visit_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_timezone TEXT;
    v_doctor_id UUID;
BEGIN
    SELECT hospital.timezone
    INTO v_timezone
    FROM public.hospitals hospital
    WHERE hospital.id = p_hospital_id
      AND hospital.timezone_confirmed_at IS NOT NULL;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    SELECT doctor.id
    INTO v_doctor_id
    FROM public.doctors doctor
    WHERE doctor.hospital_id = p_hospital_id
      AND doctor.is_available = true
      AND LOWER(COALESCE(doctor.status, '')) IN ('available', 'on_call')
      AND COALESCE(doctor.current_patients, 0) < GREATEST(COALESCE(NULLIF(doctor.max_patients, 0), 1), 1)
      AND LOWER(BTRIM(doctor.specialization)) = LOWER(BTRIM(p_specialty))
      AND (
          p_care_mode <> 'telemedicine_async'
          OR doctor.profile_id IS NOT NULL
      )
      AND EXISTS (
          SELECT 1
          FROM public.doctor_schedules schedule
          WHERE schedule.doctor_id = doctor.id
            AND schedule.is_available = true
            AND p_scheduled_start_at >= (
                (schedule.date + schedule.start_time) AT TIME ZONE v_timezone
            )
            AND p_scheduled_end_at <= (
                (schedule.date + schedule.end_time) AT TIME ZONE v_timezone
            )
      )
      AND NOT EXISTS (
          SELECT 1
          FROM public.visits active_visit
          WHERE active_visit.doctor_id = doctor.id
            AND active_visit.care_mode IS NOT NULL
            AND active_visit.status IN ('upcoming', 'in_progress')
            AND active_visit.id IS DISTINCT FROM p_exclude_visit_id
            AND active_visit.scheduled_start_at < p_scheduled_end_at
            AND active_visit.scheduled_end_at > p_scheduled_start_at
      )
    ORDER BY
        (
            SELECT COUNT(*)
            FROM public.visits workload
            WHERE workload.doctor_id = doctor.id
              AND workload.care_mode IS NOT NULL
              AND workload.status IN ('upcoming', 'in_progress')
              AND workload.scheduled_start_at >= NOW()
        ) ASC,
        COALESCE(doctor.current_patients, 0) ASC,
        doctor.id ASC
    FOR UPDATE OF doctor SKIP LOCKED
    LIMIT 1;

    RETURN v_doctor_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_book_visit_availability(
    p_hospital_id UUID,
    p_specialty TEXT,
    p_care_mode TEXT,
    p_from_at TIMESTAMPTZ DEFAULT NOW(),
    p_to_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '14 days'
)
RETURNS TABLE (
    hospital_id UUID,
    doctor_id UUID,
    doctor_name TEXT,
    doctor_image TEXT,
    specialty TEXT,
    care_mode TEXT,
    scheduled_start_at TIMESTAMPTZ,
    scheduled_end_at TIMESTAMPTZ,
    scheduled_timezone TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_care_mode TEXT := LOWER(BTRIM(COALESCE(p_care_mode, '')));
    v_duration INTERVAL := public.p_scheduled_visit_duration(p_care_mode);
BEGIN
    IF v_actor_id IS NULL AND NOT v_is_service_role THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    IF p_hospital_id IS NULL OR NULLIF(BTRIM(COALESCE(p_specialty, '')), '') IS NULL THEN
        RAISE EXCEPTION 'hospital_id and specialty are required';
    END IF;

    IF v_duration IS NULL THEN
        RAISE EXCEPTION 'Unsupported care mode';
    END IF;

    IF p_from_at IS NULL OR p_to_at IS NULL
       OR p_to_at <= p_from_at
       OR p_to_at > p_from_at + INTERVAL '31 days' THEN
        RAISE EXCEPTION 'Availability window must be between 1 minute and 31 days';
    END IF;

    RETURN QUERY
    SELECT DISTINCT
        hospital.id,
        doctor.id,
        doctor.name,
        doctor.image,
        doctor.specialization,
        v_care_mode,
        slot.start_at,
        slot.start_at + v_duration,
        hospital.timezone
    FROM public.hospitals hospital
    JOIN public.doctors doctor
      ON doctor.hospital_id = hospital.id
    JOIN public.doctor_schedules schedule
      ON schedule.doctor_id = doctor.id
     AND schedule.is_available = true
    CROSS JOIN LATERAL generate_series(
        (schedule.date + schedule.start_time) AT TIME ZONE hospital.timezone,
        ((schedule.date + schedule.end_time) AT TIME ZONE hospital.timezone) - v_duration,
        INTERVAL '15 minutes'
    ) AS slot(start_at)
    WHERE hospital.id = p_hospital_id
      AND hospital.booking_eligible = true
      AND hospital.status = 'available'
      AND hospital.timezone_confirmed_at IS NOT NULL
      AND doctor.is_available = true
      AND LOWER(COALESCE(doctor.status, '')) IN ('available', 'on_call')
      AND COALESCE(doctor.current_patients, 0) < GREATEST(COALESCE(NULLIF(doctor.max_patients, 0), 1), 1)
      AND LOWER(BTRIM(doctor.specialization)) = LOWER(BTRIM(p_specialty))
      AND (v_care_mode <> 'telemedicine_async' OR doctor.profile_id IS NOT NULL)
      AND slot.start_at >= GREATEST(p_from_at, NOW())
      AND slot.start_at + v_duration <= p_to_at
      AND NOT EXISTS (
          SELECT 1
          FROM public.visits active_visit
          WHERE active_visit.doctor_id = doctor.id
            AND active_visit.care_mode IS NOT NULL
            AND active_visit.status IN ('upcoming', 'in_progress')
            AND active_visit.scheduled_start_at < slot.start_at + v_duration
            AND active_visit.scheduled_end_at > slot.start_at
      )
      AND (
          v_actor_id IS NULL
          OR NOT EXISTS (
              SELECT 1
              FROM public.visits patient_visit
              WHERE patient_visit.user_id = v_actor_id
                AND patient_visit.care_mode IS NOT NULL
                AND patient_visit.status IN ('upcoming', 'in_progress')
                AND patient_visit.scheduled_start_at < slot.start_at + v_duration
                AND patient_visit.scheduled_end_at > slot.start_at
          )
      )
    ORDER BY slot.start_at, doctor.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_console_doctor_schedules(
    p_hospital_id UUID DEFAULT NULL,
    p_from_date DATE DEFAULT CURRENT_DATE,
    p_to_date DATE DEFAULT CURRENT_DATE + 30
)
RETURNS TABLE (
    schedule_id UUID,
    doctor_id UUID,
    doctor_name TEXT,
    hospital_id UUID,
    hospital_name TEXT,
    scheduled_timezone TEXT,
    schedule_date DATE,
    start_time TIME,
    end_time TIME,
    shift_type TEXT,
    is_available BOOLEAN,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
BEGIN
    IF p_from_date IS NULL OR p_to_date IS NULL
       OR p_to_date < p_from_date
       OR p_to_date > p_from_date + 180 THEN
        RAISE EXCEPTION 'Schedule window must be between 0 and 180 days';
    END IF;

    IF NOT v_is_service_role THEN
        IF v_actor_id IS NULL THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;

        SELECT profile.role, profile.organization_id
        INTO v_actor_role, v_actor_org_id
        FROM public.profiles profile
        WHERE profile.id = v_actor_id;

        IF NOT COALESCE(v_actor_role IN ('admin', 'org_admin'), false) THEN
            RAISE EXCEPTION 'Unauthorized: schedule administration role required';
        END IF;
    END IF;

    RETURN QUERY
    SELECT
        schedule.id,
        doctor.id,
        doctor.name,
        hospital.id,
        hospital.name,
        hospital.timezone,
        schedule.date,
        schedule.start_time,
        schedule.end_time,
        schedule.shift_type,
        schedule.is_available,
        schedule.updated_at
    FROM public.doctor_schedules schedule
    JOIN public.doctors doctor ON doctor.id = schedule.doctor_id
    JOIN public.hospitals hospital ON hospital.id = doctor.hospital_id
    WHERE schedule.date BETWEEN p_from_date AND p_to_date
      AND (p_hospital_id IS NULL OR hospital.id = p_hospital_id)
      AND (
          v_is_service_role
          OR v_actor_role = 'admin'
          OR (
              v_actor_role = 'org_admin'
              AND v_actor_org_id IS NOT NULL
              AND hospital.organization_id = v_actor_org_id
          )
      )
    ORDER BY schedule.date, schedule.start_time, doctor.name, schedule.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_hospital_timezone(
    p_hospital_id UUID,
    p_timezone TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_hospital_org_id UUID;
    v_timezone TEXT := BTRIM(COALESCE(p_timezone, ''));
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_hospital public.hospitals%ROWTYPE;
BEGIN
    IF p_hospital_id IS NULL OR v_timezone = '' THEN
        RAISE EXCEPTION 'hospital and timezone are required';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_timezone_names timezone_row
        WHERE timezone_row.name = v_timezone
    ) THEN
        RAISE EXCEPTION 'Invalid IANA timezone: %', v_timezone;
    END IF;

    SELECT hospital.organization_id
    INTO v_hospital_org_id
    FROM public.hospitals hospital
    WHERE hospital.id = p_hospital_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Hospital not found';
    END IF;

    IF NOT v_is_service_role THEN
        IF v_actor_id IS NULL THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;

        SELECT profile.role, profile.organization_id
        INTO v_actor_role, v_actor_org_id
        FROM public.profiles profile
        WHERE profile.id = v_actor_id;

        IF NOT COALESCE(
            v_actor_role = 'admin'
            OR (
                v_actor_role = 'org_admin'
                AND v_actor_org_id IS NOT NULL
                AND v_actor_org_id = v_hospital_org_id
            ),
            false
        ) THEN
            RAISE EXCEPTION 'Unauthorized: hospital outside timezone scope';
        END IF;
    END IF;

    UPDATE public.hospitals
    SET timezone = v_timezone,
        timezone_confirmed_at = NOW(),
        timezone_confirmation_source = 'manual',
        timezone_confirmed_by = CASE WHEN v_is_service_role THEN NULL ELSE v_actor_id END,
        updated_at = NOW()
    WHERE id = p_hospital_id
    RETURNING * INTO v_hospital;

    INSERT INTO public.admin_audit_log (admin_id, action, details)
    VALUES (
        v_actor_id,
        'hospital.timezone_confirm',
        jsonb_build_object(
            'hospital_id', p_hospital_id,
            'timezone', v_timezone,
            'service_role', v_is_service_role
        )
    );

    RETURN jsonb_build_object(
        'hospital_id', v_hospital.id,
        'timezone', v_hospital.timezone,
        'timezone_confirmed_at', v_hospital.timezone_confirmed_at,
        'timezone_confirmation_source', v_hospital.timezone_confirmation_source,
        'timezone_confirmed_by', v_hospital.timezone_confirmed_by
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_doctor_schedule(
    p_doctor_id UUID,
    p_date DATE,
    p_start_time TIME,
    p_end_time TIME,
    p_shift_type TEXT,
    p_is_available BOOLEAN DEFAULT true,
    p_schedule_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_doctor_org_id UUID;
    v_doctor_timezone TEXT;
    v_timezone_confirmed_at TIMESTAMPTZ;
    v_target_schedule_id UUID := p_schedule_id;
    v_new_window_start TIMESTAMPTZ;
    v_new_window_end TIMESTAMPTZ;
    v_existing_window_start TIMESTAMPTZ;
    v_existing_window_end TIMESTAMPTZ;
    v_existing_schedule public.doctor_schedules%ROWTYPE;
    v_schedule public.doctor_schedules%ROWTYPE;
BEGIN
    IF p_doctor_id IS NULL OR p_date IS NULL OR p_start_time IS NULL OR p_end_time IS NULL THEN
        RAISE EXCEPTION 'doctor, date, start time, and end time are required';
    END IF;

    IF p_end_time <= p_start_time THEN
        RAISE EXCEPTION 'Schedule end time must be later than start time';
    END IF;

    IF MOD(EXTRACT(MINUTE FROM p_start_time)::INTEGER, 15) <> 0
       OR EXTRACT(SECOND FROM p_start_time) <> 0
       OR MOD(EXTRACT(MINUTE FROM p_end_time)::INTEGER, 15) <> 0
       OR EXTRACT(SECOND FROM p_end_time) <> 0 THEN
        RAISE EXCEPTION 'Schedule boundaries must align to 15-minute increments';
    END IF;

    IF p_shift_type IS NULL OR p_shift_type NOT IN ('day', 'evening', 'night') THEN
        RAISE EXCEPTION 'Unsupported shift type';
    END IF;

    SELECT hospital.organization_id, hospital.timezone, hospital.timezone_confirmed_at
    INTO v_doctor_org_id, v_doctor_timezone, v_timezone_confirmed_at
    FROM public.doctors doctor
    JOIN public.hospitals hospital ON hospital.id = doctor.hospital_id
    WHERE doctor.id = p_doctor_id
    FOR UPDATE OF doctor;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Doctor not found';
    END IF;

    IF v_timezone_confirmed_at IS NULL THEN
        RAISE EXCEPTION 'Facility timezone is not confirmed';
    END IF;

    IF p_date < (NOW() AT TIME ZONE v_doctor_timezone)::DATE
       OR p_date > (NOW() AT TIME ZONE v_doctor_timezone)::DATE + 365 THEN
        RAISE EXCEPTION 'Schedules must be within the next 365 facility-local days';
    END IF;

    IF (((p_date + p_start_time) AT TIME ZONE v_doctor_timezone) AT TIME ZONE v_doctor_timezone)
           IS DISTINCT FROM (p_date + p_start_time)
       OR (((p_date + p_end_time) AT TIME ZONE v_doctor_timezone) AT TIME ZONE v_doctor_timezone)
           IS DISTINCT FROM (p_date + p_end_time) THEN
        RAISE EXCEPTION 'Schedule boundaries must be valid facility-local times';
    END IF;

    v_new_window_start := (p_date + p_start_time) AT TIME ZONE v_doctor_timezone;
    v_new_window_end := (p_date + p_end_time) AT TIME ZONE v_doctor_timezone;

    IF v_new_window_end <= v_new_window_start THEN
        RAISE EXCEPTION 'Schedule must resolve to a positive facility-local window';
    END IF;

    IF NOT v_is_service_role THEN
        IF v_actor_id IS NULL THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;

        SELECT profile.role, profile.organization_id
        INTO v_actor_role, v_actor_org_id
        FROM public.profiles profile
        WHERE profile.id = v_actor_id;

        IF NOT COALESCE(
            v_actor_role = 'admin'
            OR (
                v_actor_role = 'org_admin'
                AND v_actor_org_id IS NOT NULL
                AND v_actor_org_id = v_doctor_org_id
            ),
            false
        ) THEN
            RAISE EXCEPTION 'Unauthorized: doctor outside schedule scope';
        END IF;
    END IF;

    IF v_target_schedule_id IS NULL THEN
        SELECT schedule.id
        INTO v_target_schedule_id
        FROM public.doctor_schedules schedule
        WHERE schedule.doctor_id = p_doctor_id
          AND schedule.date = p_date
          AND schedule.start_time = p_start_time
          AND schedule.end_time = p_end_time
        FOR UPDATE;
    END IF;

    IF v_target_schedule_id IS NOT NULL THEN
        SELECT schedule.*
        INTO v_existing_schedule
        FROM public.doctor_schedules schedule
        WHERE schedule.id = v_target_schedule_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Schedule not found';
        END IF;

        IF v_existing_schedule.doctor_id IS DISTINCT FROM p_doctor_id THEN
            RAISE EXCEPTION 'A schedule cannot be moved to another doctor';
        END IF;

        v_existing_window_start := (
            v_existing_schedule.date + v_existing_schedule.start_time
        ) AT TIME ZONE v_doctor_timezone;
        v_existing_window_end := (
            v_existing_schedule.date + v_existing_schedule.end_time
        ) AT TIME ZONE v_doctor_timezone;

        IF EXISTS (
            SELECT 1
            FROM public.visits active_visit
            WHERE active_visit.doctor_id = p_doctor_id
              AND active_visit.care_mode IS NOT NULL
              AND active_visit.status IN ('upcoming', 'in_progress')
              AND active_visit.scheduled_start_at < v_existing_window_end
              AND active_visit.scheduled_end_at > v_existing_window_start
              AND (
                  COALESCE(p_is_available, true) = false
                  OR active_visit.scheduled_start_at < v_new_window_start
                  OR active_visit.scheduled_end_at > v_new_window_end
              )
        ) THEN
            RAISE EXCEPTION 'Schedule change would remove active booked visits';
        END IF;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.doctor_schedules schedule
        WHERE schedule.doctor_id = p_doctor_id
          AND schedule.date = p_date
          AND schedule.id IS DISTINCT FROM v_target_schedule_id
          AND schedule.start_time < p_end_time
          AND schedule.end_time > p_start_time
    ) THEN
        RAISE EXCEPTION 'Schedule overlaps an existing shift';
    END IF;

    IF v_target_schedule_id IS NOT NULL THEN
        UPDATE public.doctor_schedules
        SET date = p_date,
            start_time = p_start_time,
            end_time = p_end_time,
            shift_type = p_shift_type,
            is_available = COALESCE(p_is_available, true),
            updated_at = NOW()
        WHERE id = v_target_schedule_id
        RETURNING * INTO v_schedule;
    ELSE
        INSERT INTO public.doctor_schedules (
            doctor_id,
            date,
            start_time,
            end_time,
            shift_type,
            is_available
        )
        VALUES (
            p_doctor_id,
            p_date,
            p_start_time,
            p_end_time,
            p_shift_type,
            COALESCE(p_is_available, true)
        )
        RETURNING * INTO v_schedule;
    END IF;

    INSERT INTO public.admin_audit_log (admin_id, action, details)
    VALUES (
        v_actor_id,
        'doctor_schedule.upsert',
        jsonb_build_object(
            'schedule_id', v_schedule.id,
            'doctor_id', p_doctor_id,
            'date', p_date,
            'start_time', p_start_time,
            'end_time', p_end_time,
            'service_role', v_is_service_role
        )
    );

    RETURN to_jsonb(v_schedule);
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_doctor_schedule(p_schedule_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_schedule RECORD;
    v_window_start TIMESTAMPTZ;
    v_window_end TIMESTAMPTZ;
BEGIN
    SELECT
        schedule.*,
        hospital.organization_id,
        hospital.timezone
    INTO v_schedule
    FROM public.doctor_schedules schedule
    JOIN public.doctors doctor ON doctor.id = schedule.doctor_id
    JOIN public.hospitals hospital ON hospital.id = doctor.hospital_id
    WHERE schedule.id = p_schedule_id
    FOR UPDATE OF schedule, doctor;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    IF NOT v_is_service_role THEN
        IF v_actor_id IS NULL THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;

        SELECT profile.role, profile.organization_id
        INTO v_actor_role, v_actor_org_id
        FROM public.profiles profile
        WHERE profile.id = v_actor_id;

        IF NOT COALESCE(
            v_actor_role = 'admin'
            OR (
                v_actor_role = 'org_admin'
                AND v_actor_org_id IS NOT NULL
                AND v_actor_org_id = v_schedule.organization_id
            ),
            false
        ) THEN
            RAISE EXCEPTION 'Unauthorized: schedule outside actor scope';
        END IF;
    END IF;

    v_window_start := (v_schedule.date + v_schedule.start_time) AT TIME ZONE v_schedule.timezone;
    v_window_end := (v_schedule.date + v_schedule.end_time) AT TIME ZONE v_schedule.timezone;

    IF EXISTS (
        SELECT 1
        FROM public.visits active_visit
        WHERE active_visit.doctor_id = v_schedule.doctor_id
          AND active_visit.care_mode IS NOT NULL
          AND active_visit.status IN ('upcoming', 'in_progress')
          AND active_visit.scheduled_start_at < v_window_end
          AND active_visit.scheduled_end_at > v_window_start
    ) THEN
        RAISE EXCEPTION 'Schedule has active booked visits';
    END IF;

    DELETE FROM public.doctor_schedules
    WHERE id = p_schedule_id;

    INSERT INTO public.admin_audit_log (admin_id, action, details)
    VALUES (
        v_actor_id,
        'doctor_schedule.delete',
        jsonb_build_object(
            'schedule_id', p_schedule_id,
            'doctor_id', v_schedule.doctor_id,
            'service_role', v_is_service_role
        )
    );

    RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_async_consult_room(p_visit_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_visit RECORD;
    v_room public.emergency_chat_rooms%ROWTYPE;
    v_patient_name TEXT;
    v_doctor_name TEXT;
BEGIN
    IF p_visit_id IS NULL THEN
        RAISE EXCEPTION 'visit_id is required';
    END IF;

    SELECT
        visit.*,
        doctor.profile_id AS doctor_profile_id,
        doctor.name AS canonical_doctor_name
    INTO v_visit
    FROM public.visits visit
    JOIN public.doctors doctor ON doctor.id = visit.doctor_id
    WHERE visit.id = p_visit_id
    FOR UPDATE OF visit;

    IF NOT FOUND OR v_visit.care_mode <> 'telemedicine_async' OR v_visit.request_id IS NOT NULL THEN
        RAISE EXCEPTION 'Visit is not an asynchronous telemedicine visit';
    END IF;

    IF v_visit.status NOT IN ('upcoming', 'in_progress') THEN
        RAISE EXCEPTION 'Consult room is unavailable for a closed visit';
    END IF;

    IF v_visit.doctor_profile_id IS NULL THEN
        RAISE EXCEPTION 'Assigned clinician does not have an authenticated profile';
    END IF;

    IF NOT v_is_service_role
       AND v_actor_id IS DISTINCT FROM v_visit.user_id
       AND v_actor_id IS DISTINCT FROM v_visit.doctor_profile_id THEN
        RAISE EXCEPTION 'Unauthorized: visit outside actor scope';
    END IF;

    SELECT room.*
    INTO v_room
    FROM public.emergency_chat_rooms room
    WHERE room.channel_type = 'telemedicine_async'
      AND room.visit_id = p_visit_id
    LIMIT 1
    FOR UPDATE;

    IF v_room.id IS NULL THEN
        INSERT INTO public.emergency_chat_rooms (
            emergency_request_id,
            visit_id,
            channel_type,
            created_by,
            status
        )
        VALUES (
            NULL,
            p_visit_id,
            'telemedicine_async',
            COALESCE(v_actor_id, v_visit.user_id),
            'active'
        )
        RETURNING * INTO v_room;
    END IF;

    SELECT COALESCE(
        NULLIF(BTRIM(profile.full_name), ''),
        NULLIF(BTRIM(CONCAT_WS(' ', NULLIF(profile.first_name, ''), NULLIF(profile.last_name, ''))), ''),
        NULLIF(BTRIM(profile.email), ''),
        'Patient'
    )
    INTO v_patient_name
    FROM public.profiles profile
    WHERE profile.id = v_visit.user_id;

    SELECT COALESCE(
        NULLIF(BTRIM(profile.full_name), ''),
        NULLIF(BTRIM(CONCAT_WS(' ', NULLIF(profile.first_name, ''), NULLIF(profile.last_name, ''))), ''),
        NULLIF(BTRIM(v_visit.canonical_doctor_name), ''),
        'Clinician'
    )
    INTO v_doctor_name
    FROM public.profiles profile
    WHERE profile.id = v_visit.doctor_profile_id;

    INSERT INTO public.emergency_chat_participants (
        room_id,
        user_id,
        role,
        display_name_snapshot
    )
    VALUES (
        v_room.id,
        v_visit.user_id,
        'patient',
        COALESCE(v_patient_name, 'Patient')
    )
    ON CONFLICT (room_id, user_id) DO UPDATE
    SET role = 'patient',
        display_name_snapshot = EXCLUDED.display_name_snapshot,
        left_at = NULL,
        updated_at = NOW();

    INSERT INTO public.emergency_chat_participants (
        room_id,
        user_id,
        role,
        display_name_snapshot
    )
    VALUES (
        v_room.id,
        v_visit.doctor_profile_id,
        'provider',
        COALESCE(v_doctor_name, v_visit.canonical_doctor_name, 'Clinician')
    )
    ON CONFLICT (room_id, user_id) DO UPDATE
    SET role = 'provider',
        display_name_snapshot = EXCLUDED.display_name_snapshot,
        left_at = NULL,
        updated_at = NOW();

    RETURN to_jsonb(v_room);
END;
$$;

CREATE OR REPLACE FUNCTION public.book_scheduled_visit(
    p_hospital_id UUID,
    p_specialty TEXT,
    p_care_mode TEXT,
    p_scheduled_start_at TIMESTAMPTZ,
    p_idempotency_key UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_care_mode TEXT := LOWER(BTRIM(COALESCE(p_care_mode, '')));
    v_specialty TEXT := BTRIM(COALESCE(p_specialty, ''));
    v_duration INTERVAL := public.p_scheduled_visit_duration(p_care_mode);
    v_scheduled_end_at TIMESTAMPTZ;
    v_local_start TIMESTAMP;
    v_local_end TIMESTAMP;
    v_hospital public.hospitals%ROWTYPE;
    v_doctor public.doctors%ROWTYPE;
    v_selected_doctor_id UUID;
    v_visit public.visits%ROWTYPE;
    v_existing public.visits%ROWTYPE;
    v_room JSONB;
    v_room_id UUID;
BEGIN
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    IF p_hospital_id IS NULL OR v_specialty = '' OR p_scheduled_start_at IS NULL OR p_idempotency_key IS NULL THEN
        RAISE EXCEPTION 'hospital, specialty, start time, and idempotency key are required';
    END IF;

    IF v_duration IS NULL THEN
        RAISE EXCEPTION 'Unsupported care mode';
    END IF;

    IF p_notes IS NOT NULL AND char_length(p_notes) > 2000 THEN
        RAISE EXCEPTION 'Notes cannot exceed 2000 characters';
    END IF;

    PERFORM pg_advisory_xact_lock(
        hashtextextended(
            'scheduled-booking-key:' || v_actor_id::TEXT || ':' || p_idempotency_key::TEXT,
            0
        )
    );

    SELECT visit.*
    INTO v_existing
    FROM public.visits visit
    WHERE visit.user_id = v_actor_id
      AND visit.booking_idempotency_key = p_idempotency_key
    LIMIT 1
    FOR UPDATE;

    IF v_existing.id IS NOT NULL THEN
        IF v_existing.hospital_id IS DISTINCT FROM p_hospital_id
           OR v_existing.care_mode IS DISTINCT FROM v_care_mode
           OR v_existing.scheduled_start_at IS DISTINCT FROM p_scheduled_start_at
           OR LOWER(BTRIM(COALESCE(v_existing.specialty, ''))) <> LOWER(v_specialty)
           OR NULLIF(BTRIM(COALESCE(v_existing.notes, '')), '') IS DISTINCT FROM
              NULLIF(BTRIM(COALESCE(p_notes, '')), '') THEN
            RAISE EXCEPTION 'Idempotency key was already used for another booking';
        END IF;

        IF v_existing.care_mode = 'telemedicine_async' THEN
            SELECT room.id
            INTO v_room_id
            FROM public.emergency_chat_rooms room
            WHERE room.channel_type = 'telemedicine_async'
              AND room.visit_id = v_existing.id;

            IF v_room_id IS NULL AND v_existing.status IN ('upcoming', 'in_progress') THEN
                v_room := public.ensure_async_consult_room(v_existing.id);
                v_room_id := NULLIF(v_room->>'id', '')::UUID;
            END IF;
        END IF;

        RETURN to_jsonb(v_existing) || jsonb_build_object(
            'communication_room_id', v_room_id,
            'idempotent', true
        );
    END IF;

    SELECT hospital.*
    INTO v_hospital
    FROM public.hospitals hospital
    WHERE hospital.id = p_hospital_id
      AND hospital.booking_eligible = true
      AND hospital.status = 'available'
    FOR SHARE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Facility is not available for booking';
    END IF;

    IF v_hospital.timezone_confirmed_at IS NULL THEN
        RAISE EXCEPTION 'Facility timezone is not confirmed';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_timezone_names timezone_row WHERE timezone_row.name = v_hospital.timezone
    ) THEN
        RAISE EXCEPTION 'Facility timezone is invalid';
    END IF;

    v_scheduled_end_at := p_scheduled_start_at + v_duration;
    v_local_start := p_scheduled_start_at AT TIME ZONE v_hospital.timezone;
    v_local_end := v_scheduled_end_at AT TIME ZONE v_hospital.timezone;

    IF p_scheduled_start_at < NOW() + INTERVAL '5 minutes'
       OR p_scheduled_start_at > NOW() + INTERVAL '90 days' THEN
        RAISE EXCEPTION 'Booking start must be between 5 minutes and 90 days from now';
    END IF;

    IF v_local_start::DATE <> v_local_end::DATE
       OR MOD(EXTRACT(MINUTE FROM v_local_start)::INTEGER, 15) <> 0
       OR EXTRACT(SECOND FROM v_local_start) <> 0 THEN
        RAISE EXCEPTION 'Booking must use a same-day 15-minute slot';
    END IF;

    PERFORM pg_advisory_xact_lock(
        hashtextextended('scheduled-patient:' || v_actor_id::TEXT, 0)
    );

    IF EXISTS (
        SELECT 1
        FROM public.visits patient_visit
        WHERE patient_visit.user_id = v_actor_id
          AND patient_visit.care_mode IS NOT NULL
          AND patient_visit.status IN ('upcoming', 'in_progress')
          AND patient_visit.scheduled_start_at < v_scheduled_end_at
          AND patient_visit.scheduled_end_at > p_scheduled_start_at
    ) THEN
        RAISE EXCEPTION 'Patient already has a scheduled visit in this time window';
    END IF;

    PERFORM pg_advisory_xact_lock(
        hashtextextended(
            'book:' || p_hospital_id::TEXT || ':' || LOWER(v_specialty) || ':' || p_scheduled_start_at::TEXT,
            0
        )
    );

    v_selected_doctor_id := public.p_select_bookable_doctor(
        p_hospital_id,
        v_specialty,
        v_care_mode,
        p_scheduled_start_at,
        v_scheduled_end_at,
        NULL
    );

    IF v_selected_doctor_id IS NULL THEN
        RAISE EXCEPTION 'No clinician is available for this slot';
    END IF;

    SELECT doctor.*
    INTO STRICT v_doctor
    FROM public.doctors doctor
    WHERE doctor.id = v_selected_doctor_id;

    INSERT INTO public.visits (
        user_id,
        hospital_id,
        request_id,
        doctor_id,
        hospital_name,
        hospital,
        hospital_image,
        image,
        address,
        phone,
        doctor_name,
        doctor,
        doctor_image,
        specialty,
        date,
        time,
        type,
        status,
        notes,
        estimated_duration,
        meeting_link,
        care_mode,
        scheduled_start_at,
        scheduled_end_at,
        scheduled_timezone,
        booking_idempotency_key,
        lifecycle_state,
        lifecycle_updated_at
    )
    VALUES (
        v_actor_id,
        v_hospital.id,
        NULL,
        v_doctor.id,
        v_hospital.name,
        v_hospital.name,
        v_hospital.image,
        v_hospital.image,
        v_hospital.address,
        v_hospital.phone,
        v_doctor.name,
        v_doctor.name,
        v_doctor.image,
        v_doctor.specialization,
        TO_CHAR(v_local_start, 'YYYY-MM-DD'),
        TO_CHAR(v_local_start, 'HH12:MI AM'),
        CASE WHEN v_care_mode = 'telemedicine_async' THEN 'Telehealth' ELSE 'Consultation' END,
        'upcoming',
        NULLIF(BTRIM(COALESCE(p_notes, '')), ''),
        CASE WHEN v_care_mode = 'telemedicine_async' THEN '30 mins' ELSE '45 mins' END,
        NULL,
        v_care_mode,
        p_scheduled_start_at,
        v_scheduled_end_at,
        v_hospital.timezone,
        p_idempotency_key,
        'scheduled',
        NOW()
    )
    RETURNING * INTO v_visit;

    IF v_care_mode = 'telemedicine_async' THEN
        v_room := public.ensure_async_consult_room(v_visit.id);
        v_room_id := NULLIF(v_room->>'id', '')::UUID;
    END IF;

    PERFORM public.emit_canonical_notification(
        p_event_key => 'scheduled_visit:' || v_visit.id::TEXT || ':booked:patient',
        p_recipient_user_id => v_visit.user_id,
        p_type => 'visit',
        p_title => 'Visit booked',
        p_message => 'Your visit with ' || COALESCE(NULLIF(BTRIM(v_visit.doctor_name), ''), 'your clinician')
            || ' is scheduled for ' || v_visit.date || ' at ' || v_visit.time || '.',
        p_priority => 'high',
        p_action_type => 'view_scheduled_visit',
        p_target_id => v_visit.id,
        p_action_data => jsonb_build_object('id', v_visit.id, 'visitId', v_visit.id),
        p_metadata => jsonb_build_object(
            'eventName', 'scheduled_visit.booked',
            'visitId', v_visit.id,
            'careMode', v_visit.care_mode,
            'scheduledStartAt', v_visit.scheduled_start_at
        ),
        p_icon => 'calendar-outline',
        p_color => 'success'
    );

    IF v_doctor.profile_id IS NOT NULL THEN
        PERFORM public.emit_canonical_notification(
            p_event_key => 'scheduled_visit:' || v_visit.id::TEXT || ':booked:clinician',
            p_recipient_user_id => v_doctor.profile_id,
            p_type => 'visit',
            p_title => 'New scheduled visit',
            p_message => 'A patient booked a ' || REPLACE(v_care_mode, '_', ' ')
                || ' visit for ' || v_visit.date || ' at ' || v_visit.time || '.',
            p_priority => 'high',
            p_action_type => 'view_scheduled_visit',
            p_target_id => v_visit.id,
            p_action_data => jsonb_build_object('id', v_visit.id, 'visitId', v_visit.id),
            p_metadata => jsonb_build_object(
                'eventName', 'scheduled_visit.booked',
                'visitId', v_visit.id,
                'careMode', v_visit.care_mode,
                'scheduledStartAt', v_visit.scheduled_start_at
            ),
            p_icon => 'calendar-outline',
            p_color => 'info'
        );
    END IF;

    RETURN to_jsonb(v_visit) || jsonb_build_object(
        'communication_room_id', v_room_id,
        'idempotent', false
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.transition_scheduled_visit(
    p_visit_id UUID,
    p_action TEXT,
    p_scheduled_start_at TIMESTAMPTZ DEFAULT NULL,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_action TEXT := LOWER(BTRIM(COALESCE(p_action, '')));
    v_visit RECORD;
    v_duration INTERVAL;
    v_new_end_at TIMESTAMPTZ;
    v_local_start TIMESTAMP;
    v_local_end TIMESTAMP;
    v_new_doctor public.doctors%ROWTYPE;
    v_selected_doctor_id UUID;
    v_room_id UUID;
    v_is_patient BOOLEAN := false;
    v_is_clinician BOOLEAN := false;
    v_is_org_admin BOOLEAN := false;
    v_is_admin BOOLEAN := false;
    v_transition_event_id UUID := gen_random_uuid();
    v_previous_doctor_profile_id UUID;
    v_current_doctor_profile_id UUID;
    v_notification_title TEXT;
    v_notification_message TEXT;
BEGIN
    IF p_visit_id IS NULL OR v_action NOT IN ('cancel', 'reschedule', 'start', 'complete', 'no_show') THEN
        RAISE EXCEPTION 'Valid visit_id and action are required';
    END IF;

    IF p_reason IS NOT NULL AND char_length(p_reason) > 500 THEN
        RAISE EXCEPTION 'Reason cannot exceed 500 characters';
    END IF;

    SELECT
        visit.*,
        hospital.organization_id AS visit_org_id,
        hospital.timezone AS hospital_timezone,
        hospital.timezone_confirmed_at AS hospital_timezone_confirmed_at,
        hospital.booking_eligible AS hospital_booking_eligible,
        hospital.status AS hospital_status,
        doctor.profile_id AS doctor_profile_id
    INTO v_visit
    FROM public.visits visit
    JOIN public.hospitals hospital ON hospital.id = visit.hospital_id
    JOIN public.doctors doctor ON doctor.id = visit.doctor_id
    WHERE visit.id = p_visit_id
    FOR UPDATE OF visit
    FOR SHARE OF hospital;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Scheduled visit not found';
    END IF;

    IF v_visit.care_mode IS NULL OR v_visit.request_id IS NOT NULL THEN
        RAISE EXCEPTION 'Emergency and legacy visits use their existing lifecycle receivers';
    END IF;

    v_previous_doctor_profile_id := v_visit.doctor_profile_id;

    IF NOT v_is_service_role THEN
        IF v_actor_id IS NULL THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;

        SELECT profile.role, profile.organization_id
        INTO v_actor_role, v_actor_org_id
        FROM public.profiles profile
        WHERE profile.id = v_actor_id;
    END IF;

    v_is_patient := v_actor_id IS NOT NULL
        AND v_actor_id IS NOT DISTINCT FROM v_visit.user_id;
    v_is_clinician := v_actor_id IS NOT NULL
        AND v_visit.doctor_profile_id IS NOT NULL
        AND v_actor_id = v_visit.doctor_profile_id;
    v_is_admin := v_is_service_role OR COALESCE(v_actor_role = 'admin', false);
    v_is_org_admin := COALESCE(
        v_actor_role = 'org_admin'
        AND v_actor_org_id IS NOT NULL
        AND v_actor_org_id = v_visit.visit_org_id,
        false
    );

    IF v_action = 'cancel' THEN
        IF v_visit.status <> 'upcoming' THEN
            RAISE EXCEPTION 'Only an upcoming visit can be cancelled';
        END IF;

        IF NOT (v_is_admin OR v_is_org_admin OR v_is_patient) THEN
            RAISE EXCEPTION 'Unauthorized: cancellation outside actor scope';
        END IF;

        IF v_is_patient AND NOT (v_is_admin OR v_is_org_admin)
           AND v_visit.scheduled_start_at <= NOW() + INTERVAL '2 hours' THEN
            RAISE EXCEPTION 'Patient cancellation closes 2 hours before the visit';
        END IF;

        UPDATE public.visits
        SET status = 'cancelled',
            lifecycle_state = 'cancelled',
            lifecycle_updated_at = NOW(),
            updated_at = NOW()
        WHERE id = p_visit_id;

        UPDATE public.emergency_chat_rooms
        SET status = 'archived',
            archived_at = COALESCE(archived_at, NOW()),
            updated_at = NOW()
        WHERE channel_type = 'telemedicine_async'
          AND visit_id = p_visit_id
          AND status <> 'archived';

    ELSIF v_action = 'reschedule' THEN
        IF v_visit.status <> 'upcoming' OR p_scheduled_start_at IS NULL THEN
            RAISE EXCEPTION 'An upcoming visit and new start time are required';
        END IF;

        IF NOT (v_is_admin OR v_is_org_admin OR v_is_patient) THEN
            RAISE EXCEPTION 'Unauthorized: reschedule outside actor scope';
        END IF;

        IF v_is_patient AND NOT (v_is_admin OR v_is_org_admin)
           AND v_visit.scheduled_start_at <= NOW() + INTERVAL '2 hours' THEN
            RAISE EXCEPTION 'Patient rescheduling closes 2 hours before the visit';
        END IF;

        IF NULLIF(BTRIM(COALESCE(v_visit.specialty, '')), '') IS NULL THEN
            RAISE EXCEPTION 'Scheduled visit specialty is unavailable';
        END IF;

        IF v_visit.hospital_timezone_confirmed_at IS NULL THEN
            RAISE EXCEPTION 'Facility timezone is not confirmed';
        END IF;

        IF v_visit.hospital_booking_eligible IS DISTINCT FROM true
           OR v_visit.hospital_status <> 'available' THEN
            RAISE EXCEPTION 'Facility is not available for rescheduling';
        END IF;

        v_duration := public.p_scheduled_visit_duration(v_visit.care_mode);
        v_new_end_at := p_scheduled_start_at + v_duration;
        v_local_start := p_scheduled_start_at AT TIME ZONE v_visit.hospital_timezone;
        v_local_end := v_new_end_at AT TIME ZONE v_visit.hospital_timezone;

        IF p_scheduled_start_at < NOW() + INTERVAL '5 minutes'
           OR p_scheduled_start_at > NOW() + INTERVAL '90 days'
           OR v_local_start::DATE <> v_local_end::DATE
           OR MOD(EXTRACT(MINUTE FROM v_local_start)::INTEGER, 15) <> 0
           OR EXTRACT(SECOND FROM v_local_start) <> 0 THEN
            RAISE EXCEPTION 'New start must be a same-day 15-minute slot within 90 days';
        END IF;

        PERFORM pg_advisory_xact_lock(
            hashtextextended('scheduled-patient:' || v_visit.user_id::TEXT, 0)
        );

        IF EXISTS (
            SELECT 1
            FROM public.visits patient_visit
            WHERE patient_visit.user_id = v_visit.user_id
              AND patient_visit.care_mode IS NOT NULL
              AND patient_visit.status IN ('upcoming', 'in_progress')
              AND patient_visit.id IS DISTINCT FROM p_visit_id
              AND patient_visit.scheduled_start_at < v_new_end_at
              AND patient_visit.scheduled_end_at > p_scheduled_start_at
        ) THEN
            RAISE EXCEPTION 'Patient already has a scheduled visit in this time window';
        END IF;

        PERFORM pg_advisory_xact_lock(
            hashtextextended(
                'book:' || v_visit.hospital_id::TEXT || ':' || LOWER(v_visit.specialty) || ':' || p_scheduled_start_at::TEXT,
                0
            )
        );

        v_selected_doctor_id := public.p_select_bookable_doctor(
            v_visit.hospital_id,
            v_visit.specialty,
            v_visit.care_mode,
            p_scheduled_start_at,
            v_new_end_at,
            p_visit_id
        );

        IF v_selected_doctor_id IS NULL THEN
            RAISE EXCEPTION 'No clinician is available for the new slot';
        END IF;

        SELECT doctor.*
        INTO STRICT v_new_doctor
        FROM public.doctors doctor
        WHERE doctor.id = v_selected_doctor_id;

        SELECT room.id
        INTO v_room_id
        FROM public.emergency_chat_rooms room
        WHERE room.channel_type = 'telemedicine_async'
          AND room.visit_id = p_visit_id
        FOR UPDATE;

        UPDATE public.visits
        SET doctor_id = v_new_doctor.id,
            doctor_name = v_new_doctor.name,
            doctor = v_new_doctor.name,
            doctor_image = v_new_doctor.image,
            scheduled_start_at = p_scheduled_start_at,
            scheduled_end_at = v_new_end_at,
            scheduled_timezone = v_visit.hospital_timezone,
            date = TO_CHAR(v_local_start, 'YYYY-MM-DD'),
            time = TO_CHAR(v_local_start, 'HH12:MI AM'),
            lifecycle_state = 'rescheduled',
            lifecycle_updated_at = NOW(),
            updated_at = NOW()
        WHERE id = p_visit_id;

        IF v_room_id IS NOT NULL
           AND v_visit.doctor_profile_id IS DISTINCT FROM v_new_doctor.profile_id THEN
            UPDATE public.emergency_chat_participants
            SET left_at = COALESCE(left_at, NOW()),
                updated_at = NOW()
            WHERE room_id = v_room_id
              AND user_id = v_visit.doctor_profile_id
              AND left_at IS NULL;

            INSERT INTO public.emergency_chat_participants (
                room_id,
                user_id,
                role,
                display_name_snapshot
            )
            VALUES (
                v_room_id,
                v_new_doctor.profile_id,
                'provider',
                v_new_doctor.name
            )
            ON CONFLICT (room_id, user_id) DO UPDATE
            SET role = 'provider',
                display_name_snapshot = EXCLUDED.display_name_snapshot,
                left_at = NULL,
                updated_at = NOW();
        END IF;

    ELSIF v_action = 'start' THEN
        IF v_visit.status <> 'upcoming' THEN
            RAISE EXCEPTION 'Only an upcoming visit can be started';
        END IF;

        IF NOT (v_is_admin OR v_is_org_admin OR v_is_clinician) THEN
            RAISE EXCEPTION 'Unauthorized: assigned clinician or schedule administrator required';
        END IF;

        IF NOW() < v_visit.scheduled_start_at - INTERVAL '30 minutes'
           OR NOW() > v_visit.scheduled_end_at + INTERVAL '30 minutes' THEN
            RAISE EXCEPTION 'Visit can start only within its clinical window';
        END IF;

        UPDATE public.visits
        SET status = 'in_progress',
            lifecycle_state = 'in_progress',
            lifecycle_updated_at = NOW(),
            updated_at = NOW()
        WHERE id = p_visit_id;

    ELSIF v_action = 'complete' THEN
        IF v_visit.status <> 'in_progress' THEN
            RAISE EXCEPTION 'Only an in-progress visit can be completed';
        END IF;

        IF NOT (v_is_admin OR v_is_org_admin OR v_is_clinician) THEN
            RAISE EXCEPTION 'Unauthorized: assigned clinician or schedule administrator required';
        END IF;

        UPDATE public.visits
        SET status = 'completed',
            lifecycle_state = 'completed',
            lifecycle_updated_at = NOW(),
            updated_at = NOW()
        WHERE id = p_visit_id;

        UPDATE public.emergency_chat_rooms
        SET status = 'archived',
            archived_at = COALESCE(archived_at, NOW()),
            updated_at = NOW()
        WHERE channel_type = 'telemedicine_async'
          AND visit_id = p_visit_id
          AND status <> 'archived';

    ELSE
        IF v_visit.status <> 'upcoming' OR NOW() < v_visit.scheduled_start_at + INTERVAL '15 minutes' THEN
            RAISE EXCEPTION 'No-show is available 15 minutes after an upcoming visit starts';
        END IF;

        IF NOT (v_is_admin OR v_is_org_admin OR v_is_clinician) THEN
            RAISE EXCEPTION 'Unauthorized: assigned clinician or schedule administrator required';
        END IF;

        UPDATE public.visits
        SET status = 'cancelled',
            lifecycle_state = 'no_show',
            lifecycle_updated_at = NOW(),
            updated_at = NOW()
        WHERE id = p_visit_id;

        UPDATE public.emergency_chat_rooms
        SET status = 'archived',
            archived_at = COALESCE(archived_at, NOW()),
            updated_at = NOW()
        WHERE channel_type = 'telemedicine_async'
          AND visit_id = p_visit_id
          AND status <> 'archived';
    END IF;

    INSERT INTO public.user_activity (
        user_id,
        action,
        entity_type,
        entity_id,
        description,
        metadata
    )
    VALUES (
        v_actor_id,
        'scheduled_visit.' || v_action,
        'visit',
        p_visit_id,
        NULLIF(BTRIM(COALESCE(p_reason, '')), ''),
        jsonb_build_object(
            'service_role', v_is_service_role,
            'previous_status', v_visit.status,
            'new_start_at', p_scheduled_start_at,
            'transition_event_id', v_transition_event_id
        )
    );

    SELECT visit.*
    INTO v_visit
    FROM public.visits visit
    WHERE visit.id = p_visit_id;

    SELECT doctor.profile_id
    INTO v_current_doctor_profile_id
    FROM public.doctors doctor
    WHERE doctor.id = v_visit.doctor_id;

    v_notification_title := CASE v_action
        WHEN 'cancel' THEN 'Visit cancelled'
        WHEN 'reschedule' THEN 'Visit rescheduled'
        WHEN 'start' THEN 'Visit started'
        WHEN 'complete' THEN 'Visit completed'
        ELSE 'Visit marked as missed'
    END;
    v_notification_message := CASE v_action
        WHEN 'cancel' THEN 'This scheduled visit was cancelled.'
        WHEN 'reschedule' THEN 'This visit has a new appointment time.'
        WHEN 'start' THEN 'The clinician started this scheduled visit.'
        WHEN 'complete' THEN 'The clinician completed this scheduled visit.'
        ELSE 'This scheduled visit was marked as a no-show.'
    END;

    IF v_visit.user_id IS NOT NULL AND v_actor_id IS DISTINCT FROM v_visit.user_id THEN
        PERFORM public.emit_canonical_notification(
            p_event_key => 'scheduled_visit:' || p_visit_id::TEXT
                || ':transition:' || v_transition_event_id::TEXT,
            p_recipient_user_id => v_visit.user_id,
            p_type => 'visit',
            p_title => v_notification_title,
            p_message => v_notification_message,
            p_priority => CASE WHEN v_action IN ('cancel', 'no_show') THEN 'high' ELSE 'normal' END,
            p_action_type => 'view_scheduled_visit',
            p_target_id => p_visit_id,
            p_action_data => jsonb_build_object('id', p_visit_id, 'visitId', p_visit_id),
            p_metadata => jsonb_build_object(
                'eventName', 'scheduled_visit.' || v_action,
                'visitId', p_visit_id,
                'transitionEventId', v_transition_event_id,
                'scheduledStartAt', v_visit.scheduled_start_at
            ),
            p_icon => 'calendar-outline',
            p_color => CASE WHEN v_action IN ('cancel', 'no_show') THEN 'warning' ELSE 'info' END
        );
    END IF;

    IF v_current_doctor_profile_id IS NOT NULL
       AND v_actor_id IS DISTINCT FROM v_current_doctor_profile_id THEN
        PERFORM public.emit_canonical_notification(
            p_event_key => 'scheduled_visit:' || p_visit_id::TEXT
                || ':transition:' || v_transition_event_id::TEXT,
            p_recipient_user_id => v_current_doctor_profile_id,
            p_type => 'visit',
            p_title => v_notification_title,
            p_message => v_notification_message,
            p_priority => CASE WHEN v_action IN ('cancel', 'no_show') THEN 'high' ELSE 'normal' END,
            p_action_type => 'view_scheduled_visit',
            p_target_id => p_visit_id,
            p_action_data => jsonb_build_object('id', p_visit_id, 'visitId', p_visit_id),
            p_metadata => jsonb_build_object(
                'eventName', 'scheduled_visit.' || v_action,
                'visitId', p_visit_id,
                'transitionEventId', v_transition_event_id,
                'scheduledStartAt', v_visit.scheduled_start_at
            ),
            p_icon => 'calendar-outline',
            p_color => CASE WHEN v_action IN ('cancel', 'no_show') THEN 'warning' ELSE 'info' END
        );
    END IF;

    IF v_action = 'reschedule'
       AND v_previous_doctor_profile_id IS NOT NULL
       AND v_previous_doctor_profile_id IS DISTINCT FROM v_current_doctor_profile_id
       AND v_actor_id IS DISTINCT FROM v_previous_doctor_profile_id THEN
        PERFORM public.emit_canonical_notification(
            p_event_key => 'scheduled_visit:' || p_visit_id::TEXT
                || ':transition:' || v_transition_event_id::TEXT || ':reassigned',
            p_recipient_user_id => v_previous_doctor_profile_id,
            p_type => 'visit',
            p_title => 'Visit reassigned',
            p_message => 'A rescheduled visit is no longer assigned to you.',
            p_priority => 'normal',
            p_action_type => 'view_scheduled_visit',
            p_target_id => p_visit_id,
            p_action_data => jsonb_build_object('id', p_visit_id, 'visitId', p_visit_id),
            p_metadata => jsonb_build_object(
                'eventName', 'scheduled_visit.reassigned',
                'visitId', p_visit_id,
                'transitionEventId', v_transition_event_id
            ),
            p_icon => 'calendar-outline',
            p_color => 'info'
        );
    END IF;

    RETURN to_jsonb(v_visit);
END;
$$;

DROP FUNCTION IF EXISTS public.send_async_consult_message(
    UUID,
    TEXT,
    TEXT,
    TEXT,
    JSONB,
    TEXT,
    TEXT,
    BIGINT,
    INTEGER,
    BOOLEAN
);

CREATE OR REPLACE FUNCTION public.send_async_consult_message(
    p_room_id UUID,
    p_body TEXT,
    p_kind TEXT DEFAULT 'text',
    p_client_message_id TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::JSONB,
    p_attachment_storage_path TEXT DEFAULT NULL,
    p_attachment_mime_type TEXT DEFAULT NULL,
    p_attachment_size_bytes BIGINT DEFAULT NULL,
    p_attachment_duration_ms INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_kind TEXT := LOWER(BTRIM(COALESCE(p_kind, 'text')));
    v_body TEXT := BTRIM(COALESCE(p_body, ''));
    v_client_message_id TEXT := NULLIF(BTRIM(COALESCE(p_client_message_id, '')), '');
    v_attachment_path TEXT := NULLIF(BTRIM(COALESCE(p_attachment_storage_path, '')), '');
    v_attachment_mime TEXT := LOWER(NULLIF(BTRIM(COALESCE(p_attachment_mime_type, '')), ''));
    v_sender_role TEXT;
    v_visit_id UUID;
    v_patient_id UUID;
    v_doctor_profile_id UUID;
    v_recipient_id UUID;
    v_room RECORD;
    v_message public.emergency_chat_messages%ROWTYPE;
    v_object_size BIGINT;
    v_object_mime TEXT;
BEGIN
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    IF p_room_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: consult room outside actor scope';
    END IF;

    IF v_kind NOT IN ('text', 'image', 'video') THEN
        RAISE EXCEPTION 'Unsupported consult message kind';
    END IF;

    IF char_length(v_body) < 1 OR char_length(v_body) > 1000 THEN
        RAISE EXCEPTION 'Message must be between 1 and 1000 characters';
    END IF;

    IF v_client_message_id IS NOT NULL AND char_length(v_client_message_id) > 120 THEN
        RAISE EXCEPTION 'Client message id cannot exceed 120 characters';
    END IF;

    IF p_metadata IS NULL
       OR jsonb_typeof(p_metadata) <> 'object'
       OR octet_length(p_metadata::TEXT) > 4096 THEN
        RAISE EXCEPTION 'Message metadata must be an object no larger than 4096 bytes';
    END IF;

    SELECT room.visit_id
    INTO v_visit_id
    FROM public.emergency_chat_rooms room
    WHERE room.id = p_room_id
      AND room.channel_type = 'telemedicine_async';

    IF NOT FOUND OR v_visit_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: consult room outside actor scope';
    END IF;

    SELECT visit.user_id, doctor.profile_id
    INTO v_patient_id, v_doctor_profile_id
    FROM public.visits visit
    LEFT JOIN public.doctors doctor ON doctor.id = visit.doctor_id
    WHERE visit.id = v_visit_id
      AND visit.care_mode = 'telemedicine_async'
      AND visit.request_id IS NULL
      AND visit.status IN ('upcoming', 'in_progress')
    FOR UPDATE OF visit;

    IF NOT FOUND
       OR (
           v_actor_id IS DISTINCT FROM v_patient_id
           AND v_actor_id IS DISTINCT FROM v_doctor_profile_id
       ) THEN
        RAISE EXCEPTION 'Unauthorized: consult room outside actor scope';
    END IF;

    SELECT room.status, room.visit_id
    INTO v_room
    FROM public.emergency_chat_rooms room
    WHERE room.id = p_room_id
      AND room.channel_type = 'telemedicine_async'
      AND room.visit_id = v_visit_id
    FOR UPDATE;

    IF NOT FOUND OR v_room.status <> 'active' THEN
        RAISE EXCEPTION 'Consult room is not active';
    END IF;

    SELECT participant.role
    INTO v_sender_role
    FROM public.emergency_chat_participants participant
    WHERE participant.room_id = p_room_id
      AND participant.user_id = v_actor_id
      AND participant.left_at IS NULL
    FOR UPDATE;

    IF v_sender_role IS NULL THEN
        PERFORM public.ensure_async_consult_room(v_room.visit_id);

        SELECT participant.role
        INTO v_sender_role
        FROM public.emergency_chat_participants participant
        WHERE participant.room_id = p_room_id
          AND participant.user_id = v_actor_id
          AND participant.left_at IS NULL
        FOR UPDATE;
    END IF;

    IF v_sender_role IS NULL OR v_sender_role NOT IN ('patient', 'provider') THEN
        RAISE EXCEPTION 'Only the patient or assigned clinician can send consult messages';
    END IF;

    IF v_client_message_id IS NOT NULL THEN
        SELECT message.*
        INTO v_message
        FROM public.emergency_chat_messages message
        WHERE message.room_id = p_room_id
          AND message.sender_id = v_actor_id
          AND message.client_message_id = v_client_message_id
        LIMIT 1;

        IF v_message.id IS NOT NULL THEN
            IF v_message.kind IS DISTINCT FROM v_kind
               OR v_message.body IS DISTINCT FROM v_body
               OR v_message.metadata IS DISTINCT FROM p_metadata
               OR v_message.attachment_storage_path IS DISTINCT FROM v_attachment_path
               OR v_message.attachment_mime_type IS DISTINCT FROM v_attachment_mime
               OR v_message.attachment_size_bytes IS DISTINCT FROM p_attachment_size_bytes
               OR v_message.attachment_duration_ms IS DISTINCT FROM p_attachment_duration_ms
               OR v_message.ai_assisted IS DISTINCT FROM false THEN
                RAISE EXCEPTION 'Client message id was already used for another message';
            END IF;
            RETURN to_jsonb(v_message);
        END IF;
    END IF;

    IF v_kind = 'text' THEN
        IF v_attachment_path IS NOT NULL
           OR v_attachment_mime IS NOT NULL
           OR p_attachment_size_bytes IS NOT NULL
           OR p_attachment_duration_ms IS NOT NULL THEN
            RAISE EXCEPTION 'Text messages cannot include attachment fields';
        END IF;
    ELSE
        IF v_attachment_path IS NULL
           OR v_attachment_mime IS NULL
           OR p_attachment_size_bytes IS NULL THEN
            RAISE EXCEPTION 'Attachment path, MIME type, and size are required';
        END IF;

        IF v_attachment_path NOT LIKE (
            'telemedicine/' || p_room_id::TEXT || '/' || v_actor_id::TEXT || '/%'
        ) THEN
            RAISE EXCEPTION 'Attachment path does not belong to this room and sender';
        END IF;

        SELECT
            CASE
                WHEN COALESCE(object.metadata->>'size', '') ~ '^[0-9]+$'
                THEN (object.metadata->>'size')::BIGINT
                ELSE NULL
            END,
            LOWER(NULLIF(object.metadata->>'mimetype', ''))
        INTO v_object_size, v_object_mime
        FROM storage.objects object
        WHERE object.bucket_id = 'documents'
          AND object.name = v_attachment_path
        FOR SHARE;

        IF NOT FOUND OR v_object_size IS NULL OR v_object_size <> p_attachment_size_bytes THEN
            RAISE EXCEPTION 'Attachment object size could not be verified';
        END IF;

        IF v_object_mime IS NULL OR v_object_mime <> v_attachment_mime THEN
            RAISE EXCEPTION 'Attachment MIME type could not be verified';
        END IF;

        IF v_kind = 'image' THEN
            IF v_attachment_mime NOT IN ('image/jpeg', 'image/png', 'image/webp')
               OR p_attachment_size_bytes NOT BETWEEN 1 AND 10485760
               OR p_attachment_duration_ms IS NOT NULL THEN
                RAISE EXCEPTION 'Image attachment is outside the supported contract';
            END IF;
        ELSE
            IF v_attachment_mime NOT IN ('video/mp4', 'video/webm', 'video/quicktime')
               OR p_attachment_size_bytes NOT BETWEEN 1 AND 26214400
               OR p_attachment_duration_ms IS NULL
               OR p_attachment_duration_ms NOT BETWEEN 1 AND 30000 THEN
                RAISE EXCEPTION 'Video attachment is outside the supported contract';
            END IF;
        END IF;
    END IF;

    INSERT INTO public.emergency_chat_messages (
        room_id,
        sender_id,
        sender_role,
        kind,
        body,
        client_message_id,
        metadata,
        attachment_storage_path,
        attachment_mime_type,
        attachment_size_bytes,
        attachment_duration_ms,
        ai_assisted
    )
    VALUES (
        p_room_id,
        v_actor_id,
        v_sender_role,
        v_kind,
        v_body,
        v_client_message_id,
        p_metadata,
        v_attachment_path,
        v_attachment_mime,
        p_attachment_size_bytes,
        p_attachment_duration_ms,
        false
    )
    RETURNING * INTO v_message;

    UPDATE public.emergency_chat_rooms
    SET last_message_at = v_message.created_at,
        updated_at = NOW()
    WHERE id = p_room_id;

    UPDATE public.emergency_chat_participants
    SET last_read_message_id = v_message.id,
        last_read_at = v_message.created_at,
        updated_at = NOW()
    WHERE room_id = p_room_id
      AND user_id = v_actor_id
      AND left_at IS NULL;

    v_recipient_id := CASE
        WHEN v_actor_id = v_patient_id THEN v_doctor_profile_id
        ELSE v_patient_id
    END;

    IF v_recipient_id IS NOT NULL THEN
        PERFORM public.emit_canonical_notification(
            p_event_key => 'async_consult_message:' || v_message.id::TEXT || ':received',
            p_recipient_user_id => v_recipient_id,
            p_type => 'visit',
            p_title => 'New consult message',
            p_message => CASE v_kind
                WHEN 'image' THEN 'A new image was shared in your visit.'
                WHEN 'video' THEN 'A new video was shared in your visit.'
                ELSE 'A new message was sent in your visit.'
            END,
            p_priority => 'high',
            p_action_type => 'open_async_consult',
            p_target_id => v_visit_id,
            p_action_data => jsonb_build_object(
                'id', v_visit_id,
                'visitId', v_visit_id,
                'roomId', p_room_id,
                'messageId', v_message.id
            ),
            p_metadata => jsonb_build_object(
                'eventName', 'async_consult_message.received',
                'visitId', v_visit_id,
                'roomId', p_room_id,
                'messageId', v_message.id,
                'kind', v_kind
            ),
            p_icon => 'chatbubble-outline',
            p_color => 'info'
        );
    END IF;

    RETURN to_jsonb(v_message);
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_async_consult_room_read(
    p_room_id UUID,
    p_message_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_message_id UUID := p_message_id;
    v_visit_id UUID;
    v_patient_id UUID;
    v_doctor_profile_id UUID;
    v_sender_role TEXT;
BEGIN
    IF v_actor_id IS NULL OR p_room_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: consult room outside actor scope';
    END IF;

    SELECT room.visit_id
    INTO v_visit_id
    FROM public.emergency_chat_rooms room
    WHERE room.id = p_room_id
      AND room.channel_type = 'telemedicine_async';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Consult room not found';
    END IF;

    SELECT visit.user_id, doctor.profile_id
    INTO v_patient_id, v_doctor_profile_id
    FROM public.visits visit
    LEFT JOIN public.doctors doctor ON doctor.id = visit.doctor_id
    WHERE visit.id = v_visit_id
      AND visit.care_mode = 'telemedicine_async'
      AND visit.request_id IS NULL
    FOR UPDATE OF visit;

    IF NOT FOUND
       OR (
           v_actor_id IS DISTINCT FROM v_patient_id
           AND v_actor_id IS DISTINCT FROM v_doctor_profile_id
       ) THEN
        RAISE EXCEPTION 'Unauthorized: consult room outside actor scope';
    END IF;

    PERFORM 1
    FROM public.emergency_chat_rooms room
    WHERE room.id = p_room_id
      AND room.channel_type = 'telemedicine_async'
      AND room.visit_id = v_visit_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Consult room not found';
    END IF;

    SELECT participant.role
    INTO v_sender_role
    FROM public.emergency_chat_participants participant
    WHERE participant.room_id = p_room_id
      AND participant.user_id = v_actor_id
      AND participant.left_at IS NULL
    FOR UPDATE;

    IF v_sender_role IS NULL THEN
        PERFORM public.ensure_async_consult_room(v_visit_id);

        SELECT participant.role
        INTO v_sender_role
        FROM public.emergency_chat_participants participant
        WHERE participant.room_id = p_room_id
          AND participant.user_id = v_actor_id
          AND participant.left_at IS NULL
        FOR UPDATE;
    END IF;

    IF v_sender_role IS NULL OR v_sender_role NOT IN ('patient', 'provider') THEN
        RAISE EXCEPTION 'Only the patient or assigned clinician can update consult read state';
    END IF;

    IF v_message_id IS NULL THEN
        SELECT message.id
        INTO v_message_id
        FROM public.emergency_chat_messages message
        WHERE message.room_id = p_room_id
          AND message.deleted_at IS NULL
        ORDER BY message.created_at DESC
        LIMIT 1;
    ELSE
        PERFORM 1
        FROM public.emergency_chat_messages message
        WHERE message.id = v_message_id
          AND message.room_id = p_room_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Message does not belong to consult room';
        END IF;
    END IF;

    UPDATE public.emergency_chat_participants
    SET last_read_message_id = v_message_id,
        last_read_at = NOW(),
        updated_at = NOW()
    WHERE room_id = p_room_id
      AND user_id = v_actor_id
      AND left_at IS NULL;

    RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.p_scheduled_visit_duration(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.p_select_bookable_doctor(UUID, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_book_visit_availability(UUID, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_console_doctor_schedules(UUID, DATE, DATE) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.confirm_hospital_timezone(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.upsert_doctor_schedule(UUID, DATE, TIME, TIME, TEXT, BOOLEAN, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_doctor_schedule(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ensure_async_consult_room(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.book_scheduled_visit(UUID, TEXT, TEXT, TIMESTAMPTZ, UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.transition_scheduled_visit(UUID, TEXT, TIMESTAMPTZ, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.send_async_consult_message(UUID, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, BIGINT, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_async_consult_room_read(UUID, UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_book_visit_availability(UUID, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_console_doctor_schedules(UUID, DATE, DATE) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.confirm_hospital_timezone(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.upsert_doctor_schedule(UUID, DATE, TIME, TIME, TEXT, BOOLEAN, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_doctor_schedule(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ensure_async_consult_room(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.book_scheduled_visit(UUID, TEXT, TEXT, TIMESTAMPTZ, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transition_scheduled_visit(UUID, TEXT, TIMESTAMPTZ, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.send_async_consult_message(UUID, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, BIGINT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_async_consult_room_read(UUID, UUID) TO authenticated;
-- END SCHEDULED_VISITS_ASYNC_CONSULT_RPCS


REVOKE ALL ON FUNCTION public.console_create_emergency_request(JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.console_update_emergency_request(UUID, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.console_dispatch_emergency(UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.console_complete_emergency(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.console_cancel_emergency(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.console_update_responder_location(UUID, JSONB, DOUBLE PRECISION) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.patient_update_emergency_request(UUID, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.assign_ambulance_to_emergency(UUID, UUID, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.auto_assign_ambulance(UUID, INTEGER, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_emergency_v4(UUID, JSONB, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.approve_demo_cash_payment(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.approve_cash_payment(UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.decline_cash_payment(UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.process_cash_payment_v2(UUID, UUID, NUMERIC, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.discharge_patient(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_bed_reservation(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_trip(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_trip(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_emergency_transition_context(TEXT, TEXT, UUID, TEXT, JSONB, BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_cash_approval_org_admins(UUID, UUID, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.notify_cash_approval_org_admins_internal(UUID, UUID, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.process_cash_payment(UUID, UUID, NUMERIC) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.process_wallet_payment(UUID, NUMERIC, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ensure_emergency_chat_room(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.send_emergency_chat_message(UUID, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_emergency_chat_room_read(UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.archive_emergency_chat_room_on_request_close() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.console_create_emergency_request(JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.console_update_emergency_request(UUID, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.console_dispatch_emergency(UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.console_complete_emergency(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.console_cancel_emergency(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.console_update_responder_location(UUID, JSONB, DOUBLE PRECISION) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.patient_update_emergency_request(UUID, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.assign_ambulance_to_emergency(UUID, UUID, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.auto_assign_ambulance(UUID, INTEGER, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_emergency_v4(UUID, JSONB, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.approve_demo_cash_payment(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.approve_cash_payment(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.decline_cash_payment(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.process_cash_payment_v2(UUID, UUID, NUMERIC, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.discharge_patient(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_bed_reservation(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_trip(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_trip(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_emergency_transition_context(TEXT, TEXT, UUID, TEXT, JSONB, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION public.notify_cash_approval_org_admins(UUID, UUID, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.notify_cash_approval_org_admins_internal(UUID, UUID, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.process_cash_payment(UUID, UUID, NUMERIC) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.process_wallet_payment(UUID, NUMERIC, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ensure_emergency_chat_room(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.send_emergency_chat_message(UUID, TEXT, TEXT, TEXT, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_emergency_chat_room_read(UUID, UUID) TO authenticated, service_role;

-- ============================================================
-- Console identity and organization onboarding
-- ============================================================
-- BEGIN CONSOLE_ONBOARDING_RPCS

CREATE OR REPLACE FUNCTION public.get_console_identity_projection()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_profile public.profiles%ROWTYPE;
    v_org public.organizations%ROWTYPE;
    v_facility_ids UUID[] := ARRAY[]::UUID[];
    v_primary_facility_id UUID;
    v_wallet_ready BOOLEAN := false;
    v_scope_state TEXT;
BEGIN
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT * INTO v_profile
    FROM public.profiles
    WHERE id = v_actor_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'profile', NULL,
            'profileSource', 'unavailable',
            'organizationScope', jsonb_build_object(
                'organizationId', NULL,
                'organizationDisplayId', NULL,
                'facilityIds', '[]'::JSONB,
                'primaryFacilityId', NULL,
                'walletInitialized', NULL,
                'state', 'unavailable'
            )
        );
    END IF;

    IF v_profile.organization_id IS NULL THEN
        v_scope_state := CASE
            WHEN v_profile.onboarding_status IN ('pending', 'skipped') THEN 'pending_onboarding'
            ELSE 'missing_org'
        END;
    ELSE
        SELECT * INTO v_org
        FROM public.organizations
        WHERE id = v_profile.organization_id;

        IF FOUND THEN
            v_scope_state := 'ready';

            SELECT COALESCE(
                array_agg(
                    facility.id
                    ORDER BY (facility.org_admin_id = v_actor_id) DESC, facility.created_at ASC
                ),
                ARRAY[]::UUID[]
            )
            INTO v_facility_ids
            FROM public.hospitals facility
            WHERE facility.organization_id = v_org.id;

            v_primary_facility_id := v_facility_ids[1];

            SELECT EXISTS (
                SELECT 1
                FROM public.organization_wallets wallet
                WHERE wallet.organization_id = v_org.id
            ) INTO v_wallet_ready;
        ELSIF EXISTS (
            SELECT 1 FROM public.hospitals WHERE id = v_profile.organization_id
        ) THEN
            v_scope_state := 'hospital_id_mismatch';
        ELSE
            v_scope_state := 'missing_org';
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'profile', to_jsonb(v_profile),
        'profileSource', 'backend_profile',
        'organizationScope', jsonb_build_object(
            'organizationId', CASE WHEN v_scope_state = 'ready' THEN v_org.id ELSE NULL END,
            'organizationDisplayId', CASE WHEN v_scope_state = 'ready' THEN v_org.display_id ELSE NULL END,
            'facilityIds', CASE
                WHEN v_scope_state = 'ready' THEN to_jsonb(v_facility_ids)
                ELSE '[]'::JSONB
            END,
            'primaryFacilityId', v_primary_facility_id,
            'walletInitialized', CASE WHEN v_scope_state = 'ready' THEN v_wallet_ready ELSE NULL END,
            'verificationStatus', CASE WHEN v_scope_state = 'ready' THEN v_org.verification_status ELSE NULL END,
            'state', v_scope_state
        )
    );
END;
$$;

DROP FUNCTION IF EXISTS public.search_onboarding_facilities(TEXT);
CREATE OR REPLACE FUNCTION public.search_onboarding_facilities(p_query TEXT)
RETURNS TABLE (
    id UUID,
    name TEXT,
    address TEXT,
    provider_type TEXT,
    verification_status TEXT,
    ownership_state TEXT,
    claim_status TEXT,
    claimable BOOLEAN,
    requires_support BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_query TEXT := BTRIM(COALESCE(p_query, ''));
BEGIN
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF LENGTH(v_query) < 3 OR LENGTH(v_query) > 80 THEN
        RETURN;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.profiles profile
        WHERE profile.id = v_actor_id
          AND profile.organization_id IS NULL
          AND profile.onboarding_status IN ('pending', 'skipped')
    ) THEN
        RAISE EXCEPTION 'Registration account is not eligible';
    END IF;

    RETURN QUERY
    SELECT
        hospital.id,
        hospital.name,
        hospital.address,
        hospital.provider_type,
        hospital.verification_status,
        CASE
            WHEN hospital.organization_id IS NOT NULL THEN 'owned'
            WHEN active_claim.status IS NOT NULL THEN 'claim_pending'
            ELSE 'unowned'
        END,
        active_claim.status,
        hospital.organization_id IS NULL AND active_claim.status IS NULL,
        TRUE
    FROM public.hospitals hospital
    LEFT JOIN LATERAL (
        SELECT claim.status
        FROM public.organization_facility_claims claim
        WHERE claim.facility_id = hospital.id
          AND claim.status IN ('pending', 'changes_requested', 'approved')
        ORDER BY claim.created_at DESC
        LIMIT 1
    ) active_claim ON TRUE
    WHERE hospital.name ILIKE '%' || v_query || '%'
       OR hospital.address ILIKE '%' || v_query || '%'
    ORDER BY
        CASE WHEN hospital.name ILIKE v_query || '%' THEN 0 ELSE 1 END,
        hospital.name ASC
    LIMIT 8;
END;
$$;

CREATE OR REPLACE FUNCTION public.provision_console_organization(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_profile public.profiles%ROWTYPE;
    v_org public.organizations%ROWTYPE;
    v_facility public.hospitals%ROWTYPE;
    v_claim public.organization_facility_claims%ROWTYPE;
    v_org_type TEXT := LOWER(BTRIM(COALESCE(p_payload->>'organizationType', '')));
    v_org_name TEXT := BTRIM(COALESCE(p_payload->>'organizationName', ''));
    v_registration_number TEXT := NULLIF(BTRIM(COALESCE(p_payload->>'registrationNumber', '')), '');
    v_address TEXT := BTRIM(COALESCE(p_payload->>'address', ''));
    v_city TEXT := BTRIM(COALESCE(p_payload->>'city', ''));
    v_state TEXT := BTRIM(COALESCE(p_payload->>'state', ''));
    v_phone TEXT := NULLIF(BTRIM(COALESCE(p_payload->>'phone', '')), '');
    v_contact_email TEXT;
    v_full_address TEXT;
    v_latitude DOUBLE PRECISION;
    v_longitude DOUBLE PRECISION;
    v_existing_facility_text TEXT := NULLIF(BTRIM(COALESCE(p_payload->>'existingFacilityId', '')), '');
    v_existing_facility_id UUID;
    v_claim_note TEXT := NULLIF(BTRIM(COALESCE(p_payload->>'claimNote', '')), '');
    v_documents JSONB := COALESCE(p_payload->'documents', '[]'::JSONB);
    v_document JSONB;
    v_document_path TEXT;
    v_document_type TEXT;
    v_original_name TEXT;
    v_mime_type TEXT;
    v_size_text TEXT;
    v_size_bytes BIGINT;
    v_wallet_ready BOOLEAN;
    v_evidence_count INTEGER;
    v_inserted_count INTEGER;
    v_new_evidence_count INTEGER := 0;
BEGIN
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF v_existing_facility_text IS NOT NULL THEN
        IF v_existing_facility_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
            RAISE EXCEPTION 'FACILITY_SELECTION_INVALID';
        END IF;
        v_existing_facility_id := v_existing_facility_text::UUID;
    END IF;

    IF v_claim_note IS NOT NULL AND LENGTH(v_claim_note) > 1000 THEN
        RAISE EXCEPTION 'CLAIM_NOTE_INVALID';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended(v_actor_id::TEXT, 0));

    SELECT * INTO v_profile
    FROM public.profiles
    WHERE id = v_actor_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'PROFILE_NOT_READY';
    END IF;

    IF v_profile.organization_id IS NOT NULL THEN
        SELECT * INTO v_org
        FROM public.organizations
        WHERE id = v_profile.organization_id
          AND created_by = v_actor_id;

        IF NOT FOUND OR v_profile.role <> 'org_admin' THEN
            RAISE EXCEPTION 'ACCOUNT_ALREADY_SCOPED';
        END IF;

        SELECT * INTO v_facility
        FROM public.hospitals
        WHERE organization_id = v_org.id
        ORDER BY (org_admin_id = v_actor_id) DESC, created_at ASC
        LIMIT 1;

        IF NOT FOUND THEN
            SELECT * INTO v_claim
            FROM public.organization_facility_claims
            WHERE organization_id = v_org.id
            ORDER BY created_at ASC
            LIMIT 1;

            IF FOUND THEN
                SELECT * INTO v_facility
                FROM public.hospitals
                WHERE id = v_claim.facility_id;
            END IF;
        END IF;
    ELSE
        IF v_profile.role NOT IN ('patient', 'viewer')
           OR COALESCE(v_profile.onboarding_status, '') NOT IN ('pending', 'skipped') THEN
            RAISE EXCEPTION 'REGISTRATION_NOT_ELIGIBLE';
        END IF;

        IF COALESCE((p_payload->>'termsAccepted')::BOOLEAN, false) IS NOT TRUE THEN
            RAISE EXCEPTION 'TERMS_REQUIRED';
        END IF;

        IF v_org_type NOT IN ('hospital', 'clinic', 'ambulance_service') THEN
            RAISE EXCEPTION 'ORGANIZATION_TYPE_INVALID';
        END IF;

        IF v_existing_facility_id IS NOT NULL
           AND v_org_type NOT IN ('hospital', 'clinic') THEN
            RAISE EXCEPTION 'FACILITY_SELECTION_INVALID';
        END IF;

        IF LENGTH(v_org_name) < 2 OR LENGTH(v_org_name) > 160 THEN
            RAISE EXCEPTION 'ORGANIZATION_NAME_INVALID';
        END IF;

        IF LENGTH(v_address) < 4 OR LENGTH(v_address) > 240
           OR LENGTH(v_city) < 2 OR LENGTH(v_city) > 80
           OR LENGTH(v_state) < 2 OR LENGTH(v_state) > 80 THEN
            RAISE EXCEPTION 'ORGANIZATION_ADDRESS_INVALID';
        END IF;

        IF v_registration_number IS NOT NULL AND LENGTH(v_registration_number) > 80 THEN
            RAISE EXCEPTION 'REGISTRATION_NUMBER_INVALID';
        END IF;

        IF v_phone IS NOT NULL AND LENGTH(v_phone) > 40 THEN
            RAISE EXCEPTION 'PHONE_INVALID';
        END IF;

        v_contact_email := NULLIF(BTRIM(COALESCE(p_payload->>'contactEmail', v_profile.email, '')), '');
        IF v_contact_email IS NULL OR LENGTH(v_contact_email) > 254 OR POSITION('@' IN v_contact_email) = 0 THEN
            RAISE EXCEPTION 'CONTACT_EMAIL_INVALID';
        END IF;

        IF NULLIF(p_payload->>'latitude', '') IS NOT NULL THEN
            v_latitude := (p_payload->>'latitude')::DOUBLE PRECISION;
            IF v_latitude < -90 OR v_latitude > 90 THEN
                RAISE EXCEPTION 'LATITUDE_INVALID';
            END IF;
        END IF;

        IF NULLIF(p_payload->>'longitude', '') IS NOT NULL THEN
            v_longitude := (p_payload->>'longitude')::DOUBLE PRECISION;
            IF v_longitude < -180 OR v_longitude > 180 THEN
                RAISE EXCEPTION 'LONGITUDE_INVALID';
            END IF;
        END IF;

        IF (v_latitude IS NULL) <> (v_longitude IS NULL) THEN
            RAISE EXCEPTION 'LOCATION_INCOMPLETE';
        END IF;

        IF v_registration_number IS NOT NULL AND EXISTS (
            SELECT 1
            FROM public.organizations organization
            WHERE LOWER(organization.registration_number) = LOWER(v_registration_number)
              AND organization.verification_status <> 'rejected'
        ) THEN
            RAISE EXCEPTION 'REGISTRATION_NUMBER_EXISTS';
        END IF;

        v_full_address := CONCAT_WS(', ', v_address, v_city, v_state);

        IF v_existing_facility_id IS NOT NULL THEN
            PERFORM pg_advisory_xact_lock(hashtextextended(v_existing_facility_id::TEXT, 1));

            SELECT * INTO v_facility
            FROM public.hospitals
            WHERE id = v_existing_facility_id
            FOR UPDATE;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'FACILITY_SELECTION_NOT_FOUND';
            END IF;

            IF v_facility.organization_id IS NOT NULL THEN
                RAISE EXCEPTION 'FACILITY_ALREADY_OWNED';
            END IF;

            IF EXISTS (
                SELECT 1
                FROM public.organization_facility_claims claim
                WHERE claim.facility_id = v_existing_facility_id
                  AND claim.status IN ('pending', 'changes_requested', 'approved')
            ) THEN
                RAISE EXCEPTION 'FACILITY_CLAIM_ALREADY_ACTIVE';
            END IF;
        ELSIF v_org_type IN ('hospital', 'clinic') AND EXISTS (
            SELECT 1
            FROM public.hospitals hospital
            WHERE LOWER(BTRIM(hospital.name)) = LOWER(v_org_name)
              AND LOWER(BTRIM(hospital.address)) = LOWER(v_full_address)
        ) THEN
            RAISE EXCEPTION 'FACILITY_ALREADY_EXISTS';
        END IF;

        INSERT INTO public.organizations (
            name,
            organization_type,
            registration_number,
            contact_email,
            contact_phone,
            address,
            city,
            state,
            verification_status,
            created_by,
            is_active
        ) VALUES (
            v_org_name,
            v_org_type,
            v_registration_number,
            v_contact_email,
            v_phone,
            v_address,
            v_city,
            v_state,
            'pending',
            v_actor_id,
            true
        )
        RETURNING * INTO v_org;

        IF v_org_type IN ('hospital', 'clinic') THEN
            IF v_existing_facility_id IS NOT NULL THEN
                INSERT INTO public.organization_facility_claims (
                    organization_id,
                    facility_id,
                    submitted_by,
                    status,
                    claim_note
                ) VALUES (
                    v_org.id,
                    v_existing_facility_id,
                    v_actor_id,
                    'pending',
                    v_claim_note
                )
                RETURNING * INTO v_claim;
            ELSE
                INSERT INTO public.hospitals (
                    name,
                    address,
                    phone,
                    type,
                    latitude,
                    longitude,
                    verified,
                    verification_status,
                    status,
                    org_admin_id,
                    organization_id,
                    provider_type,
                    emergency_eligible,
                    booking_eligible,
                    provider_source
                ) VALUES (
                    v_org_name,
                    v_full_address,
                    v_phone,
                    CASE WHEN v_org_type = 'clinic' THEN 'clinic' ELSE 'standard' END,
                    v_latitude,
                    v_longitude,
                    false,
                    'pending',
                    'available',
                    v_actor_id,
                    v_org.id,
                    v_org_type,
                    v_org_type = 'hospital',
                    true,
                    'manual_seed'
                )
                RETURNING * INTO v_facility;
            END IF;
        END IF;

        UPDATE public.profiles
        SET role = 'org_admin',
            provider_type = v_org_type,
            organization_id = v_org.id,
            organization_name = v_org.name,
            onboarding_status = 'complete',
            updated_at = NOW()
        WHERE id = v_actor_id
        RETURNING * INTO v_profile;
    END IF;

    IF v_existing_facility_id IS NOT NULL
       AND v_facility.id IS DISTINCT FROM v_existing_facility_id THEN
        RAISE EXCEPTION 'FACILITY_SELECTION_CONFLICT';
    END IF;

    IF jsonb_typeof(v_documents) <> 'array' OR jsonb_array_length(v_documents) > 3 THEN
        RAISE EXCEPTION 'DOCUMENTS_INVALID';
    END IF;

    FOR v_document IN SELECT value FROM jsonb_array_elements(v_documents)
    LOOP
        v_document_path := BTRIM(COALESCE(v_document->>'storagePath', ''));
        v_document_type := LOWER(BTRIM(COALESCE(v_document->>'documentType', 'other')));
        v_original_name := BTRIM(COALESCE(v_document->>'originalName', ''));

        IF v_document_type NOT IN ('registration', 'license', 'identity', 'other')
           OR LENGTH(v_original_name) < 1 OR LENGTH(v_original_name) > 180
           OR v_document_path NOT LIKE 'onboarding/' || v_actor_id::TEXT || '/%'
           OR POSITION('..' IN v_document_path) > 0
           OR LOWER(storage.extension(v_document_path)) NOT IN ('pdf', 'jpg', 'jpeg', 'png') THEN
            RAISE EXCEPTION 'DOCUMENT_METADATA_INVALID';
        END IF;

        SELECT
            LOWER(COALESCE(object.metadata->>'mimetype', v_document->>'mimeType', '')),
            COALESCE(object.metadata->>'size', v_document->>'sizeBytes')
        INTO v_mime_type, v_size_text
        FROM storage.objects object
        WHERE object.bucket_id = 'documents'
          AND object.name = v_document_path
        LIMIT 1;

        IF NOT FOUND OR v_size_text !~ '^[0-9]+$' THEN
            RAISE EXCEPTION 'DOCUMENT_NOT_FOUND';
        END IF;

        v_size_bytes := v_size_text::BIGINT;
        IF v_mime_type NOT IN ('application/pdf', 'image/jpeg', 'image/png')
           OR v_size_bytes < 1 OR v_size_bytes > 10485760 THEN
            RAISE EXCEPTION 'DOCUMENT_FILE_INVALID';
        END IF;

        INSERT INTO public.organization_verification_documents (
            organization_id,
            facility_id,
            facility_claim_id,
            uploaded_by,
            document_type,
            storage_path,
            original_name,
            mime_type,
            size_bytes
        ) VALUES (
            v_org.id,
            v_facility.id,
            v_claim.id,
            v_actor_id,
            v_document_type,
            v_document_path,
            v_original_name,
            v_mime_type,
            v_size_bytes
        )
        ON CONFLICT (storage_path) DO NOTHING;

        GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
        v_new_evidence_count := v_new_evidence_count + v_inserted_count;
    END LOOP;

    IF v_new_evidence_count > 0 THEN
        IF v_claim.status = 'changes_requested' THEN
            UPDATE public.organization_facility_claims
            SET status = 'pending',
                review_note = NULL,
                reviewed_at = NULL,
                reviewed_by = NULL,
                updated_at = NOW()
            WHERE id = v_claim.id
            RETURNING * INTO v_claim;
        END IF;

        IF v_org.verification_status = 'changes_requested' THEN
            UPDATE public.organizations
            SET verification_status = 'pending',
                rejection_reason = NULL,
                verified_at = NULL,
                verified_by = NULL,
                updated_at = NOW()
            WHERE id = v_org.id
            RETURNING * INTO v_org;
        END IF;
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.organization_wallets wallet
        WHERE wallet.organization_id = v_org.id
    ) INTO v_wallet_ready;

    SELECT COUNT(*)::INTEGER INTO v_evidence_count
    FROM public.organization_verification_documents evidence
    WHERE evidence.organization_id = v_org.id;

    IF NOT v_wallet_ready THEN
        RAISE EXCEPTION 'WALLET_NOT_INITIALIZED';
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'provisioningVerified', true,
        'authUserId', v_actor_id,
        'profileId', v_actor_id,
        'role', 'org_admin',
        'user', jsonb_build_object(
            'id', v_actor_id,
            'display_id', v_profile.display_id
        ),
        'organization', jsonb_build_object(
            'id', v_org.id,
            'display_id', v_org.display_id,
            'name', v_org.name,
            'type', v_org.organization_type,
            'walletState', 'ready',
            'verificationStatus', v_org.verification_status
        ),
        'facility', CASE WHEN v_facility.id IS NULL THEN NULL ELSE jsonb_build_object(
            'id', v_facility.id,
            'display_id', v_facility.display_id,
            'verificationStatus', v_facility.verification_status,
            'dispatchEligible', v_facility.dispatch_eligible,
            'ownershipState', CASE
                WHEN v_facility.organization_id = v_org.id THEN 'owned'
                WHEN v_claim.id IS NOT NULL THEN 'claim_pending'
                ELSE 'unowned'
            END
        ) END,
        'claim', CASE WHEN v_claim.id IS NULL THEN NULL ELSE jsonb_build_object(
            'id', v_claim.id,
            'facilityId', v_claim.facility_id,
            'status', v_claim.status
        ) END,
        'verification', jsonb_build_object(
            'lane', 'organization',
            'status', v_org.verification_status
        ),
        'evidence', jsonb_build_object(
            'count', v_evidence_count,
            'status', CASE WHEN v_evidence_count > 0 THEN 'submitted' ELSE 'not_submitted' END
        )
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.review_organization_verification_document(
    p_document_id UUID,
    p_decision TEXT,
    p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_decision TEXT := LOWER(BTRIM(COALESCE(p_decision, '')));
    v_note TEXT := NULLIF(BTRIM(COALESCE(p_note, '')), '');
    v_status TEXT;
    v_document public.organization_verification_documents%ROWTYPE;
BEGIN
    IF v_actor_id IS NULL OR NOT public.p_is_admin() THEN
        RAISE EXCEPTION 'PLATFORM_ADMIN_REQUIRED';
    END IF;

    v_status := CASE v_decision
        WHEN 'accept' THEN 'accepted'
        WHEN 'approve' THEN 'accepted'
        WHEN 'reject' THEN 'rejected'
        WHEN 'request_changes' THEN 'changes_requested'
        ELSE NULL
    END;

    IF v_status IS NULL THEN
        RAISE EXCEPTION 'EVIDENCE_DECISION_INVALID';
    END IF;
    IF LENGTH(COALESCE(v_note, '')) > 1000 THEN
        RAISE EXCEPTION 'REVIEW_NOTE_INVALID';
    END IF;
    IF v_status IN ('rejected', 'changes_requested') AND v_note IS NULL THEN
        RAISE EXCEPTION 'REVIEW_NOTE_REQUIRED';
    END IF;

    SELECT * INTO v_document
    FROM public.organization_verification_documents
    WHERE id = p_document_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'EVIDENCE_NOT_FOUND';
    END IF;

    UPDATE public.organization_verification_documents
    SET review_status = v_status,
        reviewed_at = NOW(),
        reviewed_by = v_actor_id,
        rejection_reason = CASE
            WHEN v_status IN ('rejected', 'changes_requested') THEN v_note
            ELSE NULL
        END
    WHERE id = p_document_id
    RETURNING * INTO v_document;

    RETURN jsonb_build_object(
        'success', true,
        'documentId', v_document.id,
        'organizationId', v_document.organization_id,
        'facilityClaimId', v_document.facility_claim_id,
        'status', v_document.review_status,
        'reviewedAt', v_document.reviewed_at,
        'reviewedBy', v_document.reviewed_by
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.review_console_facility_claim(
    p_claim_id UUID,
    p_decision TEXT,
    p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_decision TEXT := LOWER(BTRIM(COALESCE(p_decision, '')));
    v_note TEXT := NULLIF(BTRIM(COALESCE(p_note, '')), '');
    v_status TEXT;
    v_claim public.organization_facility_claims%ROWTYPE;
    v_facility public.hospitals%ROWTYPE;
    v_org public.organizations%ROWTYPE;
BEGIN
    IF v_actor_id IS NULL OR NOT public.p_is_admin() THEN
        RAISE EXCEPTION 'PLATFORM_ADMIN_REQUIRED';
    END IF;

    v_status := CASE v_decision
        WHEN 'approve' THEN 'approved'
        WHEN 'reject' THEN 'rejected'
        WHEN 'request_changes' THEN 'changes_requested'
        ELSE NULL
    END;

    IF v_status IS NULL THEN
        RAISE EXCEPTION 'CLAIM_DECISION_INVALID';
    END IF;
    IF LENGTH(COALESCE(v_note, '')) > 1000 THEN
        RAISE EXCEPTION 'REVIEW_NOTE_INVALID';
    END IF;
    IF v_status IN ('rejected', 'changes_requested') AND v_note IS NULL THEN
        RAISE EXCEPTION 'REVIEW_NOTE_REQUIRED';
    END IF;

    SELECT * INTO v_claim
    FROM public.organization_facility_claims
    WHERE id = p_claim_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'FACILITY_CLAIM_NOT_FOUND';
    END IF;

    SELECT * INTO v_org
    FROM public.organizations
    WHERE id = v_claim.organization_id
    FOR UPDATE;

    SELECT * INTO v_facility
    FROM public.hospitals
    WHERE id = v_claim.facility_id
    FOR UPDATE;

    IF v_status = 'approved' THEN
        IF v_org.verification_status = 'rejected' THEN
            RAISE EXCEPTION 'ORGANIZATION_REJECTED';
        END IF;
        IF NOT EXISTS (
            SELECT 1
            FROM public.organization_verification_documents evidence
            WHERE evidence.organization_id = v_claim.organization_id
              AND evidence.facility_claim_id = v_claim.id
              AND evidence.review_status = 'accepted'
        ) THEN
            RAISE EXCEPTION 'ACCEPTED_CLAIM_EVIDENCE_REQUIRED';
        END IF;
        IF v_facility.organization_id IS NOT NULL
           AND v_facility.organization_id IS DISTINCT FROM v_claim.organization_id THEN
            RAISE EXCEPTION 'FACILITY_ALREADY_OWNED';
        END IF;

        UPDATE public.hospitals
        SET organization_id = v_claim.organization_id,
            org_admin_id = COALESCE(org_admin_id, v_claim.submitted_by),
            updated_at = NOW()
        WHERE id = v_claim.facility_id
        RETURNING * INTO v_facility;
    END IF;

    UPDATE public.organization_facility_claims
    SET status = v_status,
        review_note = v_note,
        reviewed_at = NOW(),
        reviewed_by = v_actor_id,
        updated_at = NOW()
    WHERE id = p_claim_id
    RETURNING * INTO v_claim;

    RETURN jsonb_build_object(
        'success', true,
        'claimId', v_claim.id,
        'organizationId', v_claim.organization_id,
        'facilityId', v_claim.facility_id,
        'status', v_claim.status,
        'facilityOwnershipLinked',
            v_status = 'approved'
            AND v_facility.organization_id = v_claim.organization_id,
        'organizationVerificationStatus', v_org.verification_status,
        'facilityVerificationStatus', v_facility.verification_status,
        'facilityDispatchEligible', v_facility.dispatch_eligible
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.review_console_organization(
    p_organization_id UUID,
    p_decision TEXT,
    p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_decision TEXT := LOWER(BTRIM(COALESCE(p_decision, '')));
    v_note TEXT := NULLIF(BTRIM(COALESCE(p_note, '')), '');
    v_status TEXT;
    v_org public.organizations%ROWTYPE;
    v_facility_count INTEGER;
    v_dispatch_ready_count INTEGER;
BEGIN
    IF v_actor_id IS NULL OR NOT public.p_is_admin() THEN
        RAISE EXCEPTION 'PLATFORM_ADMIN_REQUIRED';
    END IF;

    v_status := CASE v_decision
        WHEN 'approve' THEN 'verified'
        WHEN 'reject' THEN 'rejected'
        WHEN 'request_changes' THEN 'changes_requested'
        ELSE NULL
    END;

    IF v_status IS NULL THEN
        RAISE EXCEPTION 'ORGANIZATION_DECISION_INVALID';
    END IF;
    IF LENGTH(COALESCE(v_note, '')) > 1000 THEN
        RAISE EXCEPTION 'REVIEW_NOTE_INVALID';
    END IF;
    IF v_status IN ('rejected', 'changes_requested') AND v_note IS NULL THEN
        RAISE EXCEPTION 'REVIEW_NOTE_REQUIRED';
    END IF;

    SELECT * INTO v_org
    FROM public.organizations
    WHERE id = p_organization_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'ORGANIZATION_NOT_FOUND';
    END IF;

    IF v_status = 'verified' THEN
        IF NOT EXISTS (
            SELECT 1
            FROM public.organization_verification_documents evidence
            WHERE evidence.organization_id = v_org.id
              AND evidence.review_status = 'accepted'
        ) THEN
            RAISE EXCEPTION 'ACCEPTED_ORGANIZATION_EVIDENCE_REQUIRED';
        END IF;

        IF v_org.organization_type IN ('hospital', 'clinic')
           AND NOT EXISTS (
               SELECT 1
               FROM public.hospitals facility
               WHERE facility.organization_id = v_org.id
           ) THEN
            RAISE EXCEPTION 'ORGANIZATION_FACILITY_REQUIRED';
        END IF;
    END IF;

    UPDATE public.organizations
    SET verification_status = v_status,
        verified_at = CASE WHEN v_status = 'verified' THEN NOW() ELSE NULL END,
        verified_by = CASE WHEN v_status = 'verified' THEN v_actor_id ELSE NULL END,
        rejection_reason = CASE
            WHEN v_status IN ('rejected', 'changes_requested') THEN v_note
            ELSE NULL
        END,
        updated_at = NOW()
    WHERE id = p_organization_id
    RETURNING * INTO v_org;

    SELECT
        COUNT(*)::INTEGER,
        COUNT(*) FILTER (WHERE dispatch_eligible = true)::INTEGER
    INTO v_facility_count, v_dispatch_ready_count
    FROM public.hospitals
    WHERE organization_id = v_org.id;

    RETURN jsonb_build_object(
        'success', true,
        'organizationId', v_org.id,
        'status', v_org.verification_status,
        'verifiedAt', v_org.verified_at,
        'verifiedBy', v_org.verified_by,
        'facilityCount', v_facility_count,
        'dispatchReadyFacilityCount', v_dispatch_ready_count
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_console_user_invitation(
    p_target_user_id UUID,
    p_actor_user_id UUID,
    p_organization_id UUID,
    p_role TEXT,
    p_provider_type TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_actor public.profiles%ROWTYPE;
    v_target public.profiles%ROWTYPE;
    v_organization public.organizations%ROWTYPE;
    v_role TEXT := LOWER(BTRIM(COALESCE(p_role, '')));
    v_provider_type TEXT := NULLIF(LOWER(BTRIM(COALESCE(p_provider_type, ''))), '');
    v_invited_by TEXT;
    v_invited_at TIMESTAMPTZ;
BEGIN
    IF v_claims->>'role' <> 'service_role' THEN
        RAISE EXCEPTION 'Service receiver required';
    END IF;

    IF v_role NOT IN ('provider', 'viewer', 'dispatcher', 'org_admin', 'sponsor') THEN
        RAISE EXCEPTION 'INVITATION_ROLE_INVALID';
    END IF;

    IF v_role = 'provider'
       AND v_provider_type NOT IN ('hospital', 'ambulance_service', 'ambulance', 'doctor', 'driver', 'paramedic', 'pharmacy', 'clinic') THEN
        RAISE EXCEPTION 'INVITATION_PROVIDER_TYPE_REQUIRED';
    ELSIF v_role <> 'provider' THEN
        v_provider_type := NULL;
    END IF;

    SELECT * INTO v_actor
    FROM public.profiles
    WHERE id = p_actor_user_id;

    IF NOT FOUND OR v_actor.role NOT IN ('admin', 'org_admin') THEN
        RAISE EXCEPTION 'INVITATION_ACTOR_INVALID';
    END IF;

    SELECT * INTO v_organization
    FROM public.organizations
    WHERE id = p_organization_id
      AND is_active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'INVITATION_ORGANIZATION_INVALID';
    END IF;

    IF v_actor.role = 'org_admin'
       AND (
           v_actor.organization_id IS DISTINCT FROM p_organization_id
           OR v_role NOT IN ('provider', 'viewer', 'dispatcher')
       ) THEN
        RAISE EXCEPTION 'INVITATION_SCOPE_DENIED';
    END IF;

    SELECT * INTO v_target
    FROM public.profiles
    WHERE id = p_target_user_id
    FOR UPDATE;

    IF NOT FOUND
       OR v_target.organization_id IS NOT NULL
       OR v_target.role NOT IN ('patient', 'viewer')
       OR COALESCE(v_target.onboarding_status, '') NOT IN ('pending', 'skipped') THEN
        RAISE EXCEPTION 'INVITATION_TARGET_INVALID';
    END IF;

    SELECT
        user_row.raw_user_meta_data->>'invited_by',
        user_row.invited_at
    INTO v_invited_by, v_invited_at
    FROM auth.users user_row
    WHERE user_row.id = p_target_user_id;

    IF NOT FOUND
       OR v_invited_at IS NULL
       OR v_invited_by IS DISTINCT FROM p_actor_user_id::TEXT THEN
        RAISE EXCEPTION 'INVITATION_PROOF_INVALID';
    END IF;

    UPDATE public.profiles
    SET role = v_role,
        provider_type = v_provider_type,
        organization_id = v_organization.id,
        organization_name = v_organization.name,
        onboarding_status = 'complete',
        updated_at = NOW()
    WHERE id = p_target_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'profileId', p_target_user_id,
        'role', v_role,
        'providerType', v_provider_type,
        'organizationId', v_organization.id
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_console_identity_projection() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.search_onboarding_facilities(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.provision_console_organization(JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.review_organization_verification_document(UUID, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.review_console_facility_claim(UUID, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.review_console_organization(UUID, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_console_user_invitation(UUID, UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_profile_by_admin(UUID, JSONB) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_console_identity_projection() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.search_onboarding_facilities(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.provision_console_organization(JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.review_organization_verification_document(UUID, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.review_console_facility_claim(UUID, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.review_console_organization(UUID, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_console_user_invitation(UUID, UUID, UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_profile_by_admin(UUID, JSONB) TO authenticated, service_role;
-- END CONSOLE_ONBOARDING_RPCS

-- BEGIN DATA_ROOM_INVITE_RPC
CREATE OR REPLACE FUNCTION public.claim_document_invite(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_token TEXT := NULLIF(BTRIM(COALESCE(p_token, '')), '');
    v_user_email TEXT;
    v_invite public.document_invites%ROWTYPE;
    v_access public.access_requests%ROWTYPE;
    v_document_slug TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    IF v_token IS NULL OR LENGTH(v_token) < 32 OR LENGTH(v_token) > 256 THEN
        RAISE EXCEPTION 'Invite not found';
    END IF;

    SELECT LOWER(account.email)
    INTO v_user_email
    FROM auth.users AS account
    WHERE account.id = v_user_id;

    IF v_user_email IS NULL THEN
        RAISE EXCEPTION 'Invite does not belong to this account';
    END IF;

    SELECT invite.*
    INTO v_invite
    FROM public.document_invites AS invite
    WHERE invite.token = v_token
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invite not found';
    END IF;
    IF LOWER(v_invite.email) IS DISTINCT FROM v_user_email THEN
        RAISE EXCEPTION 'Invite does not belong to this account';
    END IF;

    SELECT request.*
    INTO v_access
    FROM public.access_requests AS request
    WHERE request.user_id = v_user_id
      AND request.document_id = v_invite.document_id
    FOR UPDATE;

    IF v_invite.claimed THEN
        IF v_invite.claimed_by IS DISTINCT FROM v_user_id THEN
            RAISE EXCEPTION 'Invite already claimed';
        END IF;
        IF NOT FOUND OR v_access.status IS DISTINCT FROM 'approved' THEN
            RAISE EXCEPTION 'Invite access is no longer approved';
        END IF;

        SELECT document.slug INTO v_document_slug
        FROM public.documents AS document
        WHERE document.id = v_invite.document_id;

        RETURN JSONB_BUILD_OBJECT(
            'document_id', v_invite.document_id,
            'document_slug', v_document_slug,
            'status', 'approved',
            'replayed', true
        );
    END IF;

    IF v_invite.expires_at IS NULL OR v_invite.expires_at <= NOW() THEN
        RAISE EXCEPTION 'Invite expired';
    END IF;
    IF NOT FOUND OR v_access.nda_signed_at IS NULL THEN
        RAISE EXCEPTION 'Signed access agreement required';
    END IF;
    IF v_access.status = 'revoked' THEN
        RAISE EXCEPTION 'Access was revoked';
    END IF;

    UPDATE public.access_requests
    SET status = 'approved', updated_at = NOW()
    WHERE id = v_access.id;

    UPDATE public.document_invites
    SET claimed = true, claimed_by = v_user_id
    WHERE id = v_invite.id;

    SELECT document.slug INTO v_document_slug
    FROM public.documents AS document
    WHERE document.id = v_invite.document_id;

    RETURN JSONB_BUILD_OBJECT(
        'document_id', v_invite.document_id,
        'document_slug', v_document_slug,
        'status', 'approved',
        'replayed', false
    );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_document_invite(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_document_invite(TEXT) TO authenticated, service_role;
-- END DATA_ROOM_INVITE_RPC
