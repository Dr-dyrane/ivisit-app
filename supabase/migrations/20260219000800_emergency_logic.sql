-- 🛰️ Module 08: Emergency Logic (Fluid Edition)
-- Atomic operations for emergency lifecycles

-- � AMBULANCE DISPATCH RPC FUNCTIONS
-- Part of Master System Improvement Plan - Phase 1 Critical Emergency Flow Fixes

-- 1. Get Available Ambulances
CREATE OR REPLACE FUNCTION public.get_available_ambulances(
    p_hospital_id UUID DEFAULT NULL,
    p_radius_km INTEGER DEFAULT 50,
    p_specialty TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    call_sign TEXT,
    status TEXT,
    location JSONB,
    hospital_id UUID,
    crew TEXT,
    vehicle_number TEXT,
    rating NUMERIC,
    last_maintenance TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.call_sign,
        a.status,
        a.location,
        a.hospital_id,
        a.crew,
        a.vehicle_number,
        a.rating,
        a.last_maintenance,
        a.created_at,
        a.updated_at
    FROM public.ambulances a
    WHERE a.status = 'available'
        AND (p_hospital_id IS NULL OR a.hospital_id = p_hospital_id)
        AND (p_specialty IS NULL OR a.specialty = p_specialty)
        AND a.location IS NOT NULL
        AND ST_DWithin(
            ST_GeomFromText(a.location),
            ST_MakePoint(
                CASE 
                    WHEN h.coordinates IS NOT NULL 
                    THEN ST_GeomFromText(h.coordinates)
                    ELSE ST_MakePoint(0, 0)
                END
            ),
            p_radius_km * 1000
        );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. Update Ambulance Status
CREATE OR REPLACE FUNCTION public.update_ambulance_status(
    p_ambulance_id UUID,
    p_status TEXT,
    p_location JSONB DEFAULT NULL,
    p_eta TIMESTAMPTZ DEFAULT NULL,
    p_current_call UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_hospital_id UUID;
    v_result JSONB;
BEGIN
    -- Validate status
    IF p_status NOT IN ('available', 'dispatched', 'en_route', 'on_scene', 'returning', 'maintenance', 'offline') THEN
        RETURN jsonb_build_object('error', 'Invalid status', 'code', 'INVALID_STATUS');
    END IF;
    
    -- Get current hospital for validation
    SELECT hospital_id INTO v_hospital_id 
    FROM public.ambulances 
    WHERE id = p_ambulance_id;
    
    -- Update ambulance
    UPDATE public.ambulances 
    SET 
        status = p_status,
        location = COALESCE(p_location, location),
        eta = COALESCE(p_eta, eta),
        current_call = COALESCE(p_current_call, current_call),
        updated_at = NOW()
    WHERE id = p_ambulance_id;
    
    -- If ambulance was dispatched, update hospital availability
    IF p_status = 'dispatched' AND OLD.status = 'available' THEN
        UPDATE public.hospitals 
        SET available_ambulances = GREATEST(0, available_ambulances - 1)
        WHERE id = v_hospital_id;
    END IF;
    
    -- If ambulance returned to available, update hospital availability
    IF p_status = 'available' AND OLD.status != 'available' THEN
        UPDATE public.hospitals 
        SET available_ambulances = available_ambulances + 1
        WHERE id = v_hospital_id;
    END IF;
    
    v_result := jsonb_build_object(
        'success', true,
        'ambulance_id', p_ambulance_id,
        'status', p_status,
        'updated_at', NOW()
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Assign Ambulance to Emergency
CREATE OR REPLACE FUNCTION public.assign_ambulance_to_emergency(
    p_emergency_request_id UUID,
    p_ambulance_id UUID,
    p_priority INTEGER DEFAULT 1
)
RETURNS JSONB AS $$
DECLARE
    v_ambulance_status TEXT;
    v_hospital_id UUID;
    v_emergency_user_id UUID;
    v_result JSONB;
BEGIN
    -- Get ambulance status
    SELECT status, hospital_id INTO v_ambulance_status, v_hospital_id
    FROM public.ambulances 
    WHERE id = p_ambulance_id;
    
    -- Validate ambulance is available
    IF v_ambulance_status != 'available' THEN
        RETURN jsonb_build_object('error', 'Ambulance not available', 'code', 'AMBULANCE_UNAVAILABLE');
    END IF;
    
    -- Get emergency user
    SELECT user_id INTO v_emergency_user_id
    FROM public.emergency_requests 
    WHERE id = p_emergency_request_id;
    
    -- Update ambulance status to dispatched
    UPDATE public.ambulances 
    SET 
        status = 'dispatched',
        current_call = p_emergency_request_id,
        updated_at = NOW()
    WHERE id = p_ambulance_id;
    
    -- Update emergency request with ambulance assignment
    UPDATE public.emergency_requests 
    SET 
        ambulance_id = p_ambulance_id,
        status = 'accepted',
        updated_at = NOW()
    WHERE id = p_emergency_request_id;
    
    -- Update hospital availability
    UPDATE public.hospitals 
    SET available_ambulances = GREATEST(0, available_ambulances - 1)
    WHERE id = v_hospital_id;
    
    v_result := jsonb_build_object(
        'success', true,
        'ambulance_id', p_ambulance_id,
        'emergency_request_id', p_emergency_request_id,
        'assigned_at', NOW()
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Auto-Assign Best Ambulance
CREATE OR REPLACE FUNCTION public.auto_assign_ambulance(
    p_emergency_request_id UUID,
    p_max_distance_km INTEGER DEFAULT 50,
    p_specialty_required TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_user_location JSONB;
    v_best_ambulance_id UUID;
    v_best_distance NUMERIC;
    v_result JSONB;
BEGIN
    -- Get emergency user and location
    SELECT user_id INTO v_user_id
    FROM public.emergency_requests 
    WHERE id = p_emergency_request_id;
    
    -- Get user location from profile
    SELECT location INTO v_user_location
    FROM public.profiles 
    WHERE id = v_user_id;
    
    -- Find best available ambulance
    SELECT 
        a.id, 
        ST_Distance(
            ST_GeomFromText(a.location),
            ST_GeomFromText(v_user_location)
        ) as distance
    INTO v_best_ambulance_id, v_best_distance
    FROM public.ambulances a
    WHERE a.status = 'available'
        AND (p_specialty_required IS NULL OR a.specialty = p_specialty_required)
        AND a.location IS NOT NULL
        AND ST_DWithin(
            ST_GeomFromText(a.location),
            ST_GeomFromText(v_user_location),
            p_max_distance_km * 1000
        )
    ORDER BY distance
    LIMIT 1;
    
    -- If ambulance found, assign it
    IF v_best_ambulance_id IS NOT NULL THEN
        -- Update ambulance status
        UPDATE public.ambulances 
        SET 
            status = 'dispatched',
            current_call = p_emergency_request_id,
            updated_at = NOW()
        WHERE id = v_best_ambulance_id;
        
        -- Update emergency request
        UPDATE public.emergency_requests 
        SET 
            ambulance_id = v_best_ambulance_id,
            status = 'accepted',
            updated_at = NOW()
        WHERE id = p_emergency_request_id;
        
        v_result := jsonb_build_object(
            'success', true,
            'ambulance_id', v_best_ambulance_id,
            'distance', v_best_distance,
            'auto_assigned', true
        );
    ELSE
        v_result := jsonb_build_object(
            'success', false,
            'error', 'No available ambulances found',
            'auto_assigned', false
        );
    END IF;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Validate Emergency Request
CREATE OR REPLACE FUNCTION public.validate_emergency_request(
    p_user_id UUID,
    p_request_data JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_hospital_id UUID;
    v_patient_location JSONB;
    v_hospital_available BOOLEAN;
    v_result JSONB;
BEGIN
    -- Extract required fields
    v_hospital_id := (p_request_data->>'hospital_id')::UUID;
    v_patient_location := p_request_data->'patient_location';
    
    -- Validate hospital exists and is available
    SELECT (available_beds > 0 AND status = 'active') INTO v_hospital_available
    FROM public.hospitals 
    WHERE id = v_hospital_id;
    
    IF NOT v_hospital_available THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'Hospital not available',
            'code', 'HOSPITAL_UNAVAILABLE'
        );
    END IF;
    
    -- Validate patient location
    IF v_patient_location IS NULL OR 
       v_patient_location->>'lat' IS NULL OR 
       v_patient_location->>'lng' IS NULL THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'Invalid patient location',
            'code', 'INVALID_LOCATION'
        );
    END IF;
    
    -- Check for duplicate emergencies
    IF EXISTS (
        SELECT 1 FROM public.emergency_requests 
        WHERE user_id = p_user_id 
        AND status IN ('pending_approval', 'in_progress', 'accepted', 'arrived')
        AND created_at > NOW() - INTERVAL '1 hour'
    ) THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'Duplicate emergency request',
            'code', 'DUPLICATE_EMERGENCY'
        );
    END IF;
    
    v_result := jsonb_build_object(
        'valid', true,
        'hospital_id', v_hospital_id,
        'patient_location', v_patient_location
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Check Hospital Capacity
CREATE OR REPLACE FUNCTION public.check_hospital_capacity(
    p_hospital_id UUID,
    p_required_beds INTEGER DEFAULT 1,
    p_specialty TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_available_beds INTEGER;
    v_icu_beds INTEGER;
    v_total_beds INTEGER;
    v_result JSONB;
BEGIN
    -- Get hospital capacity information
    SELECT 
        available_beds,
        icu_beds_available,
        total_beds
    INTO v_available_beds, v_icu_beds, v_total_beds
    FROM public.hospitals 
    WHERE id = p_hospital_id;
    
    -- Check capacity
    IF v_available_beds < p_required_beds THEN
        v_result := jsonb_build_object(
            'available', false,
            'error', 'Insufficient bed capacity',
            'available_beds', v_available_beds,
            'required_beds', p_required_beds,
            'code', 'INSUFFICIENT_CAPACITY'
        );
    ELSIF p_specialty = 'ICU' AND v_icu_beds < p_required_beds THEN
        v_result := jsonb_build_object(
            'available', false,
            'error', 'Insufficient ICU capacity',
            'icu_beds_available', v_icu_beds,
            'required_beds', p_required_beds,
            'code', 'INSUFFICIENT_ICU'
        );
    ELSE
        v_result := jsonb_build_object(
            'available', true,
            'available_beds', v_available_beds,
            'icu_beds_available', v_icu_beds,
            'total_beds', v_total_beds
        );
    END IF;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 7. Calculate Emergency Priority
CREATE OR REPLACE FUNCTION public.calculate_emergency_priority(
    p_request_data JSONB,
    p_user_medical_profile JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_priority INTEGER := 1; -- Default priority
    v_urgency_score INTEGER := 0;
    v_medical_urgency INTEGER := 0;
    v_result JSONB;
BEGIN
    -- Calculate urgency based on request data
    IF p_request_data->>'severity' = 'critical' THEN
        v_urgency_score := v_urgency_score + 3;
    ELSIF p_request_data->>'severity' = 'urgent' THEN
        v_urgency_score := v_urgency_score + 2;
    ELSIF p_request_data->>'severity' = 'moderate' THEN
        v_urgency_score := v_urgency_score + 1;
    END IF;
    
    -- Calculate medical urgency if profile available
    IF p_user_medical_profile IS NOT NULL THEN
        IF p_user_medical_profile->>'conditions' IS NOT NULL THEN
            v_medical_urgency := v_medical_urgency + 1;
        END IF;
        
        IF p_user_medical_profile->>'allergies' IS NOT NULL AND 
           p_user_medical_profile->>'allergies' != '' THEN
            v_medical_urgency := v_medical_urgency + 1;
        END IF;
    END IF;
    
    -- Calculate final priority (1-5 scale)
    v_priority := LEAST(5, GREATEST(1, 1 + v_urgency_score + v_medical_urgency));
    
    v_result := jsonb_build_object(
        'priority', v_priority,
        'urgency_score', v_urgency_score,
        'medical_urgency', v_medical_urgency,
        'calculated_at', NOW()
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- �🛠️ ATOMIC: Create Emergency with Integrated Payment (Fluid v4)
-- Matches emergencyRequestsService.js expectation for create_emergency_v4
CREATE OR REPLACE FUNCTION public.create_emergency_v4(
    p_user_id UUID,
    p_request_data JSONB,
    p_payment_data JSONB DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_request_id UUID;
    v_display_id TEXT;
    v_payment_id UUID;
    v_fee_amount NUMERIC;
    v_total_amount NUMERIC;
    v_requires_approval BOOLEAN := FALSE;
    v_hospital_id UUID;
    v_patient_location GEOMETRY;
BEGIN
    -- 1. Extract and Validate IDs
    v_hospital_id := (p_request_data->>'hospital_id')::UUID;
    
    -- 2. Parse patient location from JSONB to GEOMETRY
    v_patient_location := ST_SetSRID(ST_MakePoint(
        (p_request_data->'patient_location'->>'lng')::DOUBLE PRECISION,
        (p_request_data->'patient_location'->>'lat')::DOUBLE PRECISION
    ), 4326);
    
    -- 3. Create the Emergency Request
    INSERT INTO public.emergency_requests (
        user_id,
        hospital_id,
        service_type,
        hospital_name,
        specialty,
        ambulance_type,
        patient_location,
        patient_snapshot,
        status,
        created_at,
        updated_at
    ) VALUES (
        p_user_id,
        v_hospital_id,
        p_request_data->>'service_type',
        p_request_data->>'hospital_name',
        p_request_data->>'specialty',
        p_request_data->>'ambulance_type',
        v_patient_location,
        p_request_data->'patient_snapshot',
        CASE 
            WHEN p_payment_data->>'method' = 'cash' THEN 'pending_approval'
            ELSE 'in_progress'
        END,
        NOW(),
        NOW()
    ) RETURNING id, display_id INTO v_request_id, v_display_id;

    -- 3. Sync to Visits (Fluid Flow)
    INSERT INTO public.visits (
        user_id,
        hospital_id,
        request_id,
        status,
        date,
        time,
        type,
        created_at
    ) VALUES (
        p_user_id,
        v_hospital_id,
        v_request_id,
        'pending',
        CURRENT_DATE::TEXT,
        CURRENT_TIME::TEXT,
        'emergency',
        NOW()
    );

    -- 4. Process Payment if Data Provided
    IF p_payment_data IS NOT NULL THEN
        v_total_amount := (p_payment_data->>'total_amount')::NUMERIC;
        v_fee_amount := (p_payment_data->>'fee_amount')::NUMERIC;
        IF v_fee_amount IS NULL THEN v_fee_amount := v_total_amount * 0.025; END IF;

        INSERT INTO public.payments (
            user_id,
            emergency_request_id,
            amount,
            currency,
            payment_method,
            status,
            metadata,
            created_at
        ) VALUES (
            p_user_id,
            v_request_id,
            v_total_amount,
            p_payment_data->>'currency',
            p_payment_data->>'method',
            CASE 
                WHEN p_payment_data->>'method' = 'cash' THEN 'pending'
                ELSE 'completed'
            END,
            jsonb_build_object(
                'fee_amount', v_fee_amount,
                'method_id', p_payment_data->>'method_id'
            ),
            NOW()
        ) RETURNING id INTO v_payment_id;

        IF p_payment_data->>'method' = 'cash' THEN
            v_requires_approval := TRUE;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'request_id', v_request_id,
        'display_id', v_display_id,
        'payment_id', v_payment_id,
        'requires_approval', v_requires_approval,
        'emergency_status', CASE WHEN v_requires_approval THEN 'pending_approval' ELSE 'in_progress' END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 🛠️ ATOMIC: Approve Cash Payment
-- Matches paymentService.js:761 expectation
CREATE OR REPLACE FUNCTION public.approve_cash_payment(p_payment_id UUID, p_request_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_payment RECORD;
    v_org_wallet_id UUID;
    v_org_balance NUMERIC;
    v_platform_wallet_id UUID;
    v_patient_wallet_id UUID;
BEGIN
    -- 1. Verify Payment & Resolve Org
    SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id AND status = 'pending';
    IF v_payment.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pending payment not found');
    END IF;

    -- 2. Get Wallets
    SELECT id, balance INTO v_org_wallet_id, v_org_balance 
    FROM public.organization_wallets 
    WHERE organization_id = v_payment.organization_id;
    
    SELECT id INTO v_platform_wallet_id FROM public.ivisit_main_wallet LIMIT 1;
    SELECT id INTO v_patient_wallet_id FROM public.patient_wallets WHERE user_id = v_payment.user_id;

    -- 3. Check Org Balance for Fee
    IF v_org_balance < v_payment.ivisit_fee_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'Organization balance insufficient for platform fee');
    END IF;

    -- 4. Deduct Fee from Org (Debt Collection for Cash Trip)
    UPDATE public.organization_wallets SET balance = balance - v_payment.ivisit_fee_amount WHERE id = v_org_wallet_id;
    INSERT INTO public.wallet_ledger (wallet_id, amount, transaction_type, description, reference_id)
    VALUES (v_org_wallet_id, -v_payment.ivisit_fee_amount, 'debit', 'iVisit Platform Fee (Cash Payment Fee)', p_payment_id);

    -- 5. Credit Platform
    UPDATE public.ivisit_main_wallet SET balance = balance + v_payment.ivisit_fee_amount WHERE id = v_platform_wallet_id;
    INSERT INTO public.wallet_ledger (wallet_id, amount, transaction_type, description, reference_id)
    VALUES (v_platform_wallet_id, v_payment.ivisit_fee_amount, 'credit', 'Platform Fee (Cash Payment)', p_payment_id);

    -- 6. Informational Patient Ledger entry
    IF v_patient_wallet_id IS NOT NULL THEN
        INSERT INTO public.wallet_ledger (wallet_id, amount, transaction_type, description, reference_id)
        VALUES (v_patient_wallet_id, 0, 'info', 'Paid via Cash (In-Person)', p_payment_id);
    END IF;

    -- 7. Finalize Statuses (Payment, Emergency Request, and Visit)
    UPDATE public.payments SET status = 'completed', processed_at = NOW() WHERE id = p_payment_id;
    UPDATE public.emergency_requests SET status = 'in_progress', updated_at = NOW() WHERE id = p_request_id;
    UPDATE public.visits SET status = 'active', updated_at = NOW() WHERE request_id = p_request_id;

    RETURN jsonb_build_object(
        'success', true, 
        'fee_deducted', v_payment.ivisit_fee_amount, 
        'new_balance', (v_org_balance - v_payment.ivisit_fee_amount)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 🛠️ ATOMIC: Decline Cash Payment
CREATE OR REPLACE FUNCTION public.decline_cash_payment(
    p_payment_id UUID,
    p_request_id UUID
) RETURNS JSONB AS $$
BEGIN
    UPDATE public.payments SET status = 'failed', updated_at = NOW() WHERE id = p_payment_id;
    UPDATE public.emergency_requests SET status = 'payment_declined', updated_at = NOW() WHERE id = p_request_id;
    UPDATE public.visits SET status = 'cancelled', updated_at = NOW() WHERE request_id = p_request_id;
    
    RETURN jsonb_build_object('success', TRUE, 'status', 'declined');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 🛠️ ATOMIC: Process Manual Cash Payment (Fluid v2)
-- Used by Console admins to record offline payments
CREATE OR REPLACE FUNCTION public.process_cash_payment_v2(
    p_emergency_request_id UUID,
    p_organization_id UUID,
    p_amount NUMERIC,
    p_currency TEXT DEFAULT 'USD'
) RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_fee_amount NUMERIC;
    v_fee_percentage NUMERIC;
    v_payment_id UUID;
BEGIN
    -- 1. Get User ID and Fee Config
    SELECT user_id INTO v_user_id FROM public.emergency_requests WHERE id = p_emergency_request_id;
    SELECT ivisit_fee_percentage INTO v_fee_percentage FROM public.organizations WHERE id = p_organization_id;
    
    v_fee_amount := p_amount * (COALESCE(v_fee_percentage, 2.5) / 100);

    -- 2. Create Completed Payment
    INSERT INTO public.payments (
        user_id, 
        emergency_request_id, 
        organization_id, 
        amount, 
        currency, 
        payment_method, 
        status, 
        ivisit_fee_amount,
        processed_at
    )
    VALUES (
        v_user_id, 
        p_emergency_request_id, 
        p_organization_id, 
        p_amount, 
        p_currency, 
        'cash', 
        'completed', 
        v_fee_amount,
        NOW()
    )
    RETURNING id INTO v_payment_id;

    RETURN jsonb_build_object(
        'success', true, 
        'payment_id', v_payment_id, 
        'fee_calculated', v_fee_amount
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 🏯 Module 10: Legacy Logistics Logic
-- Reintroducing critical driver & bed management RPCs

-- 1. Bed Management
CREATE OR REPLACE FUNCTION public.discharge_patient(request_uuid TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.emergency_requests
    SET status = 'discharged', updated_at = NOW()
    WHERE id = request_uuid::UUID AND service_type = 'bed';
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.cancel_bed_reservation(request_uuid TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.emergency_requests
    SET status = 'cancelled', updated_at = NOW()
    WHERE id = request_uuid::UUID AND service_type = 'bed';
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Driver Management
CREATE OR REPLACE FUNCTION public.complete_trip(request_uuid TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.emergency_requests
    SET status = 'completed', updated_at = NOW()
    WHERE id = request_uuid::UUID;
    -- Note: Amb status trigger separates concerns
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.cancel_trip(request_uuid TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.emergency_requests
    SET status = 'cancelled', updated_at = NOW()
    WHERE id = request_uuid::UUID;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Availability Management
CREATE OR REPLACE FUNCTION public.update_hospital_availability(
    hospital_id UUID,
    beds_available INTEGER,
    er_wait_time INTEGER,
    status TEXT,
    ambulance_count INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.hospitals
    SET 
        available_beds = beds_available,
        emergency_wait_time_minutes = er_wait_time,
        wait_time = er_wait_time || ' mins',
        status = status, -- 'available', 'busy', 'full'
        ambulances_count = ambulance_count,
        updated_at = NOW()
    WHERE id = hospital_id;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 🏯 Module 11: Pricing System
-- Standardized pricing for services and rooms

-- 1. Service Pricing Table
CREATE TABLE IF NOT EXISTS public.service_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID REFERENCES public.hospitals(id) ON DELETE CASCADE,
    service_type TEXT NOT NULL,
    service_name TEXT NOT NULL,
    base_price NUMERIC NOT NULL DEFAULT 0,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(hospital_id, service_type)
);

-- 2. Room Pricing Table
CREATE TABLE IF NOT EXISTS public.room_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID REFERENCES public.hospitals(id) ON DELETE CASCADE,
    room_type TEXT NOT NULL,
    room_name TEXT NOT NULL,
    price_per_night NUMERIC NOT NULL DEFAULT 0,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(hospital_id, room_type)
);

-- 3. RLS
ALTER TABLE public.service_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public view active service pricing" ON public.service_pricing FOR SELECT USING (true);
CREATE POLICY "Public view active room pricing" ON public.room_pricing FOR SELECT USING (true);

-- Allow Org Admins to manage own hospital pricing
CREATE POLICY "Org Admins manage pricing" ON public.service_pricing FOR ALL
USING (
    hospital_id IN (SELECT id FROM public.hospitals WHERE organization_id = public.p_get_current_org_id())
    OR public.p_is_admin()
);

CREATE POLICY "Org Admins manage room pricing" ON public.room_pricing FOR ALL
USING (
    hospital_id IN (SELECT id FROM public.hospitals WHERE organization_id = public.p_get_current_org_id())
    OR public.p_is_admin()
);

-- 4. RPCs
CREATE OR REPLACE FUNCTION public.upsert_service_pricing(payload JSONB)
RETURNS JSONB AS $$
DECLARE
    v_hospital_id UUID;
    v_service_type TEXT;
    v_base_price NUMERIC;
BEGIN
    v_hospital_id := (payload->>'hospital_id')::UUID;
    v_service_type := payload->>'service_type';
    v_base_price := (payload->>'base_price')::NUMERIC;
    
    INSERT INTO public.service_pricing (hospital_id, service_type, service_name, base_price, description)
    VALUES (
        v_hospital_id,
        v_service_type,
        payload->>'service_name',
        v_base_price,
        payload->>'description'
    )
    ON CONFLICT (hospital_id, service_type)
    DO UPDATE SET
        service_name = EXCLUDED.service_name,
        base_price = EXCLUDED.base_price,
        description = EXCLUDED.description,
        updated_at = NOW();
        
    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.upsert_room_pricing(payload JSONB)
RETURNS JSONB AS $$
DECLARE
    v_hospital_id UUID;
    v_room_type TEXT;
    v_price NUMERIC;
BEGIN
    v_hospital_id := (payload->>'hospital_id')::UUID;
    v_room_type := payload->>'room_type';
    v_price := (payload->>'price_per_night')::NUMERIC;
    
    INSERT INTO public.room_pricing (hospital_id, room_type, room_name, price_per_night, description)
    VALUES (
        v_hospital_id,
        v_room_type,
        payload->>'room_name',
        v_price,
        payload->>'description'
    )
    ON CONFLICT (hospital_id, room_type)
    DO UPDATE SET
        room_name = EXCLUDED.room_name,
        price_per_night = EXCLUDED.price_per_night,
        description = EXCLUDED.description,
        updated_at = NOW();
        
    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.delete_service_pricing(target_id UUID)
RETURNS JSONB AS $$
BEGIN
    DELETE FROM public.service_pricing WHERE id = target_id;
    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.delete_room_pricing(target_id UUID)
RETURNS JSONB AS $$
BEGIN
    DELETE FROM public.room_pricing WHERE id = target_id;
    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Missing updated_at triggers for pricing tables
CREATE TRIGGER handle_service_pricing_updated_at BEFORE UPDATE ON public.service_pricing FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_room_pricing_updated_at BEFORE UPDATE ON public.room_pricing FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Pricing Indexes
CREATE INDEX IF NOT EXISTS idx_service_pricing_type ON public.service_pricing(service_type);
CREATE INDEX IF NOT EXISTS idx_service_pricing_hospital ON public.service_pricing(hospital_id);
CREATE INDEX IF NOT EXISTS idx_room_pricing_type ON public.room_pricing(room_type);
CREATE INDEX IF NOT EXISTS idx_room_pricing_hospital ON public.room_pricing(hospital_id);
