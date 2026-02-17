-- Final Stabilization Migration: Notifications, Ledger Clarity, and Robust RLS
-- Purpose:
-- 1. Notify Org Admins when an emergency request is created
-- 2. Improve wallet_ledger association with user_id
-- 3. Robust RLS for Org Admins on Ledger
-- 4. Fix payment linkage constraints

-- 1. Create Notification Trigger Function for Org Admins
CREATE OR REPLACE FUNCTION public.notify_org_admins_on_emergency()
RETURNS TRIGGER AS $$
DECLARE
    v_org_id UUID;
    v_admin_id UUID;
    v_hospital_name TEXT;
BEGIN
    -- 1. Find the organization_id from the hospital
    SELECT organization_id, name INTO v_org_id, v_hospital_name
    FROM public.hospitals
    WHERE id::text = NEW.hospital_id::text;

    -- If no org found, we can't notify anyone specific
    IF v_org_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- 2. Find all org_admins for this organization
    FOR v_admin_id IN 
        SELECT id FROM public.profiles 
        WHERE (organization_id = v_org_id OR organization_id::text IN (SELECT id::text FROM public.hospitals WHERE organization_id = v_org_id))
        AND role IN ('org_admin', 'admin')
    LOOP
        -- 3. Create notification record
        INSERT INTO public.notifications (
            user_id,
            type,
            title,
            message,
            priority,
            metadata
        ) VALUES (
            v_admin_id,
            'emergency',
            'New ' || initcap(NEW.service_type) || ' Request',
            'A request at ' || COALESCE(NEW.patient_location, 'Unknown Location') || ' requires attention.',
            'high',
            jsonb_build_object(
                'request_id', NEW.id,
                'hospital_id', NEW.hospital_id,
                'service_type', NEW.service_type,
                'patient_name', NEW.patient_name
            )
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attachment
DROP TRIGGER IF EXISTS on_emergency_request_created ON public.emergency_requests;
CREATE TRIGGER on_emergency_request_created
    AFTER INSERT ON public.emergency_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_org_admins_on_emergency();

-- 2. ENHANCED Payment Ledger Trigger with USER_ID support
CREATE OR REPLACE FUNCTION public.process_payment_with_ledger()
RETURNS TRIGGER AS $$
DECLARE
    v_organization_id UUID;
    v_fee_amount DECIMAL;
    v_organization_amount DECIMAL;
    v_fee_rate DECIMAL;
    v_main_wallet_id UUID;
    v_org_wallet_id UUID;
    v_already_credited BOOLEAN;
    v_is_top_up BOOLEAN;
BEGIN
    -- 1. Identify context
    v_already_credited := (NEW.metadata->>'ledger_credited')::boolean;
    v_is_top_up := (NEW.metadata->>'is_top_up')::boolean;
    
    -- Link from Emergency Request -> Hospital -> Organization if missing
    IF NEW.organization_id IS NULL AND NEW.emergency_request_id IS NOT NULL THEN
        SELECT h.organization_id INTO v_organization_id
        FROM public.emergency_requests er
        JOIN public.hospitals h ON er.hospital_id = h.id::text
        WHERE er.id = NEW.emergency_request_id;
        NEW.organization_id := v_organization_id;
    END IF;

    -- 2. Financial logic ONLY on status 'completed' and not already credited
    IF NEW.status = 'completed' AND COALESCE(v_already_credited, false) = false THEN
        
        -- Start Process
        NEW.metadata := jsonb_set(COALESCE(NEW.metadata, '{}'::jsonb), '{ledger_credited}', 'true');
        SELECT id INTO v_main_wallet_id FROM public.ivisit_main_wallet LIMIT 1;

        -- CASE A: Platform Top-Up
        IF NEW.organization_id IS NULL AND v_is_top_up THEN
            UPDATE public.ivisit_main_wallet 
            SET balance = balance + NEW.amount, last_updated = NOW() 
            WHERE id = v_main_wallet_id;

            INSERT INTO public.wallet_ledger (
                wallet_type, wallet_id, organization_id, user_id, amount, 
                transaction_type, description, reference_id, reference_type
            ) VALUES (
                'main', v_main_wallet_id, NULL, NEW.user_id, NEW.amount,
                'credit', 'Platform top-up', NEW.id, 'adjustment'
            );

        -- CASE B: Organization Top-Up
        ELSIF NEW.organization_id IS NOT NULL AND v_is_top_up THEN
            INSERT INTO public.organization_wallets (organization_id, balance)
            VALUES (NEW.organization_id, NEW.amount)
            ON CONFLICT (organization_id) 
            DO UPDATE SET balance = organization_wallets.balance + NEW.amount, updated_at = NOW()
            RETURNING id INTO v_org_wallet_id;

            INSERT INTO public.wallet_ledger (
                wallet_type, wallet_id, organization_id, user_id, amount, 
                transaction_type, description, reference_id, reference_type
            ) VALUES (
                'organization', v_org_wallet_id, NEW.organization_id, NEW.user_id, NEW.amount,
                'credit', 'Organization top-up', NEW.id, 'adjustment'
            );

        -- CASE C: Standard Service Payment (Applies 2.5% platform fee)
        ELSIF NEW.organization_id IS NOT NULL THEN
            -- Calculate Fees
            SELECT ivisit_fee_percentage INTO v_fee_rate FROM public.organizations WHERE id = NEW.organization_id;
            v_fee_rate := COALESCE(v_fee_rate, 2.5);
            v_fee_amount := (NEW.amount * v_fee_rate) / 100;
            v_organization_amount := NEW.amount - v_fee_amount;
            
            NEW.organization_fee_rate := v_fee_rate;
            NEW.ivisit_deduction_amount := v_fee_amount;
            
            -- Handle Cash Payment vs Digital Payment
            IF NEW.payment_method_id = 'cash' THEN
                -- CASH FLOW: Deduct fee from Org Wallet (Manual Confirmation)
                INSERT INTO public.organization_wallets (organization_id, balance)
                VALUES (NEW.organization_id, -v_fee_amount)
                ON CONFLICT (organization_id) 
                DO UPDATE SET balance = organization_wallets.balance - v_fee_amount, updated_at = NOW()
                RETURNING id INTO v_org_wallet_id;

                INSERT INTO public.wallet_ledger (
                    wallet_type, wallet_id, organization_id, user_id, amount, 
                    transaction_type, description, reference_id, reference_type
                ) VALUES (
                    'organization', v_org_wallet_id, NEW.organization_id, NEW.user_id, -v_fee_amount,
                    'debit', 'Cash platform fee: ' || COALESCE(NEW.emergency_request_id, 'Manual'), NEW.id, 'payment'
                );
            ELSE
                -- DIGITAL FLOW: Credit Org Wallet with 97.5%
                INSERT INTO public.organization_wallets (organization_id, balance)
                VALUES (NEW.organization_id, v_organization_amount)
                ON CONFLICT (organization_id) 
                DO UPDATE SET balance = organization_wallets.balance + v_organization_amount, updated_at = NOW()
                RETURNING id INTO v_org_wallet_id;
                
                INSERT INTO public.wallet_ledger (
                    wallet_type, wallet_id, organization_id, user_id, amount, 
                    transaction_type, description, reference_id, reference_type
                ) VALUES (
                    'organization', v_org_wallet_id, NEW.organization_id, NEW.user_id, v_organization_amount,
                    'credit', 'Service payment: ' || COALESCE(NEW.emergency_request_id, NEW.id::text), NEW.id, 'payment'
                );
            END IF;
            
            -- BOTH FLOWS: Credit Platform Wallet (Fee)
            UPDATE public.ivisit_main_wallet 
            SET balance = balance + v_fee_amount, last_updated = NOW() 
            WHERE id = v_main_wallet_id;
            
            INSERT INTO public.wallet_ledger (
                wallet_type, wallet_id, organization_id, user_id, amount, 
                transaction_type, description, reference_id, reference_type
            ) VALUES (
                'main', v_main_wallet_id, NULL, NEW.user_id, v_fee_amount,
                'credit', 'Platform fee from transition ' || NEW.id, NEW.id, 'payment'
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. ROBUST RLS FOR LEDGER
DROP POLICY IF EXISTS "Org admins see their ledger" ON public.wallet_ledger;
CREATE POLICY "Org admins see their ledger" ON public.wallet_ledger
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() 
            AND (
                p.role = 'admin'
                OR p.organization_id = wallet_ledger.organization_id
                OR EXISTS (
                    SELECT 1 FROM public.hospitals h 
                    WHERE h.id::text = p.organization_id::text 
                    AND h.organization_id = wallet_ledger.organization_id
                )
            )
        )
    );

-- 4. Correct approve_cash_payment to avoid double ledger entries (removed manual insert, rely on trigger)
CREATE OR REPLACE FUNCTION public.approve_cash_payment(
    p_payment_id UUID,
    p_request_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_payment RECORD;
    v_fee_amount DECIMAL;
BEGIN
    -- 1. Get payment data
    SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment not found');
    END IF;

    -- 2. Update payment status to 'completed'
    -- This will fire process_payment_with_ledger trigger which handles the fee deduction correctly
    UPDATE public.payments 
    SET status = 'completed', 
        updated_at = NOW() 
    WHERE id = p_payment_id;

    -- 3. Update emergency request status
    UPDATE public.emergency_requests 
    SET status = 'accepted', 
        payment_status = 'completed',
        payment_id = p_payment_id,
        updated_at = NOW() 
    WHERE id = p_request_id;

    RETURN jsonb_build_object(
        'success', true, 
        'payment_id', p_payment_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

NOTIFY pgrst, 'reload schema';
