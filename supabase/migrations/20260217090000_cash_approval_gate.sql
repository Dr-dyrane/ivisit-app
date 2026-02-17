-- Migration: Cash Payment Approval Gate
-- For cash payments:
--   Payment stays 'pending', emergency stays 'pending_approval'
--   Org admin must approve before dispatch
-- For card payments:
--   Same as before (auto-complete, immediate dispatch)
--
-- New RPCs:
--   approve_cash_payment(p_payment_id, p_request_id) → deduct fee, dispatch
--   decline_cash_payment(p_payment_id, p_request_id) → cancel, notify user

BEGIN;

-- ═══════════════════════════════════════════════════════════
-- 1. ADD 'pending_approval' to valid emergency statuses
--    (if using check constraints, update them)
-- ═══════════════════════════════════════════════════════════

-- No enum changes needed — status is TEXT, any value works.

-- ═══════════════════════════════════════════════════════════
-- 2. MODIFY ATOMIC RPC: Cash stays pending
-- ═══════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.create_emergency_with_payment(UUID, JSONB, JSONB);

CREATE OR REPLACE FUNCTION public.create_emergency_with_payment(
    p_user_id UUID,
    p_request_data JSONB,
    p_payment_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_request_id UUID;
    v_payment_id UUID;
    v_hospital_id UUID;
    v_organization_id UUID;
    v_base_amount NUMERIC;
    v_total_amount NUMERIC;
    v_currency TEXT;
    v_payment_method TEXT;
    v_fee_rate NUMERIC;
    v_calculated_fee NUMERIC;
    v_wallet_id UUID;
    v_wallet_balance NUMERIC;
    v_main_wallet_id UUID;
    v_display_id TEXT;
    v_hospital_name TEXT;
    v_is_cash BOOLEAN;
    v_payment_status TEXT;
    v_emergency_status TEXT;
BEGIN
    -- ═══════════════════════════════════════════════════════════
    -- 1. EXTRACT & VALIDATE
    -- ═══════════════════════════════════════════════════════════
    v_hospital_id := (p_request_data->>'hospital_id')::UUID;
    v_base_amount := COALESCE((p_payment_data->>'base_amount')::NUMERIC, 0);
    v_total_amount := COALESCE((p_payment_data->>'total_amount')::NUMERIC, 0);
    v_currency := COALESCE(p_payment_data->>'currency', 'USD');
    v_payment_method := COALESCE(p_payment_data->>'method', 'cash');
    v_display_id := COALESCE(p_request_data->>'request_id', 'REQ-' || floor(extract(epoch from now())));
    v_is_cash := (v_payment_method = 'cash');

    IF v_hospital_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Hospital ID is required');
    END IF;

    -- Resolve Organization
    SELECT h.organization_id, h.name 
    INTO v_organization_id, v_hospital_name 
    FROM public.hospitals h WHERE h.id = v_hospital_id;
    
    IF v_organization_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Hospital has no linked organization');
    END IF;

    -- Get fee rate
    SELECT COALESCE(o.ivisit_fee_percentage, 2.5) INTO v_fee_rate 
    FROM public.organizations o WHERE o.id = v_organization_id;
    v_fee_rate := COALESCE(v_fee_rate, 2.5);

    -- Calculate fee on base amount
    v_calculated_fee := ROUND((v_base_amount * v_fee_rate) / 100, 2);

    -- If total wasn't passed, calculate it
    IF v_total_amount = 0 THEN
        v_total_amount := v_base_amount + v_calculated_fee;
    END IF;

    -- ═══════════════════════════════════════════════════════════
    -- 2. DETERMINE PAYMENT FLOW
    -- ═══════════════════════════════════════════════════════════
    IF v_is_cash THEN
        -- CASH: Org must pre-approve. Payment stays pending.
        -- Validate org wallet exists and COULD cover fee (soft check)
        SELECT ow.id, ow.balance INTO v_wallet_id, v_wallet_balance
        FROM public.organization_wallets ow
        WHERE ow.organization_id = v_organization_id;

        IF v_wallet_id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'Organization wallet not initialized');
        END IF;

        IF v_wallet_balance < v_calculated_fee THEN
            RETURN jsonb_build_object(
                'success', false, 
                'error', 'Organization insufficient balance for platform fee',
                'code', 'ORG_INSUFFICIENT_FUNDS',
                'required', v_calculated_fee,
                'available', v_wallet_balance
            );
        END IF;

        -- Cash: payment pending, emergency pending_approval
        v_payment_status := 'pending';
        v_emergency_status := 'pending_approval';
    ELSE
        -- CARD: Auto-complete (no approval gate)
        v_payment_status := 'completed';
        v_emergency_status := 'in_progress';
    END IF;

    -- ═══════════════════════════════════════════════════════════
    -- 3. CREATE PAYMENT STUB
    -- ═══════════════════════════════════════════════════════════
    INSERT INTO public.payments (
        user_id, amount, currency, status, payment_method_id,
        emergency_request_id, organization_id, metadata
    ) VALUES (
        p_user_id,
        v_total_amount,
        v_currency,
        v_payment_status,
        v_payment_method,
        NULL, -- Linked after emergency creation
        v_organization_id,
        jsonb_build_object(
            'base_amount', v_base_amount,
            'fee_amount', v_calculated_fee,
            'fee_rate', v_fee_rate,
            'source', 'create_emergency_with_payment',
            'hospital_id', v_hospital_id::text,
            'hospital_name', v_hospital_name,
            'requires_approval', v_is_cash
        )
    )
    RETURNING id INTO v_payment_id;

    -- ═══════════════════════════════════════════════════════════
    -- 4. PROCESS FEE (CARD ONLY — cash waits for approval)
    -- ═══════════════════════════════════════════════════════════
    IF NOT v_is_cash THEN
        -- Card payments: process fee immediately
        SELECT ow.id, ow.balance INTO v_wallet_id, v_wallet_balance
        FROM public.organization_wallets ow
        WHERE ow.organization_id = v_organization_id;

        IF v_wallet_id IS NOT NULL AND v_wallet_balance >= v_calculated_fee THEN
            UPDATE public.organization_wallets
            SET balance = balance - v_calculated_fee, updated_at = NOW()
            WHERE id = v_wallet_id;

            INSERT INTO public.wallet_ledger (
                wallet_type, wallet_id, organization_id, amount, 
                transaction_type, description, reference_id, reference_type
            ) VALUES (
                'organization', v_wallet_id, v_organization_id, -v_calculated_fee, 
                'debit', 'Platform Fee (Card)', v_payment_id, 'payment'
            );

            SELECT id INTO v_main_wallet_id FROM public.ivisit_main_wallet LIMIT 1;
            IF v_main_wallet_id IS NOT NULL THEN
                UPDATE public.ivisit_main_wallet 
                SET balance = balance + v_calculated_fee, last_updated = NOW() 
                WHERE id = v_main_wallet_id;

                INSERT INTO public.wallet_ledger (
                    wallet_type, wallet_id, amount, 
                    transaction_type, description, reference_id, reference_type
                ) VALUES (
                    'main', v_main_wallet_id, v_calculated_fee, 
                    'credit', 'Fee from Card Payment', v_payment_id, 'payment'
                );
            END IF;
        END IF;
    END IF;

    -- ═══════════════════════════════════════════════════════════
    -- 5. CREATE EMERGENCY REQUEST
    -- ═══════════════════════════════════════════════════════════
    v_request_id := gen_random_uuid();

    INSERT INTO public.emergency_requests (
        id, user_id, hospital_id, hospital_name, service_type,
        specialty, status, patient_location, request_id,
        patient_snapshot, total_cost, payment_status,
        payment_method_id, created_at, updated_at
    )
    VALUES (
        v_request_id, p_user_id, v_hospital_id, v_hospital_name,
        p_request_data->>'service_type', p_request_data->>'specialty',
        v_emergency_status,
        CASE WHEN p_request_data->>'patient_location' IS NOT NULL 
            THEN (p_request_data->>'patient_location') ELSE NULL END,
        v_display_id,
        CASE WHEN p_request_data->'patient_snapshot' IS NOT NULL 
            THEN p_request_data->'patient_snapshot' ELSE NULL END,
        v_total_amount,
        v_payment_status,
        v_payment_method,
        NOW(), NOW()
    );

    -- ═══════════════════════════════════════════════════════════
    -- 6. LINK PAYMENT → EMERGENCY REQUEST
    -- ═══════════════════════════════════════════════════════════
    UPDATE public.payments 
    SET emergency_request_id = v_request_id, updated_at = NOW()
    WHERE id = v_payment_id;

    -- ═══════════════════════════════════════════════════════════
    -- 7. RETURN SUCCESS
    -- ═══════════════════════════════════════════════════════════
    RETURN jsonb_build_object(
        'success', true, 
        'request_id', v_request_id, 
        'payment_id', v_payment_id,
        'display_id', v_display_id,
        'fee_amount', v_calculated_fee,
        'total_amount', v_total_amount,
        'requires_approval', v_is_cash,
        'payment_status', v_payment_status,
        'emergency_status', v_emergency_status
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_emergency_with_payment(UUID, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_emergency_with_payment(UUID, JSONB, JSONB) TO service_role;


-- ═══════════════════════════════════════════════════════════
-- 3. APPROVE CASH PAYMENT RPC
--    Called by org_admin when they accept the cash job
-- ═══════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.approve_cash_payment(UUID, UUID);

CREATE OR REPLACE FUNCTION public.approve_cash_payment(
    p_payment_id UUID,
    p_request_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_payment RECORD;
    v_organization_id UUID;
    v_fee_amount NUMERIC;
    v_fee_rate NUMERIC;
    v_wallet_id UUID;
    v_wallet_balance NUMERIC;
    v_main_wallet_id UUID;
BEGIN
    -- 1. Validate payment exists and is pending
    SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id;
    
    IF v_payment IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment not found');
    END IF;
    
    IF v_payment.status != 'pending' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment is not pending approval', 'current_status', v_payment.status);
    END IF;

    -- 2. Extract fee info from metadata
    v_organization_id := v_payment.organization_id;
    v_fee_amount := COALESCE((v_payment.metadata->>'fee_amount')::NUMERIC, 0);
    v_fee_rate := COALESCE((v_payment.metadata->>'fee_rate')::NUMERIC, 2.5);

    IF v_fee_amount = 0 THEN
        v_fee_amount := ROUND((v_payment.amount * v_fee_rate) / 100, 2);
    END IF;

    -- 3. Deduct fee from org wallet
    SELECT ow.id, ow.balance INTO v_wallet_id, v_wallet_balance
    FROM public.organization_wallets ow
    WHERE ow.organization_id = v_organization_id;

    IF v_wallet_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Organization wallet not found');
    END IF;

    IF v_wallet_balance < v_fee_amount THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Insufficient wallet balance to cover platform fee',
            'required', v_fee_amount,
            'available', v_wallet_balance
        );
    END IF;

    -- Deduct from org
    UPDATE public.organization_wallets
    SET balance = balance - v_fee_amount, updated_at = NOW()
    WHERE id = v_wallet_id;

    INSERT INTO public.wallet_ledger (
        wallet_type, wallet_id, organization_id, amount, 
        transaction_type, description, reference_id, reference_type
    ) VALUES (
        'organization', v_wallet_id, v_organization_id, -v_fee_amount, 
        'debit', 'Platform Fee (Cash Job Approved)', p_payment_id, 'payment'
    );

    -- Credit platform
    SELECT id INTO v_main_wallet_id FROM public.ivisit_main_wallet LIMIT 1;
    IF v_main_wallet_id IS NOT NULL THEN
        UPDATE public.ivisit_main_wallet 
        SET balance = balance + v_fee_amount, last_updated = NOW() 
        WHERE id = v_main_wallet_id;

        INSERT INTO public.wallet_ledger (
            wallet_type, wallet_id, amount, 
            transaction_type, description, reference_id, reference_type
        ) VALUES (
            'main', v_main_wallet_id, v_fee_amount, 
            'credit', 'Fee from Approved Cash Job', p_payment_id, 'payment'
        );
    END IF;

    -- 4. Mark payment completed
    UPDATE public.payments 
    SET status = 'completed',
        metadata = metadata || jsonb_build_object(
            'approved_at', NOW()::text,
            'approved_by', auth.uid()::text,
            'ledger_credited', true
        ),
        updated_at = NOW()
    WHERE id = p_payment_id;

    -- 5. Update emergency request to in_progress (triggers visit creation/update)
    UPDATE public.emergency_requests 
    SET status = 'in_progress',
        payment_status = 'completed',
        updated_at = NOW()
    WHERE id = p_request_id;

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', p_payment_id,
        'request_id', p_request_id,
        'fee_deducted', v_fee_amount,
        'new_balance', v_wallet_balance - v_fee_amount
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_cash_payment(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_cash_payment(UUID, UUID) TO service_role;


-- ═══════════════════════════════════════════════════════════
-- 4. DECLINE CASH PAYMENT RPC
--    Called by org_admin when they reject the cash job
-- ═══════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.decline_cash_payment(UUID, UUID);

CREATE OR REPLACE FUNCTION public.decline_cash_payment(
    p_payment_id UUID,
    p_request_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_payment RECORD;
BEGIN
    -- 1. Validate
    SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id;
    
    IF v_payment IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment not found');
    END IF;
    
    IF v_payment.status != 'pending' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment is not pending', 'current_status', v_payment.status);
    END IF;

    -- 2. Mark payment declined
    UPDATE public.payments 
    SET status = 'declined',
        metadata = metadata || jsonb_build_object(
            'declined_at', NOW()::text,
            'declined_by', auth.uid()::text
        ),
        updated_at = NOW()
    WHERE id = p_payment_id;

    -- 3. Update emergency request — back to pending state
    --    (Not cancelled — user can retry with different payment)
    UPDATE public.emergency_requests 
    SET status = 'payment_declined',
        payment_status = 'declined',
        updated_at = NOW()
    WHERE id = p_request_id;

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', p_payment_id,
        'request_id', p_request_id,
        'status', 'declined'
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.decline_cash_payment(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_cash_payment(UUID, UUID) TO service_role;


-- ═══════════════════════════════════════════════════════════
-- 5. UPDATE VISIT TRIGGER — handle 'pending_approval' status
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.sync_emergency_to_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- On INSERT: Create a visit record
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.visits (
            id, user_id, hospital_id, hospital, specialty,
            date, time, type, status, request_id,
            created_at, updated_at
        )
        VALUES (
            NEW.id, NEW.user_id, NEW.hospital_id, NEW.hospital_name,
            NEW.specialty,
            to_char(NEW.created_at, 'YYYY-MM-DD'),
            to_char(NEW.created_at, 'HH12:MI AM'),
            CASE WHEN NEW.service_type = 'ambulance' THEN 'Ambulance Ride' ELSE 'Bed Booking' END,
            CASE 
                WHEN NEW.status = 'pending_approval' THEN 'pending'
                WHEN NEW.status = 'in_progress' THEN 'upcoming'
                ELSE NEW.status 
            END,
            NEW.request_id,
            NEW.created_at, NOW()
        )
        ON CONFLICT (id) DO NOTHING;
        
        RETURN NEW;
    END IF;

    -- On UPDATE: Sync status
    IF TG_OP = 'UPDATE' THEN
        UPDATE public.visits 
        SET status = CASE 
                WHEN NEW.status = 'completed' THEN 'completed'
                WHEN NEW.status = 'cancelled' THEN 'cancelled'
                WHEN NEW.status = 'payment_declined' THEN 'cancelled'
                WHEN NEW.status = 'arrived' THEN 'in-progress'
                WHEN NEW.status = 'accepted' THEN 'upcoming'
                WHEN NEW.status = 'in_progress' THEN 'upcoming'
                WHEN NEW.status = 'pending_approval' THEN 'pending'
                ELSE visits.status
            END,
            updated_at = NOW()
        WHERE id = NEW.id;

        IF NOT FOUND THEN
            INSERT INTO public.visits (
                id, user_id, hospital_id, hospital, specialty,
                date, time, type, status, request_id, created_at, updated_at
            )
            VALUES (
                NEW.id, NEW.user_id, NEW.hospital_id, NEW.hospital_name, NEW.specialty,
                to_char(NEW.created_at, 'YYYY-MM-DD'),
                to_char(NEW.created_at, 'HH12:MI AM'),
                CASE WHEN NEW.service_type = 'ambulance' THEN 'Ambulance Ride' ELSE 'Bed Booking' END,
                NEW.status, NEW.request_id, NEW.created_at, NOW()
            )
            ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, updated_at = NOW();
        END IF;
        
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$;

COMMIT;

NOTIFY pgrst, 'reload schema';
