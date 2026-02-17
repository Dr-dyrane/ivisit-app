-- Migration: Financial System RLS and Ledger Robustness
-- Purpose:
-- 1. Ensure Admins see ALL financial records
-- 2. Ensure Org Admins see their own wallet and ledger
-- 3. Standardize organization_id tracking in ledger

-- 0. Helper Function for RLS (Must be defined first)
CREATE OR REPLACE FUNCTION public.p_is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Standardize RLS for Wallets
ALTER TABLE public.ivisit_main_wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 1a. main_wallet Policies
DROP POLICY IF EXISTS "Admins see main wallet" ON public.ivisit_main_wallet;
CREATE POLICY "Admins see main wallet" ON public.ivisit_main_wallet
    FOR ALL USING (p_is_admin()); -- Using helper if exists, or direct check

-- 1b. org_wallets Policies
DROP POLICY IF EXISTS "Admins see all org wallets" ON public.organization_wallets;
CREATE POLICY "Admins see all org wallets" ON public.organization_wallets
    FOR SELECT USING (p_is_admin());

DROP POLICY IF EXISTS "Org admins see own wallet" ON public.organization_wallets;
CREATE POLICY "Org admins see own wallet" ON public.organization_wallets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() 
            AND (p.role = 'org_admin' AND (p.organization_id = organization_wallets.organization_id OR p.organization_id::text IN (SELECT id::text FROM public.hospitals WHERE organization_id = organization_wallets.organization_id)))
        )
    );

-- 1c. wallet_ledger Policies (Critical)
DROP POLICY IF EXISTS "Admins see all ledger" ON public.wallet_ledger;
CREATE POLICY "Admins see all ledger" ON public.wallet_ledger
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Org admins see their ledger" ON public.wallet_ledger;
CREATE POLICY "Org admins see their ledger" ON public.wallet_ledger
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() 
            AND (
                p.organization_id = wallet_ledger.organization_id
                OR p.organization_id::text IN (SELECT id::text FROM public.hospitals WHERE organization_id = wallet_ledger.organization_id)
            )
        )
    );

-- 1d. payments Policies
DROP POLICY IF EXISTS "Admins see all payments" ON public.payments;
CREATE POLICY "Admins see all payments" ON public.payments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Org admins see their payments" ON public.payments;
CREATE POLICY "Org admins see their payments" ON public.payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() 
            AND (
                p.organization_id = payments.organization_id
                OR p.organization_id::text IN (SELECT id::text FROM public.hospitals WHERE organization_id = payments.organization_id)
            )
        )
    );

-- 2. Update process_payment_with_ledger to track Org ID in platform entries
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
    v_is_cash BOOLEAN;
BEGIN
    v_already_credited := (NEW.metadata->>'ledger_credited')::boolean;
    v_is_top_up := (NEW.metadata->>'is_top_up')::boolean;
    v_is_cash := (NEW.payment_method_id::text = 'cash');

    -- Resolve Org ID if missing
    IF NEW.organization_id IS NULL AND NEW.emergency_request_id IS NOT NULL THEN
        SELECT h.organization_id INTO v_organization_id
        FROM public.emergency_requests er
        JOIN public.hospitals h ON er.hospital_id::text = h.id::text
        WHERE er.id::text = NEW.emergency_request_id::text;
        NEW.organization_id := v_organization_id;
    END IF;

    -- Financial logic
    IF NEW.status = 'completed' AND COALESCE(v_already_credited, false) = false THEN
        NEW.metadata := jsonb_set(COALESCE(NEW.metadata, '{}'::jsonb), '{ledger_credited}', 'true');
        SELECT id INTO v_main_wallet_id FROM public.ivisit_main_wallet LIMIT 1;
        
        IF v_is_top_up THEN
            IF NEW.organization_id IS NULL THEN
                UPDATE public.ivisit_main_wallet SET balance = balance + NEW.amount WHERE id = v_main_wallet_id;
                INSERT INTO public.wallet_ledger (wallet_type, wallet_id, amount, transaction_type, description, reference_id, reference_type)
                VALUES ('main', v_main_wallet_id, NEW.amount, 'credit', 'Platform top-up', NEW.id, 'adjustment');
            ELSE
                INSERT INTO public.organization_wallets (organization_id, balance) VALUES (NEW.organization_id, NEW.amount)
                ON CONFLICT (organization_id) DO UPDATE SET balance = organization_wallets.balance + NEW.amount RETURNING id INTO v_org_wallet_id;
                INSERT INTO public.wallet_ledger (wallet_type, wallet_id, organization_id, amount, transaction_type, description, reference_id, reference_type)
                VALUES ('organization', v_org_wallet_id, NEW.organization_id, NEW.amount, 'credit', 'Org top-up', NEW.id, 'adjustment');
            END IF;
        ELSIF NEW.organization_id IS NOT NULL THEN
            SELECT ivisit_fee_percentage INTO v_fee_rate FROM public.organizations WHERE id = NEW.organization_id;
            v_fee_rate := COALESCE(v_fee_rate, 2.5);
            v_fee_amount := (NEW.amount * v_fee_rate) / 100;
            v_organization_amount := NEW.amount - v_fee_amount;
            
            IF v_is_cash THEN
                UPDATE public.organization_wallets SET balance = balance - v_fee_amount WHERE organization_id = NEW.organization_id RETURNING id INTO v_org_wallet_id;
                INSERT INTO public.wallet_ledger (wallet_type, wallet_id, organization_id, user_id, amount, transaction_type, description, reference_id, reference_type)
                VALUES ('organization', v_org_wallet_id, NEW.organization_id, NEW.user_id, -v_fee_amount, 'debit', 'Cash fee for ' || COALESCE(NEW.emergency_request_id, NEW.id::text), NEW.id, 'payment');
            ELSE
                INSERT INTO public.organization_wallets (organization_id, balance) VALUES (NEW.organization_id, v_organization_amount)
                ON CONFLICT (organization_id) DO UPDATE SET balance = organization_wallets.balance + v_organization_amount RETURNING id INTO v_org_wallet_id;
                INSERT INTO public.wallet_ledger (wallet_type, wallet_id, organization_id, user_id, amount, transaction_type, description, reference_id, reference_type)
                VALUES ('organization', v_org_wallet_id, NEW.organization_id, NEW.user_id, v_organization_amount, 'credit', 'Payment ' || COALESCE(NEW.emergency_request_id, NEW.id::text), NEW.id, 'payment');
            END IF;
            
            -- Important: Track Org ID even on platform credit for unified reporting
            UPDATE public.ivisit_main_wallet SET balance = balance + v_fee_amount WHERE id = v_main_wallet_id;
            INSERT INTO public.wallet_ledger (wallet_type, wallet_id, organization_id, user_id, amount, transaction_type, description, reference_id, reference_type)
            VALUES ('main', v_main_wallet_id, NEW.organization_id, NEW.user_id, v_fee_amount, 'credit', 'Platform fee from ' || COALESCE(NEW.emergency_request_id, NEW.id::text), NEW.id, 'payment');
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reload schema
NOTIFY pgrst, 'reload schema';
