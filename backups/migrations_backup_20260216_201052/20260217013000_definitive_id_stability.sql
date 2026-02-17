-- Migration: Master ID Stability and Safe Casting
-- Author: Antigravity
-- Date: 2026-02-17
-- Description: Hardens all critical RPCs against UUID/TEXT operator mismatches (42883).
-- Rule of Thumb: Parameters from JS are TEXT, comparisons use ::text = ::text.

-- ============================================================================
-- 💰 1. CASH ELIGIBILITY (The most frequent failure point)
-- ============================================================================

DROP FUNCTION IF EXISTS public.check_cash_eligibility(UUID, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS public.check_cash_eligibility(TEXT, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS public.check_cash_eligibility(UUID, DECIMAL) CASCADE;
DROP FUNCTION IF EXISTS public.check_cash_eligibility(TEXT, DECIMAL) CASCADE;

CREATE OR REPLACE FUNCTION public.check_cash_eligibility(
    p_organization_id TEXT,
    p_estimated_amount NUMERIC
)
RETURNS BOOLEAN AS $$
DECLARE
    v_balance NUMERIC;
    v_fee_rate NUMERIC;
    v_required_fee NUMERIC;
BEGIN
    IF p_organization_id IS NULL OR p_organization_id = '' THEN RETURN FALSE; END IF;

    -- Lookup balance with safe casting
    SELECT balance INTO v_balance FROM public.organization_wallets 
    WHERE organization_id::text = p_organization_id::text;
    
    -- Lookup fee rate with safe casting
    SELECT ivisit_fee_percentage INTO v_fee_rate FROM public.organizations 
    WHERE id::text = p_organization_id::text;
    
    v_fee_rate := COALESCE(v_fee_rate, 2.5);
    v_required_fee := (p_estimated_amount * v_fee_rate) / 100;
    
    RETURN COALESCE(v_balance, 0) >= v_required_fee;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 🚑 2. COST CALCULATION (Emergency & Booking flow)
-- ============================================================================

DROP FUNCTION IF EXISTS public.calculate_emergency_cost(TEXT, UUID, UUID, UUID, DECIMAL, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS public.calculate_emergency_cost(TEXT, TEXT, TEXT, TEXT, NUMERIC, BOOLEAN) CASCADE;

CREATE OR REPLACE FUNCTION public.calculate_emergency_cost(
    p_service_type TEXT,
    p_hospital_id TEXT DEFAULT NULL,
    p_ambulance_id TEXT DEFAULT NULL,
    p_room_id TEXT DEFAULT NULL,
    p_distance NUMERIC DEFAULT 0,
    p_is_urgent BOOLEAN DEFAULT false
)
RETURNS TABLE (
    base_cost NUMERIC,
    distance_surcharge NUMERIC,
    urgency_surcharge NUMERIC,
    platform_fee NUMERIC,
    total_cost NUMERIC,
    breakdown JSONB
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_base_cost NUMERIC := 0;
    v_distance_surcharge NUMERIC := 0;
    v_urgency_surcharge NUMERIC := 0;
    v_platform_fee NUMERIC := 0;
    v_total_cost NUMERIC := 0;
    v_breakdown JSONB := '[]'::jsonb;
    v_service_name TEXT;
    v_org_id UUID;
    v_platform_fee_rate NUMERIC := 2.5; 
BEGIN
    -- Get Org ID from Hospital context
    SELECT h.organization_id INTO v_org_id FROM public.hospitals h WHERE h.id::text = p_hospital_id::text;

    -- Determine Base Cost
    IF p_ambulance_id IS NOT NULL AND p_ambulance_id != '' THEN
        SELECT a.base_price, 'Ambulance (' || a.license_plate || ')' INTO v_base_cost, v_service_name
        FROM public.ambulances a WHERE a.id::text = p_ambulance_id::text;
    END IF;

    IF (v_base_cost IS NULL OR v_base_cost = 0) AND p_service_type IN ('bed', 'bed_booking') AND p_room_id IS NOT NULL AND p_room_id != '' THEN
        SELECT hr.base_price, hr.room_type INTO v_base_cost, v_service_name
        FROM public.hospital_rooms hr WHERE hr.id::text = p_room_id::text;
    END IF;

    IF v_base_cost IS NULL OR v_base_cost = 0 THEN
        SELECT sp.base_price, sp.service_name INTO v_base_cost, v_service_name
        FROM public.service_pricing sp
        WHERE sp.service_type = p_service_type AND sp.is_active = true
          AND (sp.hospital_id::text = p_hospital_id::text OR sp.organization_id::text = v_org_id::text OR (sp.hospital_id IS NULL AND sp.organization_id IS NULL))
        ORDER BY (sp.hospital_id::text = p_hospital_id::text) DESC, (sp.organization_id::text = v_org_id::text) DESC LIMIT 1;
    END IF;

    -- Fallbacks
    IF v_base_cost IS NULL OR v_base_cost = 0 THEN
        v_base_cost := CASE WHEN p_service_type = 'ambulance' THEN 150.00 ELSE 200.00 END;
        v_service_name := CASE WHEN p_service_type = 'ambulance' THEN 'Ambulance Service' ELSE 'Medical Resource' END;
    END IF;

    v_distance_surcharge := CASE WHEN p_distance > 5 THEN (p_distance - 5) * 2.00 ELSE 0 END;
    v_urgency_surcharge := CASE WHEN p_is_urgent THEN 25.00 ELSE 0 END;
    v_total_cost := v_base_cost + v_distance_surcharge + v_urgency_surcharge;

    -- Platform Fee
    IF v_org_id IS NOT NULL THEN
        SELECT ivisit_fee_percentage INTO v_platform_fee_rate FROM public.organizations WHERE id::text = v_org_id::text;
    END IF;
    v_platform_fee_rate := COALESCE(v_platform_fee_rate, 2.5);
    v_total_cost := v_total_cost / (1 - (v_platform_fee_rate / 100));
    v_platform_fee := v_total_cost - (v_base_cost + v_distance_surcharge + v_urgency_surcharge);

    v_breakdown := jsonb_build_array(
        jsonb_build_object('name', v_service_name, 'cost', ROUND(v_base_cost::numeric, 2), 'type', 'base'),
        jsonb_build_object('name', 'Distance Surcharge', 'cost', ROUND(v_distance_surcharge::numeric, 2), 'type', 'distance'),
        jsonb_build_object('name', 'Urgency Surcharge', 'cost', ROUND(v_urgency_surcharge::numeric, 2), 'type', 'urgency'),
        jsonb_build_object('name', 'iVisit Fee (' || v_platform_fee_rate || '%)', 'cost', ROUND(v_platform_fee::numeric, 2), 'type', 'fee')
    );

    RETURN QUERY SELECT 
        ROUND(v_base_cost::numeric, 2), ROUND(v_distance_surcharge::numeric, 2), ROUND(v_urgency_surcharge::numeric, 2),
        ROUND(v_platform_fee::numeric, 2), ROUND(v_total_cost::numeric, 2), v_breakdown;
END;
$$;

-- ============================================================================
-- 👥 3. USER MANAGEMENT (Console Admin flow)
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_all_auth_users(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_all_auth_users(TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.get_all_auth_users(p_organization_id TEXT DEFAULT NULL)
RETURNS TABLE (
    id UUID, email TEXT, phone TEXT, username TEXT, role TEXT, full_name TEXT, 
    avatar_url TEXT, organization_id UUID, provider_type TEXT, bvn_verified BOOLEAN, 
    display_id TEXT, created_at TIMESTAMPTZ, last_sign_in_at TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        au.id, au.email::TEXT, au.phone::TEXT, p.username, p.role, p.full_name, 
        p.image_uri as avatar_url, 
        COALESCE(p.organization_id, h.organization_id) as organization_id,
        p.provider_type, p.bvn_verified, p.display_id, 
        au.created_at, au.last_sign_in_at
    FROM auth.users au
    LEFT JOIN public.profiles p ON au.id = p.id
    LEFT JOIN public.hospitals h ON p.id::text = h.org_admin_id::text
    WHERE (p_organization_id IS NULL OR 
           p_organization_id = '' OR 
           p.organization_id::text = p_organization_id::text OR 
           h.organization_id::text = p_organization_id::text)
    ORDER BY au.created_at DESC;
END;
$$;

-- ============================================================================
-- 🏥 4. HOSPITAL MANAGEMENT (Resource flow)
-- ============================================================================

DROP FUNCTION IF EXISTS public.update_hospital_availability(TEXT, INTEGER, INTEGER, TEXT, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.update_hospital_availability(UUID, INTEGER, INTEGER, TEXT, INTEGER) CASCADE;

CREATE OR REPLACE FUNCTION public.update_hospital_availability(
    p_hospital_id TEXT, 
    new_available_beds INTEGER DEFAULT NULL,
    new_ambulances_count INTEGER DEFAULT NULL,
    new_status TEXT DEFAULT NULL,
    new_wait_time INTEGER DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.hospitals 
    SET 
        available_beds = COALESCE(new_available_beds, available_beds),
        ambulances_count = COALESCE(new_ambulances_count, ambulances_count),
        status = COALESCE(new_status, status),
        emergency_wait_time_minutes = COALESCE(new_wait_time, emergency_wait_time_minutes),
        last_availability_update = now(),
        updated_at = now()
    WHERE id::text = p_hospital_id::text;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 💸 5. RECORD CASH (Manual Payment flow)
-- ============================================================================

DROP FUNCTION IF EXISTS public.process_cash_payment(TEXT, UUID, DECIMAL, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.process_cash_payment(TEXT, TEXT, NUMERIC, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.process_cash_payment(
    p_emergency_request_id TEXT,
    p_organization_id TEXT,
    p_amount NUMERIC,
    p_currency TEXT DEFAULT 'USD'
) RETURNS JSONB AS $$
DECLARE
    v_payment_id UUID;
    v_user_id UUID;
    v_org_id UUID;
BEGIN
    v_org_id := p_organization_id::UUID; -- Assume valid UUID string since it came from valid path

    SELECT user_id INTO v_user_id FROM public.emergency_requests 
    WHERE id::text = p_emergency_request_id::text;

    INSERT INTO public.payments (
        user_id, amount, currency, status, payment_method_id, 
        emergency_request_id, organization_id, metadata
    ) VALUES (
        v_user_id, p_amount, p_currency, 'completed', 'cash', 
        p_emergency_request_id, v_org_id,
        jsonb_build_object('source', 'cash_payment', 'confirmed_at', NOW(), 'ledger_credited', false)
    ) RETURNING id INTO v_payment_id;

    UPDATE public.emergency_requests SET payment_status = 'completed'
    WHERE id::text = p_emergency_request_id::text;

    RETURN jsonb_build_object('success', true, 'payment_id', v_payment_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 🧹 6. ADMINISTRATIVE ACTIONS (Deletion flow)
-- ============================================================================

DROP FUNCTION IF EXISTS public.delete_user_by_admin(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.delete_user_by_admin(TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.delete_user_by_admin(target_user_id TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id::text = auth.uid()::text AND role = 'admin') THEN
        RAISE EXCEPTION 'Access Denied: Only Admins can delete users.';
    END IF;
    DELETE FROM auth.users WHERE id::text = target_user_id::text;
END;
$$;

DROP FUNCTION IF EXISTS public.delete_hospital(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.delete_hospital(TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.delete_hospital(p_hospital_id TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id::text = auth.uid()::text AND (role = 'admin' OR role = 'org_admin')) THEN
        RAISE EXCEPTION 'Access Denied';
    END IF;
    DELETE FROM public.hospitals WHERE id::text = p_hospital_id::text;
END;
$$;

-- GRANT EXECUTION
GRANT EXECUTE ON FUNCTION public.check_cash_eligibility(TEXT, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_emergency_cost(TEXT, TEXT, TEXT, TEXT, NUMERIC, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_auth_users(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_hospital_availability(TEXT, INTEGER, INTEGER, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_cash_payment(TEXT, TEXT, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_by_admin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_hospital(TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- PATCH: Wallet Payment Process (Hyper-Safe ID Casting)
CREATE OR REPLACE FUNCTION public.process_wallet_payment(
    p_user_id TEXT,
    p_organization_id TEXT,
    p_emergency_request_id TEXT,
    p_amount DECIMAL,
    p_currency TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_user_uuid UUID;
    v_org_uuid UUID;
    v_req_uuid UUID;
    v_patient_wallet_id UUID;
    v_patient_balance DECIMAL;
    v_payment_id UUID;
BEGIN
    BEGIN
        v_user_uuid := p_user_id::UUID;
        v_org_uuid := p_organization_id::UUID;
        v_req_uuid := p_emergency_request_id::UUID;
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid UUID format provided for payment entities');
    END;

    SELECT id, balance INTO v_patient_wallet_id, v_patient_balance
    FROM public.patient_wallets
    WHERE user_id = v_user_uuid;
    
    IF v_patient_wallet_id IS NULL THEN
        -- Auto-create wallet if missing (fail-safe)
        INSERT INTO public.patient_wallets (user_id, balance, currency)
        VALUES (v_user_uuid, 0.00, p_currency)
        RETURNING id, balance INTO v_patient_wallet_id, v_patient_balance;
    END IF;

    IF v_patient_balance < p_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient wallet balance. Please top up.');
    END IF;

    UPDATE public.patient_wallets
    SET balance = balance - p_amount, updated_at = NOW()
    WHERE id = v_patient_wallet_id;

    INSERT INTO public.wallet_ledger (
        wallet_type, wallet_id, user_id, amount, 
        transaction_type, description, reference_id, reference_type
    ) VALUES (
        'patient', v_patient_wallet_id, v_user_uuid, -p_amount,
        'debit', 'Service Payment (Wallet)', v_req_uuid, 'emergency_request'
    );

    INSERT INTO public.payments (
        user_id, amount, currency, status, 
        payment_method_id, emergency_request_id, organization_id, metadata
    ) VALUES (
        v_user_uuid, p_amount, p_currency, 'completed',
        'wallet_' || v_patient_wallet_id::text,
        v_req_uuid, v_org_uuid,
        jsonb_build_object('source', 'patient_wallet', 'wallet_id', v_patient_wallet_id)
    )
    RETURNING id INTO v_payment_id;

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', v_payment_id,
        'new_balance', (SELECT balance FROM public.patient_wallets WHERE id = v_patient_wallet_id)
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.process_wallet_payment(TEXT, TEXT, TEXT, DECIMAL, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_wallet_payment(TEXT, TEXT, TEXT, DECIMAL, TEXT) TO service_role;
