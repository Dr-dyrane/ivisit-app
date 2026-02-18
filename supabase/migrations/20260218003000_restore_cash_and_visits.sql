-- ============================================================================
-- RESTORE CASH APPROVAL & VISIT SYNC — 2026-02-18
-- ============================================================================
-- 1. Restores `approve_cash_payment` and `decline_cash_payment` (Lost in 20260217220000)
-- 2. Upgrades `sync_emergency_to_visit` to correctly INSERT new visits (Lost logic)
-- ============================================================================

BEGIN;

-- ═══════════════════════════════════════════════════════════
-- 1. RESTORE CASH APPROVAL RPCs
-- ═══════════════════════════════════════════════════════════

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
    -- Note: Ensure compatibility with both UUID and TEXT organization_id if we are in transition, 
    -- but schema says UUID now.
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

    -- 3. Update emergency request — back to pending or declined state
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

GRANT EXECUTE ON FUNCTION public.approve_cash_payment(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_cash_payment(UUID, UUID) TO service_role;

GRANT EXECUTE ON FUNCTION public.decline_cash_payment(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_cash_payment(UUID, UUID) TO service_role;

-- ═══════════════════════════════════════════════════════════
-- 2. UPGRADE VISIT SYNC TRIGGER (Ensure Visits are Created)
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.sync_emergency_to_visit()
RETURNS TRIGGER AS $$
DECLARE
    v_hospital_address TEXT; v_hospital_phone TEXT; v_hospital_image TEXT; v_visit_status TEXT;
    v_hospital_name TEXT;
BEGIN
    IF (TG_OP = 'UPDATE' AND OLD.status = NEW.status AND OLD.ambulance_id IS NOT DISTINCT FROM NEW.ambulance_id AND OLD.responder_name IS NOT DISTINCT FROM NEW.responder_name) THEN
        RETURN NEW;
    END IF;

    SELECT COALESCE(h.google_address, h.address), COALESCE(h.google_phone, h.phone), h.image, h.name
    INTO v_hospital_address, v_hospital_phone, v_hospital_image, v_hospital_name
    FROM public.hospitals h WHERE h.id::text = NEW.hospital_id::text;

    v_visit_status := CASE NEW.status
        WHEN 'pending_approval' THEN 'pending' WHEN 'payment_declined' THEN 'cancelled' WHEN 'in_progress' THEN 'upcoming'
        WHEN 'accepted' THEN 'upcoming' WHEN 'arrived' THEN 'in-progress' WHEN 'completed' THEN 'completed' WHEN 'cancelled' THEN 'cancelled'
        ELSE 'upcoming'
    END;

    -- Try UPDATE first (Standard Supabase Pattern for avoiding race conditions)
    UPDATE public.visits SET status = v_visit_status, cost = COALESCE(NEW.total_cost::text, visits.cost),
        address = COALESCE(v_hospital_address, visits.address), phone = COALESCE(v_hospital_phone, visits.phone),
        image = COALESCE(v_hospital_image, visits.image), doctor = COALESCE(NEW.responder_name, visits.doctor), updated_at = NOW()
    WHERE id = NEW.id::text OR request_id = NEW.request_id OR request_id = NEW.id::text;

    IF NOT FOUND THEN
        -- Insert new visit if not found
        INSERT INTO public.visits (
            id, user_id, hospital_id, hospital, specialty,
            date, time, type, status, request_id,
            created_at, updated_at
        )
        VALUES (
            NEW.id::text, NEW.user_id, NEW.hospital_id::text, COALESCE(v_hospital_name, NEW.hospital_name),
            NEW.specialty,
            to_char(NEW.created_at, 'YYYY-MM-DD'),
            to_char(NEW.created_at, 'HH12:MI AM'),
            CASE WHEN NEW.service_type = 'ambulance' THEN 'Ambulance Ride' ELSE 'Bed Booking' END,
            v_visit_status,
            NEW.request_id,
            NEW.created_at, NOW()
        )
        ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, updated_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach trigger just in case
DROP TRIGGER IF EXISTS on_emergency_sync_visit ON public.emergency_requests;
CREATE TRIGGER on_emergency_sync_visit AFTER INSERT OR UPDATE ON public.emergency_requests FOR EACH ROW EXECUTE FUNCTION public.sync_emergency_to_visit();

COMMIT;

NOTIFY pgrst, 'reload schema';
