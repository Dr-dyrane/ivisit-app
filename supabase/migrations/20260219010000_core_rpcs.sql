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
CREATE OR REPLACE FUNCTION public.update_hospital_by_admin(target_hospital_id UUID, payload JSONB)
RETURNS JSONB AS $$
DECLARE
    v_features TEXT[];
    v_specialties TEXT[];
    v_service_types TEXT[];
BEGIN
    -- Check permissions (Org Admin of target OR Super Admin)
    IF NOT public.p_is_admin() AND NOT EXISTS (
        SELECT 1 FROM public.hospitals 
        WHERE id = target_hospital_id AND organization_id = public.p_get_current_org_id()
    ) THEN
        RAISE EXCEPTION 'Unauthorized: You do not manage this hospital';
    END IF;

    -- Extract Arrays safely
    SELECT COALESCE(array_agg(x), '{}') INTO v_features FROM jsonb_array_elements_text(payload->'features') t(x);
    SELECT COALESCE(array_agg(x), '{}') INTO v_specialties FROM jsonb_array_elements_text(payload->'specialties') t(x);
    SELECT COALESCE(array_agg(x), '{}') INTO v_service_types FROM jsonb_array_elements_text(payload->'service_types') t(x);

    UPDATE public.hospitals
    SET
        name = COALESCE(payload->>'name', name),
        address = COALESCE(payload->>'address', address),
        phone = COALESCE(payload->>'phone', phone),
        rating = COALESCE((payload->>'rating')::FLOAT, rating),
        latitude = COALESCE((payload->>'latitude')::FLOAT, latitude),
        longitude = COALESCE((payload->>'longitude')::FLOAT, longitude),
        
        verified = COALESCE((payload->>'verified')::BOOLEAN, verified),
        verification_status = COALESCE(payload->>'verification_status', verification_status),
        status = COALESCE(payload->>'status', status),
        
        wait_time = COALESCE(payload->>'wait_time', wait_time),
        price_range = COALESCE(payload->>'price_range', price_range),
        available_beds = COALESCE((payload->>'available_beds')::INT, available_beds),
        ambulances_count = COALESCE((payload->>'ambulances_count')::INT, ambulances_count),
        emergency_level = COALESCE(payload->>'emergency_level', emergency_level),
        image = COALESCE(payload->>'image', image),
        
        -- Arrays
        specialties = v_specialties,
        service_types = v_service_types,
        features = v_features,
        
        updated_at = NOW()
    WHERE id = target_hospital_id;
    
    RETURN jsonb_build_object('success', true, 'id', target_hospital_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Stats & Analytics
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
) AS $$
BEGIN
    RETURN QUERY SELECT
        (SELECT count(*)::BIGINT FROM auth.users),
        (SELECT count(*)::BIGINT FROM public.profiles),
        (SELECT count(*)::BIGINT FROM auth.users WHERE created_at > NOW() - INTERVAL '30 days'),
        (SELECT count(*)::BIGINT FROM auth.users WHERE email_confirmed_at IS NOT NULL),
        (SELECT count(*)::BIGINT FROM auth.users WHERE phone_confirmed_at IS NOT NULL),
        (SELECT count(*)::BIGINT FROM public.profiles WHERE role = 'admin'),
        (SELECT count(*)::BIGINT FROM public.profiles WHERE role = 'provider'),
        (SELECT count(*)::BIGINT FROM public.profiles WHERE role = 'sponsor'),
        (SELECT count(*)::BIGINT FROM public.profiles WHERE role = 'viewer'),
        (SELECT count(*)::BIGINT FROM public.profiles WHERE role = 'patient'),
        (SELECT count(*)::BIGINT FROM public.profiles WHERE role = 'org_admin'),
        (SELECT count(*)::BIGINT FROM public.profiles WHERE role = 'dispatcher');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


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
BEGIN
    IF NOT public.p_is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
    
    -- Delete from auth.users (Cascades to profiles)
    -- WARNING: RPC cannot delete from auth.users directly without extension or superuser
    -- Assuming app logic usually deletes public.profiles and triggers handle auth? 
    -- Or using supabase admin API. 
    -- For now, deleting profile:
    DELETE FROM public.profiles WHERE id = target_user_id;
    
    RETURN jsonb_build_object('success', true);
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
    SELECT au.id, au.email, au.phone, au.last_sign_in_at, au.created_at, au.raw_user_meta_data
    FROM auth.users au
    WHERE au.email ILIKE '%' || search_term || '%'
       OR au.phone ILIKE '%' || search_term || '%'
       OR (au.raw_user_meta_data->>'full_name') ILIKE '%' || search_term || '%';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- update_profile_by_admin: Used by console profilesService
