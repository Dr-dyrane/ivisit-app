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
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    provider TEXT NOT NULL,
    last4 TEXT,
    brand TEXT,
    expiry_month INTEGER CHECK (expiry_month BETWEEN 1 AND 12),
    expiry_year INTEGER,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
    metadata JSONB DEFAULT '{}',             -- stores fee_amount, method_id, extra context
    provider_response JSONB DEFAULT '{}',
    processed_at TIMESTAMPTZ,
    display_id TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'visits'
          AND constraint_name = 'visits_tip_amount_nonnegative_chk'
    ) THEN
        ALTER TABLE public.visits
        ADD CONSTRAINT visits_tip_amount_nonnegative_chk
        CHECK (tip_amount IS NULL OR tip_amount >= 0);
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'visits'
          AND constraint_name = 'visits_tip_payment_id_fkey'
    ) THEN
        ALTER TABLE public.visits
        ADD CONSTRAINT visits_tip_payment_id_fkey
        FOREIGN KEY (tip_payment_id) REFERENCES public.payments(id) ON DELETE SET NULL;
    END IF;
END
$$;

-- 4. Insurance
CREATE TABLE IF NOT EXISTS public.insurance_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    provider_name TEXT NOT NULL,
    policy_number TEXT NOT NULL,
    policy_type TEXT DEFAULT 'basic',
    coverage_amount NUMERIC(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
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
    v_net_amount NUMERIC := 0;
    v_fee_amount NUMERIC := 0;
    v_is_top_up BOOLEAN := false;
BEGIN
    IF NEW.status IS DISTINCT FROM 'completed' THEN
        RETURN NEW;
    END IF;

    IF COALESCE(OLD.status, '') = 'completed' THEN
        RETURN NEW;
    END IF;

    IF COALESCE(NEW.payment_method, '') = 'cash' THEN
        RETURN NEW;
    END IF;

    v_is_top_up := COALESCE((NEW.metadata->>'is_top_up')::BOOLEAN, false);

    -- Platform top-ups and payments without destination org do not feed org/platform settlement wallets.
    IF v_is_top_up OR NEW.organization_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT id INTO v_org_wallet_id
    FROM public.organization_wallets
    WHERE organization_id = NEW.organization_id
    LIMIT 1
    FOR UPDATE;

    IF v_org_wallet_id IS NULL THEN
        INSERT INTO public.organization_wallets (organization_id, balance, currency, created_at, updated_at)
        VALUES (
            NEW.organization_id,
            0,
            COALESCE(NULLIF(NEW.currency, ''), 'USD'),
            NOW(),
            NOW()
        )
        RETURNING id INTO v_org_wallet_id;
    END IF;

    SELECT id INTO v_platform_wallet_id
    FROM public.ivisit_main_wallet
    LIMIT 1
    FOR UPDATE;

    IF v_platform_wallet_id IS NULL THEN
        INSERT INTO public.ivisit_main_wallet (balance, currency, last_updated)
        VALUES (
            0,
            COALESCE(NULLIF(NEW.currency, ''), 'USD'),
            NOW()
        )
        RETURNING id INTO v_platform_wallet_id;
    END IF;

    v_fee_amount := GREATEST(ROUND(COALESCE(NEW.ivisit_fee_amount, 0)::NUMERIC, 2), 0);
    v_net_amount := GREATEST(ROUND(COALESCE(NEW.amount, 0)::NUMERIC - v_fee_amount, 2), 0);

    IF v_net_amount > 0 THEN
        UPDATE public.organization_wallets
        SET balance = COALESCE(balance, 0) + v_net_amount,
            updated_at = NOW()
        WHERE id = v_org_wallet_id;

        INSERT INTO public.wallet_ledger (
            wallet_id,
            amount,
            transaction_type,
            description,
            reference_id,
            metadata,
            created_at
        )
        VALUES (
            v_org_wallet_id,
            v_net_amount,
            'credit',
            'Service Payment (Net)',
            NEW.id,
            jsonb_build_object(
                'source', 'process_payment_distribution',
                'payment_method', COALESCE(NEW.payment_method, 'unknown'),
                'ivisit_fee_amount', v_fee_amount
            ),
            COALESCE(NEW.processed_at, NEW.updated_at, NEW.created_at, NOW())
        );
    END IF;

    IF v_fee_amount > 0 THEN
        UPDATE public.ivisit_main_wallet
        SET balance = COALESCE(balance, 0) + v_fee_amount,
            last_updated = NOW()
        WHERE id = v_platform_wallet_id;

        INSERT INTO public.wallet_ledger (
            wallet_id,
            amount,
            transaction_type,
            description,
            reference_id,
            metadata,
            created_at
        )
        VALUES (
            v_platform_wallet_id,
            v_fee_amount,
            'credit',
            'Platform Fee',
            NEW.id,
            jsonb_build_object(
                'source', 'process_payment_distribution',
                'payment_method', COALESCE(NEW.payment_method, 'unknown')
            ),
            COALESCE(NEW.processed_at, NEW.updated_at, NEW.created_at, NOW())
        );
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
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_wallet_id UUID;
    v_balance NUMERIC;
    v_payment_id UUID;
    v_fee_percentage NUMERIC := 2.5;
    v_fee_amount NUMERIC := 0;
BEGIN
    IF p_user_id IS NULL OR p_organization_id IS NULL OR p_emergency_request_id IS NULL OR p_amount IS NULL OR p_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid wallet payment payload');
    END IF;

    IF NOT v_is_service_role THEN
        IF v_actor_id IS NULL THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;

        IF v_actor_id IS DISTINCT FROM p_user_id THEN
            SELECT role, organization_id
            INTO v_actor_role, v_actor_org_id
            FROM public.profiles
            WHERE id = v_actor_id;

            IF v_actor_role NOT IN ('admin', 'org_admin', 'dispatcher') THEN
                RAISE EXCEPTION 'Unauthorized: cannot mutate another user wallet';
            END IF;

            IF v_actor_role IN ('org_admin', 'dispatcher') THEN
                IF v_actor_org_id IS NULL OR v_actor_org_id IS DISTINCT FROM p_organization_id THEN
                    RAISE EXCEPTION 'Unauthorized: emergency request outside actor organization';
                END IF;
            END IF;
        END IF;
    END IF;

    SELECT id, balance INTO v_wallet_id, v_balance
    FROM public.patient_wallets 
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF v_wallet_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
    END IF;

    IF v_balance < p_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
    END IF;

    SELECT COALESCE(NULLIF(ivisit_fee_percentage, 0), 2.5)
    INTO v_fee_percentage
    FROM public.organizations
    WHERE id = p_organization_id;

    v_fee_amount := ROUND(COALESCE(p_amount, 0) * (COALESCE(v_fee_percentage, 2.5) / 100.0), 2);

    -- Deduct user wallet first (same transaction)
    UPDATE public.patient_wallets
    SET balance = balance - p_amount,
        updated_at = NOW()
    WHERE id = v_wallet_id;

    -- Persist payment with explicit fee metadata for downstream settlement trigger.
    INSERT INTO public.payments (
        user_id,
        emergency_request_id,
        organization_id,
        amount,
        currency,
        payment_method,
        status,
        ivisit_fee_amount,
        metadata,
        processed_at,
        created_at,
        updated_at
    )
    VALUES (
        p_user_id,
        p_emergency_request_id,
        p_organization_id,
        p_amount,
        UPPER(COALESCE(NULLIF(TRIM(p_currency), ''), 'USD')),
        'wallet',
        'completed',
        v_fee_amount,
        jsonb_build_object(
            'source', 'process_wallet_payment',
            'payment_kind', 'service',
            'fee_percentage', v_fee_percentage,
            'fee_amount', v_fee_amount,
            'fee', v_fee_amount
        ),
        NOW(),
        NOW(),
        NOW()
    )
    RETURNING id INTO v_payment_id;

    INSERT INTO public.wallet_ledger (
        wallet_id,
        amount,
        transaction_type,
        description,
        reference_id,
        metadata,
        created_at
    )
    VALUES (
        v_wallet_id,
        -p_amount,
        'debit',
        'Emergency Service Payment',
        v_payment_id,
        jsonb_build_object(
            'source', 'process_wallet_payment',
            'payment_kind', 'service'
        ),
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', v_payment_id,
        'fee_amount', v_fee_amount,
        'new_balance', (v_balance - p_amount)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.process_wallet_payment(UUID, UUID, UUID, NUMERIC, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_wallet_payment(UUID, UUID, UUID, NUMERIC, TEXT) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.process_visit_tip(
    p_visit_id UUID,
    p_tip_amount NUMERIC,
    p_currency TEXT DEFAULT 'USD'
)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_visit RECORD;
    v_request_hospital_id UUID;
    v_org_id UUID;
    v_patient_wallet_id UUID;
    v_patient_balance NUMERIC;
    v_patient_balance_after NUMERIC;
    v_payment_id UUID;
    v_tip_amount NUMERIC := ROUND(COALESCE(p_tip_amount, 0)::NUMERIC, 2);
    v_currency TEXT := UPPER(COALESCE(NULLIF(TRIM(p_currency), ''), 'USD'));
BEGIN
    IF v_actor_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;

    IF p_visit_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Visit id is required');
    END IF;

    IF v_tip_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Tip amount must be greater than zero');
    END IF;

    SELECT *
    INTO v_visit
    FROM public.visits
    WHERE id = p_visit_id
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Visit not found');
    END IF;

    IF v_visit.user_id IS DISTINCT FROM v_actor_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;

    IF COALESCE(v_visit.tip_amount, 0) > 0 OR v_visit.tip_payment_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Tip already processed for this visit');
    END IF;

    IF COALESCE(v_visit.status, '') <> 'completed' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Visit must be completed before tipping');
    END IF;

    IF v_visit.request_id IS NOT NULL THEN
        SELECT hospital_id
        INTO v_request_hospital_id
        FROM public.emergency_requests
        WHERE id = v_visit.request_id
        LIMIT 1;
    END IF;

    SELECT organization_id
    INTO v_org_id
    FROM public.hospitals
    WHERE id = COALESCE(v_visit.hospital_id, v_request_hospital_id)
    LIMIT 1;

    IF v_org_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unable to resolve destination organization');
    END IF;

    SELECT id, balance
    INTO v_patient_wallet_id, v_patient_balance
    FROM public.patient_wallets
    WHERE user_id = v_actor_id
    LIMIT 1
    FOR UPDATE;

    IF v_patient_wallet_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Patient wallet not found');
    END IF;

    IF COALESCE(v_patient_balance, 0) < v_tip_amount THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Insufficient wallet balance for tip',
            'required', v_tip_amount,
            'available', COALESCE(v_patient_balance, 0)
        );
    END IF;

    INSERT INTO public.payments (
        user_id,
        emergency_request_id,
        organization_id,
        amount,
        currency,
        payment_method,
        status,
        ivisit_fee_amount,
        metadata,
        processed_at,
        created_at,
        updated_at
    )
    VALUES (
        v_actor_id,
        v_visit.request_id,
        v_org_id,
        v_tip_amount,
        v_currency,
        'wallet',
        'completed',
        0,
        jsonb_build_object(
            'payment_kind', 'tip',
            'tip_method', 'wallet',
            'visit_id', p_visit_id,
            'fee_amount', 0,
            'fee', 0,
            'source', 'process_visit_tip'
        ),
        NOW(),
        NOW(),
        NOW()
    )
    RETURNING id INTO v_payment_id;

    UPDATE public.patient_wallets
    SET balance = COALESCE(balance, 0) - v_tip_amount,
        updated_at = NOW()
    WHERE id = v_patient_wallet_id
    RETURNING balance INTO v_patient_balance_after;

    INSERT INTO public.wallet_ledger (
        wallet_id,
        amount,
        transaction_type,
        description,
        reference_id,
        metadata,
        created_at
    )
    VALUES (
        v_patient_wallet_id,
        -v_tip_amount,
        'debit',
        'Patient Tip',
        v_payment_id,
        jsonb_build_object(
            'payment_kind', 'tip',
            'tip_method', 'wallet',
            'visit_id', p_visit_id,
            'source', 'process_visit_tip'
        ),
        NOW()
    );

    UPDATE public.visits
    SET tip_amount = v_tip_amount,
        tip_currency = v_currency,
        tipped_at = NOW(),
        tip_payment_id = v_payment_id,
        updated_at = NOW()
    WHERE id = p_visit_id;

    RETURN jsonb_build_object(
        'success', true,
        'visit_id', p_visit_id,
        'payment_id', v_payment_id,
        'tip_amount', v_tip_amount,
        'currency', v_currency,
        'new_wallet_balance', COALESCE(v_patient_balance_after, 0)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.record_visit_cash_tip(
    p_visit_id UUID,
    p_tip_amount NUMERIC,
    p_currency TEXT DEFAULT 'USD'
)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_visit RECORD;
    v_request_hospital_id UUID;
    v_org_id UUID;
    v_payment_id UUID;
    v_tip_amount NUMERIC := ROUND(COALESCE(p_tip_amount, 0)::NUMERIC, 2);
    v_currency TEXT := UPPER(COALESCE(NULLIF(TRIM(p_currency), ''), 'USD'));
BEGIN
    IF v_actor_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;

    IF p_visit_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Visit id is required');
    END IF;

    IF v_tip_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Tip amount must be greater than zero');
    END IF;

    SELECT *
    INTO v_visit
    FROM public.visits
    WHERE id = p_visit_id
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Visit not found');
    END IF;

    IF v_visit.user_id IS DISTINCT FROM v_actor_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;

    IF COALESCE(v_visit.tip_amount, 0) > 0 OR v_visit.tip_payment_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Tip already processed for this visit');
    END IF;

    IF COALESCE(v_visit.status, '') <> 'completed' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Visit must be completed before tipping');
    END IF;

    IF v_visit.request_id IS NOT NULL THEN
        SELECT hospital_id
        INTO v_request_hospital_id
        FROM public.emergency_requests
        WHERE id = v_visit.request_id
        LIMIT 1;
    END IF;

    SELECT organization_id
    INTO v_org_id
    FROM public.hospitals
    WHERE id = COALESCE(v_visit.hospital_id, v_request_hospital_id)
    LIMIT 1;

    IF v_org_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unable to resolve destination organization');
    END IF;

    INSERT INTO public.payments (
        user_id,
        emergency_request_id,
        organization_id,
        amount,
        currency,
        payment_method,
        status,
        ivisit_fee_amount,
        metadata,
        processed_at,
        created_at,
        updated_at
    )
    VALUES (
        v_actor_id,
        v_visit.request_id,
        v_org_id,
        v_tip_amount,
        v_currency,
        'cash',
        'completed',
        0,
        jsonb_build_object(
            'payment_kind', 'tip',
            'tip_method', 'cash',
            'visit_id', p_visit_id,
            'fee_amount', 0,
            'fee', 0,
            'source', 'record_visit_cash_tip'
        ),
        NOW(),
        NOW(),
        NOW()
    )
    RETURNING id INTO v_payment_id;

    UPDATE public.visits
    SET tip_amount = v_tip_amount,
        tip_currency = v_currency,
        tipped_at = NOW(),
        tip_payment_id = v_payment_id,
        updated_at = NOW()
    WHERE id = p_visit_id;

    RETURN jsonb_build_object(
        'success', true,
        'visit_id', p_visit_id,
        'payment_id', v_payment_id,
        'tip_amount', v_tip_amount,
        'currency', v_currency,
        'tip_method', 'cash'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.process_visit_tip(UUID, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_visit_tip(UUID, NUMERIC, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_visit_cash_tip(UUID, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_visit_cash_tip(UUID, NUMERIC, TEXT) TO service_role;

CREATE TRIGGER on_payment_completed
AFTER UPDATE ON public.payments
FOR EACH ROW EXECUTE PROCEDURE public.process_payment_distribution();

CREATE TRIGGER stamp_pay_display_id BEFORE INSERT ON public.payments FOR EACH ROW EXECUTE PROCEDURE public.stamp_entity_display_id();
CREATE TRIGGER stamp_pat_wallet_display_id BEFORE INSERT ON public.patient_wallets FOR EACH ROW EXECUTE PROCEDURE public.stamp_entity_display_id();
CREATE TRIGGER stamp_org_wallet_display_id BEFORE INSERT ON public.organization_wallets FOR EACH ROW EXECUTE PROCEDURE public.stamp_entity_display_id();

-- 💳 Payment Validation RPC Functions
-- Part of Master System Improvement Plan - Phase 1 Critical Emergency Flow Fixes

-- 1. Validate Payment Method
CREATE OR REPLACE FUNCTION public.validate_payment_method(
    p_user_id UUID,
    p_payment_method_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_method_exists BOOLEAN;
    v_is_active BOOLEAN;
    v_result JSONB;
BEGIN
    -- Check if payment method exists and belongs to user
    SELECT EXISTS(
        SELECT 1 FROM public.payment_methods 
        WHERE id = p_payment_method_id 
        AND user_id = p_user_id
    ) INTO v_method_exists;
    
    IF NOT v_method_exists THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Payment method not found');
    END IF;
    
    -- Check if payment method is active
    SELECT is_active INTO v_is_active
    FROM public.payment_methods 
    WHERE id = p_payment_method_id 
    AND user_id = p_user_id;
    
    IF NOT v_is_active THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Payment method is inactive');
    END IF;
    
    RETURN jsonb_build_object('valid', true, 'payment_method_id', p_payment_method_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Get Fallback Payment Options
CREATE OR REPLACE FUNCTION public.get_fallback_payment_options(
    p_user_id UUID,
    p_amount NUMERIC
)
RETURNS JSONB AS $$
DECLARE
    v_wallet_balance NUMERIC;
    v_active_methods JSONB;
    v_result JSONB;
BEGIN
    -- Check wallet balance
    SELECT balance INTO v_wallet_balance
    FROM public.patient_wallets 
    WHERE user_id = p_user_id;
    
    -- Get active payment methods
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', id,
            'type', type,
            'provider', provider,
            'last4', last4,
            'is_default', is_default
        )
    ) INTO v_active_methods
    FROM public.payment_methods 
    WHERE user_id = p_user_id 
    AND is_active = true;
    
    v_result := jsonb_build_object(
        'wallet_available', v_wallet_balance >= p_amount,
        'wallet_balance', v_wallet_balance,
        'active_payment_methods', v_active_methods,
        'fallback_options', CASE 
            WHEN v_wallet_balance >= p_amount THEN 'wallet'
            WHEN v_active_methods IS NOT NULL THEN 'payment_methods'
            ELSE 'cash_only'
        END
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Retry Payment with Different Method
CREATE OR REPLACE FUNCTION public.retry_payment_with_different_method(
    p_emergency_request_id UUID,
    p_new_payment_method_id UUID,
    p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_payment_amount NUMERIC;
    v_organization_id UUID;
    v_currency TEXT := 'USD';
    v_payment_id UUID;
    v_validation_result JSONB;
BEGIN
    IF p_emergency_request_id IS NULL OR p_new_payment_method_id IS NULL OR p_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Missing required retry payment arguments');
    END IF;

    -- Resolve amount/organization from canonical emergency + hospital contract.
    SELECT
        er.total_cost,
        COALESCE(h.organization_id, p.organization_id),
        COALESCE(p.currency, 'USD')
    INTO v_payment_amount, v_organization_id, v_currency
    FROM public.emergency_requests er
    LEFT JOIN public.hospitals h ON h.id = er.hospital_id
    LEFT JOIN LATERAL (
        SELECT organization_id, currency
        FROM public.payments
        WHERE emergency_request_id = er.id
        ORDER BY created_at DESC
        LIMIT 1
    ) p ON TRUE
    WHERE er.id = p_emergency_request_id
      AND er.user_id = p_user_id;

    IF v_payment_amount IS NULL OR v_payment_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Emergency request has no payable total_cost');
    END IF;

    -- Validate the selected replacement payment method.
    v_validation_result := public.validate_payment_method(p_user_id, p_new_payment_method_id);

    IF NOT (v_validation_result->>'valid')::BOOLEAN THEN
        RETURN jsonb_build_object('success', false, 'error', COALESCE(v_validation_result->>'error', 'Invalid payment method'));
    END IF;

    -- Create canonical pending card payment and preserve method-id context in metadata.
    INSERT INTO public.payments (
        user_id, emergency_request_id, organization_id, amount, currency, payment_method, status, metadata
    ) VALUES (
        p_user_id,
        p_emergency_request_id,
        v_organization_id,
        v_payment_amount,
        v_currency,
        'card',
        'pending',
        jsonb_build_object(
            'payment_method_id', p_new_payment_method_id,
            'source', 'retry_payment_with_different_method'
        )
    ) RETURNING id INTO v_payment_id;

    RETURN jsonb_build_object('success', true, 'payment_id', v_payment_id, 'retry_successful', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Convert Currency for Payment
CREATE OR REPLACE FUNCTION public.convert_currency_for_payment(
    p_amount NUMERIC,
    p_from_currency TEXT DEFAULT 'USD',
    p_to_currency TEXT DEFAULT 'USD'
)
RETURNS JSONB AS $$
DECLARE
    v_conversion_rate NUMERIC := 1.0;
    v_converted_amount NUMERIC;
    v_result JSONB;
BEGIN
    -- Simple currency conversion (in production, use real exchange rates)
    IF p_from_currency = p_to_currency THEN
        v_conversion_rate := 1.0;
    ELSIF p_from_currency = 'USD' AND p_to_currency = 'EUR' THEN
        v_conversion_rate := 0.85;
    ELSIF p_from_currency = 'USD' AND p_to_currency = 'GBP' THEN
        v_conversion_rate := 0.73;
    ELSIF p_from_currency = 'EUR' AND p_to_currency = 'USD' THEN
        v_conversion_rate := 1.18;
    ELSIF p_from_currency = 'GBP' AND p_to_currency = 'USD' THEN
        v_conversion_rate := 1.37;
    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'Unsupported currency conversion');
    END IF;
    
    v_converted_amount := p_amount * v_conversion_rate;
    
    v_result := jsonb_build_object(
        'success', true,
        'original_amount', p_amount,
        'converted_amount', v_converted_amount,
        'from_currency', p_from_currency,
        'to_currency', p_to_currency,
        'conversion_rate', v_conversion_rate
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
-- Standard Updates
CREATE TRIGGER handle_payment_method_updated_at BEFORE UPDATE ON public.payment_methods FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_org_wallet_updated_at BEFORE UPDATE ON public.organization_wallets FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_patient_wallet_updated_at BEFORE UPDATE ON public.patient_wallets FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_insurance_updated_at BEFORE UPDATE ON public.insurance_policies FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_insurance_billing_updated_at BEFORE UPDATE ON public.insurance_billing FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_methods_active ON public.payment_methods(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_payment_methods_default ON public.payment_methods(user_id, is_default);
CREATE INDEX IF NOT EXISTS idx_insurance_user_id ON public.insurance_policies(user_id);
CREATE INDEX IF NOT EXISTS idx_insurance_billing_request ON public.insurance_billing(emergency_request_id);
CREATE INDEX IF NOT EXISTS idx_insurance_billing_hospital ON public.insurance_billing(hospital_id);
CREATE INDEX IF NOT EXISTS idx_insurance_billing_user ON public.insurance_billing(user_id);
CREATE INDEX IF NOT EXISTS idx_insurance_billing_status ON public.insurance_billing(status);
