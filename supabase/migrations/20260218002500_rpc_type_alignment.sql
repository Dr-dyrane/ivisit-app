-- Migration: RPC Type Alignment for TEXT IDs
-- Author: Antigravity
-- Date: 2026-02-18
-- Description: Fixes remaining RPCs that incorrectly cast TEXT organization IDs to UUID.

BEGIN;

-- ═══════════════════════════════════════════════════════════
-- 1. FIX: process_cash_payment_v2
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.process_cash_payment_v2(
    p_emergency_request_id TEXT,
    p_organization_id TEXT,
    p_amount NUMERIC,
    p_currency TEXT DEFAULT 'USD'
) RETURNS JSONB AS $$
DECLARE
    v_payment_id UUID;
    v_user_id UUID;
    v_fee_rate NUMERIC;
    v_fee_amount NUMERIC;
    v_wallet_id UUID;
    v_main_wallet_id UUID;
BEGIN
    -- We use p_organization_id directly as TEXT
    
    SELECT user_id INTO v_user_id FROM public.emergency_requests 
    WHERE id::text = p_emergency_request_id;

    -- 1. Calculate Fee
    SELECT ivisit_fee_percentage INTO v_fee_rate FROM public.organizations WHERE id = p_organization_id;
    v_fee_rate := COALESCE(v_fee_rate, 2.5);
    v_fee_amount := (p_amount * v_fee_rate) / 100;

    -- 2. Debit Org Wallet
    UPDATE public.organization_wallets 
    SET balance = balance - v_fee_amount, updated_at = NOW()
    WHERE organization_id = p_organization_id
    RETURNING id INTO v_wallet_id;

    IF v_wallet_id IS NOT NULL THEN
        INSERT INTO public.wallet_ledger (
            wallet_type, wallet_id, organization_id, amount, 
            transaction_type, description, reference_id, reference_type
        ) VALUES (
            'organization', v_wallet_id, p_organization_id, -v_fee_amount,
            'debit', 'Protocol Fee (Cash Job)', p_emergency_request_id::UUID, 'emergency_request'
        );
    END IF;

    -- 3. Credit Platform Wallet
    SELECT id INTO v_main_wallet_id FROM public.ivisit_main_wallet LIMIT 1;
    UPDATE public.ivisit_main_wallet 
    SET balance = balance + v_fee_amount, updated_at = NOW() 
    WHERE id = v_main_wallet_id;

    INSERT INTO public.wallet_ledger (
        wallet_type, wallet_id, organization_id, amount, 
        transaction_type, description, reference_id, reference_type
    ) VALUES (
        'main', v_main_wallet_id, NULL, v_fee_amount,
        'credit', 'Fee from Cash Job ' || p_emergency_request_id, p_emergency_request_id::UUID, 'emergency_request'
    );

    -- 4. Record Payment
    INSERT INTO public.payments (
        user_id, amount, currency, status, payment_method_id, 
        emergency_request_id, organization_id, metadata
    ) VALUES (
        v_user_id, p_amount, p_currency, 'completed', 'cash', 
        p_emergency_request_id::UUID, p_organization_id,
        jsonb_build_object('source', 'cash_payment', 'protocol_fee', v_fee_amount, 'ledger_credited', true)
    ) RETURNING id INTO v_payment_id;

    -- 5. Complete Request
    UPDATE public.emergency_requests SET payment_status = 'completed'
    WHERE id::text = p_emergency_request_id;

    RETURN jsonb_build_object('success', true, 'payment_id', v_payment_id, 'fee_deducted', v_fee_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════
-- 2. FIX: process_wallet_payment
-- ═══════════════════════════════════════════════════════════
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
    v_req_uuid UUID;
    v_patient_wallet_id UUID;
    v_patient_balance DECIMAL;
    v_payment_id UUID;
BEGIN
    BEGIN
        v_user_uuid := p_user_id::UUID;
        v_req_uuid := p_emergency_request_id::UUID;
        -- p_organization_id is TEXT, no cast needed to UUID
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid UUID format provided for user or request');
    END;

    SELECT id, balance INTO v_patient_wallet_id, v_patient_balance
    FROM public.patient_wallets
    WHERE user_id = v_user_uuid;
    
    IF v_patient_wallet_id IS NULL THEN
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
        v_req_uuid, p_organization_id,
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

-- ═══════════════════════════════════════════════════════════
-- 3. FIX: calculate_emergency_cost (ensure v_org_id is TEXT)
-- ═══════════════════════════════════════════════════════════
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
    v_org_id TEXT;
    v_platform_fee_rate NUMERIC := 2.5; 
BEGIN
    -- Get Org ID from Hospital context (TEXT)
    SELECT h.organization_id INTO v_org_id FROM public.hospitals h WHERE h.id::text = p_hospital_id;

    -- Determine Base Cost
    IF p_ambulance_id IS NOT NULL AND p_ambulance_id != '' THEN
        SELECT a.base_price, 'Ambulance (' || a.license_plate || ')' INTO v_base_cost, v_service_name
        FROM public.ambulances a WHERE a.id::text = p_ambulance_id;
    END IF;

    IF (v_base_cost IS NULL OR v_base_cost = 0) AND p_service_type IN ('bed', 'bed_booking') AND p_room_id IS NOT NULL AND p_room_id != '' THEN
        SELECT hr.base_price, hr.room_type INTO v_base_cost, v_service_name
        FROM public.hospital_rooms hr WHERE hr.id::text = p_room_id;
    END IF;

    IF v_base_cost IS NULL OR v_base_cost = 0 THEN
        SELECT sp.base_price, sp.service_name INTO v_base_cost, v_service_name
        FROM public.service_pricing sp
        WHERE sp.service_type = p_service_type AND sp.is_active = true
          AND (sp.hospital_id::text = p_hospital_id OR sp.organization_id = v_org_id OR (sp.hospital_id IS NULL AND sp.organization_id IS NULL))
        ORDER BY (sp.hospital_id::text = p_hospital_id) DESC, (sp.organization_id = v_org_id) DESC LIMIT 1;
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
        SELECT ivisit_fee_percentage INTO v_platform_fee_rate FROM public.organizations WHERE id = v_org_id;
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

-- ═══════════════════════════════════════════════════════════
-- 4. GRANTS
-- ═══════════════════════════════════════════════════════════
GRANT EXECUTE ON FUNCTION public.process_cash_payment_v2(text, text, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_wallet_payment(text, text, text, decimal, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_emergency_cost(text, text, text, text, numeric, boolean) TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
