-- 🏯 Module 05: Financials & Insurance
-- Wallets, Ledgers, Payments, and Policies

-- 1. Wallets
CREATE TABLE IF NOT EXISTS public.organization_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
    balance NUMERIC DEFAULT 0.00,
    currency TEXT DEFAULT 'USD',
    display_id TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.patient_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    balance NUMERIC DEFAULT 0.00,
    currency TEXT DEFAULT 'USD',
    display_id TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ivisit_main_wallet (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    balance NUMERIC DEFAULT 0.00,
    currency TEXT DEFAULT 'USD',
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Ledger (Transaction Log)
CREATE TABLE IF NOT EXISTS public.wallet_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL,
    amount NUMERIC NOT NULL,
    transaction_type TEXT NOT NULL, -- 'credit', 'debit', 'payout', 'adjustment'
    description TEXT,
    reference_id UUID, -- Internal ID (Payment ID or Request ID)
    external_reference TEXT, -- External ID (Stripe Intent, Payout ID)
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Payments & Methods
CREATE TABLE IF NOT EXISTS public.payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    provider TEXT NOT NULL,
    last4 TEXT,
    brand TEXT,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    emergency_request_id UUID REFERENCES public.emergency_requests(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES public.organizations(id),
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'USD',
    payment_method TEXT, -- 'cash', 'card', 'wallet'
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'declined')),
    stripe_payment_intent_id TEXT UNIQUE,
    ivisit_fee_amount NUMERIC DEFAULT 0.00,
    provider_response JSONB DEFAULT '{}',
    processed_at TIMESTAMPTZ,
    display_id TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Insurance
CREATE TABLE IF NOT EXISTS public.insurance_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    provider_name TEXT NOT NULL,
    policy_number TEXT,
    plan_type TEXT DEFAULT 'basic',
    status TEXT DEFAULT 'active',
    is_default BOOLEAN DEFAULT false,
    verified BOOLEAN DEFAULT false,
    coverage_percentage INTEGER DEFAULT 80,
    coverage_details JSONB DEFAULT '{}',
    linked_payment_method TEXT,
    starts_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Insurance Billing (B2B: Hospital → Insurance)
