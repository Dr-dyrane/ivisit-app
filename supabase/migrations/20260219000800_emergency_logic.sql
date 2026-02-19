-- 🛰️ Module 08: Emergency Logic (Fluid Edition)
-- Atomic operations for emergency lifecycles

-- 🛠️ ATOMIC: Create Emergency with Integrated Payment (Fluid v4)
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
BEGIN
    -- 1. Extract and Validate IDs
    v_hospital_id := (p_request_data->>'hospital_id')::UUID;
    
    -- 2. Create the Emergency Request
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
        p_request_data->'patient_location',
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
CREATE OR REPLACE FUNCTION public.approve_cash_payment(
    p_payment_id UUID,
    p_request_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_fee NUMERIC;
    v_org_id UUID;
    v_amount NUMERIC;
BEGIN
    -- 1. Get Payment & Org Info
    SELECT amount, (metadata->>'fee_amount')::NUMERIC, r.hospital_id
    INTO v_amount, v_fee, v_org_id 
    FROM public.payments p
    JOIN public.emergency_requests r ON p.emergency_request_id = r.id
    WHERE p.id = p_payment_id;

    -- Resolve Real Org ID
    SELECT organization_id INTO v_org_id FROM public.hospitals WHERE id = v_org_id;

    -- 2. Deduct Fee from Org Wallet
    UPDATE public.organization_wallets
    SET balance = balance - v_fee,
        updated_at = NOW()
    WHERE organization_id = v_org_id;

    -- 3. Record Ledger
    INSERT INTO public.wallet_ledger (
        organization_id,
        amount,
        type,
        description,
        metadata
    ) VALUES (
        v_org_id,
        -v_fee,
        'fee_deduction',
        'Platform fee for cash payment ' || p_request_id,
        jsonb_build_object('payment_id', p_payment_id, 'request_id', p_request_id)
    );

    -- 4. Update Statuses
    UPDATE public.payments SET status = 'completed', updated_at = NOW() WHERE id = p_payment_id;
    UPDATE public.emergency_requests SET status = 'in_progress', updated_at = NOW() WHERE id = p_request_id;
    UPDATE public.visits SET status = 'active', updated_at = NOW() WHERE request_id = p_request_id;

    RETURN jsonb_build_object('success', TRUE, 'fee_deducted', v_fee);
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
    v_payment_id UUID;
    v_fee NUMERIC;
BEGIN
    v_fee := p_amount * 0.025;

    -- 1. Create Payment
    INSERT INTO public.payments (
        emergency_request_id,
        amount,
        currency,
        payment_method,
        status,
        metadata,
        created_at
    ) VALUES (
        p_emergency_request_id,
        p_amount,
        p_currency,
        'cash',
        'completed',
        jsonb_build_object('fee_amount', v_fee, 'manual_entry', true),
        NOW()
    ) RETURNING id INTO v_payment_id;

    -- 2. Deduct Fee
    UPDATE public.organization_wallets
    SET balance = balance - v_fee,
        updated_at = NOW()
    WHERE organization_id = p_organization_id;

    -- 3. Record Ledger
    INSERT INTO public.wallet_ledger (
        organization_id,
        amount,
        type,
        description,
        metadata
    ) VALUES (
        p_organization_id,
        -v_fee,
        'fee_deduction',
        'Manual cash payment fee for ' || p_emergency_request_id,
        jsonb_build_object('payment_id', v_payment_id)
    );

    RETURN jsonb_build_object('success', TRUE, 'payment_id', v_payment_id, 'fee_deducted', v_fee);
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