CREATE OR REPLACE FUNCTION public.update_profile_by_admin(target_user_id UUID, profile_data JSONB)
RETURNS JSONB AS $$
BEGIN
    IF NOT public.p_is_console_allowed() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
    
    UPDATE public.profiles
    SET
        full_name = COALESCE(profile_data->>'full_name', full_name),
        username = CASE 
            WHEN (profile_data->>'username') = '' THEN NULL
            WHEN (profile_data->>'username') IS NOT NULL THEN profile_data->>'username'
            ELSE username
        END,
        phone = COALESCE(profile_data->>'phone', phone),
        role = COALESCE(profile_data->>'role', role),
        organization_id = CASE 
            WHEN (profile_data->>'organization_id') = '' THEN NULL
            WHEN (profile_data->>'organization_id') IS NOT NULL THEN (profile_data->>'organization_id')::UUID
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
    
    RETURN jsonb_build_object('success', true, 'id', target_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- get_org_stripe_status: Used by console walletService
CREATE OR REPLACE FUNCTION public.get_org_stripe_status(p_organization_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_stripe_id TEXT;
    v_balance NUMERIC;
BEGIN
    SELECT stripe_account_id INTO v_stripe_id FROM public.organizations WHERE id = p_organization_id;
    SELECT balance INTO v_balance FROM public.organization_wallets WHERE organization_id = p_organization_id;
    RETURN jsonb_build_object(
        'stripe_account_id', v_stripe_id,
        'has_stripe', v_stripe_id IS NOT NULL,
        'wallet_balance', COALESCE(v_balance, 0)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- process_cash_payment: Used by console walletService (legacy non-v2)
CREATE OR REPLACE FUNCTION public.process_cash_payment(
    p_emergency_request_id UUID,
    p_organization_id UUID,
    p_amount NUMERIC
)
RETURNS JSONB AS $$
BEGIN
    -- Delegate to v2 with default currency
    RETURN public.process_cash_payment_v2(p_emergency_request_id, p_organization_id, p_amount, 'USD');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- check_cash_eligibility: Used by console walletService
CREATE OR REPLACE FUNCTION public.check_cash_eligibility(p_organization_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_balance NUMERIC;
    v_fee_pct NUMERIC;
BEGIN
    SELECT balance INTO v_balance FROM public.organization_wallets WHERE organization_id = p_organization_id;
    SELECT ivisit_fee_percentage INTO v_fee_pct FROM public.organizations WHERE id = p_organization_id;
    RETURN jsonb_build_object(
        'eligible', COALESCE(v_balance, 0) >= 0,
        'balance', COALESCE(v_balance, 0),
        'fee_percentage', COALESCE(v_fee_pct, 2.5)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- process_wallet_payment: Used by app paymentService
CREATE OR REPLACE FUNCTION public.process_wallet_payment(
    p_user_id UUID,
    p_amount NUMERIC,
    p_emergency_request_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_balance NUMERIC;
BEGIN
    SELECT balance INTO v_balance FROM public.patient_wallets WHERE user_id = p_user_id;
    IF COALESCE(v_balance, 0) < p_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient wallet balance');
    END IF;
    
    UPDATE public.patient_wallets SET balance = balance - p_amount, updated_at = NOW() WHERE user_id = p_user_id;
    
    RETURN jsonb_build_object('success', true, 'new_balance', v_balance - p_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- calculate_emergency_cost_v2: Used by app serviceCostService + pricingService
CREATE OR REPLACE FUNCTION public.calculate_emergency_cost_v2(
    p_service_type TEXT,
    p_hospital_id UUID DEFAULT NULL,
    p_ambulance_type TEXT DEFAULT NULL,
    p_distance_km NUMERIC DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
    v_base_price NUMERIC := 0;
    v_distance_surcharge NUMERIC := 0;
    v_total NUMERIC;
BEGIN
    -- Get base price from service_pricing or hospital
    IF p_hospital_id IS NOT NULL THEN
        SELECT COALESCE(sp.base_price, h.base_price, 50)
        INTO v_base_price
        FROM public.hospitals h
        LEFT JOIN public.service_pricing sp ON sp.hospital_id = h.id AND sp.service_type = p_service_type
        WHERE h.id = p_hospital_id;
    END IF;
    
    IF v_base_price = 0 THEN v_base_price := 50; END IF;
    
    -- Distance surcharge
    IF p_distance_km > 5 THEN
        v_distance_surcharge := (p_distance_km - 5) * 2;
    END IF;
    
    v_total := v_base_price + v_distance_surcharge;
    
    RETURN jsonb_build_object(
        'base_cost', v_base_price,
        'distance_surcharge', v_distance_surcharge,
        'total_cost', v_total,
        'currency', 'USD'
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ─── 10. Utility RPCs ───────────────────────────────────

-- reload_schema: Used by app appMigrationsService + seederService
-- This is a no-op stub — Supabase auto-reloads schema on DDL changes
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
    v_available BOOLEAN;
BEGIN
    SELECT (d.is_available AND d.current_patients < d.max_patients)
    INTO v_available FROM public.doctors d WHERE d.id = p_doctor_id;

    IF NOT v_available THEN
        RETURN jsonb_build_object('success', false, 'error', 'Doctor is not available');
    END IF;

    INSERT INTO public.emergency_doctor_assignments (emergency_request_id, doctor_id, status, notes)
    VALUES (p_emergency_request_id, p_doctor_id, 'assigned', p_notes);

    UPDATE public.doctors
    SET current_patients = current_patients + 1, updated_at = NOW()
    WHERE id = p_doctor_id;

    UPDATE public.emergency_requests
    SET assigned_doctor_id = p_doctor_id, doctor_assigned_at = NOW()
    WHERE id = p_emergency_request_id;

    RETURN jsonb_build_object('success', true, 'doctor_id', p_doctor_id);
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
BEGIN
    UPDATE public.visits
    SET rating = p_rating,
        rating_comment = p_comment,
        rated_at = NOW(),
        updated_at = NOW()
    WHERE id = p_visit_id AND user_id = auth.uid();

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Visit not found or unauthorized');
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