CREATE TABLE IF NOT EXISTS public.insurance_billing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emergency_request_id UUID REFERENCES public.emergency_requests(id) ON DELETE SET NULL,
    hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    insurance_policy_id UUID REFERENCES public.insurance_policies(id) ON DELETE SET NULL,
    total_amount NUMERIC(10,2) NOT NULL,
    insurance_amount NUMERIC(10,2) NOT NULL,
    user_amount NUMERIC(10,2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
    billing_date DATE,
    paid_date DATE,
    coverage_percentage INTEGER,
    claim_number TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 🛠️ AUTOMATION: FINANCIAL HOOKS
-- A. Process Fee Distribution on Completion
CREATE OR REPLACE FUNCTION public.process_payment_distribution()
RETURNS TRIGGER AS $$
DECLARE
    v_org_wallet_id UUID;
    v_platform_wallet_id UUID;
    v_net_amount NUMERIC;
BEGIN
    -- Only distribute for COMPLETED payments that are NOT cash
    -- (Cash payments are handled manually via Emergency Logic: approve_cash_payment)
    IF (NEW.status = 'completed') AND (OLD.status != 'completed') AND (NEW.payment_method != 'cash') THEN
        -- Get Organization Wallet
        SELECT id INTO v_org_wallet_id FROM public.organization_wallets WHERE organization_id = NEW.organization_id;
        
        -- Get Platform Wallet
        SELECT id INTO v_platform_wallet_id FROM public.ivisit_main_wallet LIMIT 1;
        
        -- Calculate Net
        v_net_amount := NEW.amount - NEW.ivisit_fee_amount;
        
        -- Credit Org Wallet
        UPDATE public.organization_wallets SET balance = balance + v_net_amount WHERE id = v_org_wallet_id;
        INSERT INTO public.wallet_ledger (wallet_id, amount, transaction_type, description, reference_id)
        VALUES (v_org_wallet_id, v_net_amount, 'credit', 'Service Payment (Net)', NEW.id);
        
        -- Credit Platform Wallet
        UPDATE public.ivisit_main_wallet SET balance = balance + NEW.ivisit_fee_amount WHERE id = v_platform_wallet_id;
        INSERT INTO public.wallet_ledger (wallet_id, amount, transaction_type, description, reference_id)
        VALUES (v_platform_wallet_id, NEW.ivisit_fee_amount, 'credit', 'Platform Fee', NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- B. Wallet Payment Processing
CREATE OR REPLACE FUNCTION public.process_wallet_payment(
    p_user_id UUID,
    p_organization_id UUID,
    p_emergency_request_id UUID,
    p_amount NUMERIC,
    p_currency TEXT DEFAULT 'USD'
)
RETURNS JSONB AS $$
DECLARE
    v_wallet_id UUID;
    v_balance NUMERIC;
    v_payment_id UUID;
BEGIN
    -- 1. Check Wallet
    SELECT id, balance INTO v_wallet_id, v_balance 
    FROM public.patient_wallets 
    WHERE user_id = p_user_id;

    IF v_wallet_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
    END IF;

    IF v_balance < p_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
    END IF;

    -- 2. Deduct Funds
    UPDATE public.patient_wallets 
    SET balance = balance - p_amount 
    WHERE id = v_wallet_id;

    -- 3. Create Payment Record
    INSERT INTO public.payments (
        user_id, 
        emergency_request_id, 
        organization_id, 
        amount, 
        currency, 
        payment_method, 
        status, 
        processed_at
    )
    VALUES (
        p_user_id, 
        p_emergency_request_id, 
        p_organization_id, 
        p_amount, 
        p_currency, 
        'wallet', 
        'completed', 
        NOW()
    )
    RETURNING id INTO v_payment_id;

    -- 4. Record Ledger
    INSERT INTO public.wallet_ledger (wallet_id, amount, transaction_type, description, reference_id)
    VALUES (v_wallet_id, -p_amount, 'debit', 'Emergency Service Payment', v_payment_id);

    RETURN jsonb_build_object(
        'success', true, 
        'payment_id', v_payment_id, 
        'new_balance', (v_balance - p_amount)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_payment_completed
AFTER UPDATE ON public.payments
FOR EACH ROW EXECUTE PROCEDURE public.process_payment_distribution();

CREATE TRIGGER stamp_pay_display_id BEFORE INSERT ON public.payments FOR EACH ROW EXECUTE PROCEDURE public.stamp_entity_display_id();
CREATE TRIGGER stamp_pat_wallet_display_id BEFORE INSERT ON public.patient_wallets FOR EACH ROW EXECUTE PROCEDURE public.stamp_entity_display_id();
CREATE TRIGGER stamp_org_wallet_display_id BEFORE INSERT ON public.organization_wallets FOR EACH ROW EXECUTE PROCEDURE public.stamp_entity_display_id();

-- Standard Updates
CREATE TRIGGER handle_pay_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_org_wallet_updated_at BEFORE UPDATE ON public.organization_wallets FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_patient_wallet_updated_at BEFORE UPDATE ON public.patient_wallets FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_insurance_updated_at BEFORE UPDATE ON public.insurance_policies FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_insurance_billing_updated_at BEFORE UPDATE ON public.insurance_billing FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_methods_active ON public.payment_methods(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_insurance_user_id ON public.insurance_policies(user_id);
CREATE INDEX IF NOT EXISTS idx_insurance_billing_request ON public.insurance_billing(emergency_request_id);
CREATE INDEX IF NOT EXISTS idx_insurance_billing_hospital ON public.insurance_billing(hospital_id);
CREATE INDEX IF NOT EXISTS idx_insurance_billing_user ON public.insurance_billing(user_id);
CREATE INDEX IF NOT EXISTS idx_insurance_billing_status ON public.insurance_billing(status);
