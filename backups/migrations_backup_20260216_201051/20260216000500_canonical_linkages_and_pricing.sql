-- 20260216000500_canonical_linkages_and_pricing.sql
-- Dyrane Canon: Unified technical architecture for pricing, wallets, and ledger.
-- Re-implemented to be strictly UUID-native.

BEGIN;

-- 1. FUNCTIONS: Financial Guardrails (Strict UUID)
CREATE OR REPLACE FUNCTION public.check_cash_eligibility(
    p_organization_id UUID,
    p_amount DECIMAL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_balance DECIMAL;
    v_fee_percentage DECIMAL;
    v_required_collateral DECIMAL;
BEGIN
    SELECT ivisit_fee_percentage INTO v_fee_percentage FROM public.organizations WHERE id = p_organization_id;
    v_fee_percentage := COALESCE(v_fee_percentage, 2.5);
    v_required_collateral := (p_amount * v_fee_percentage) / 100;

    SELECT balance INTO v_balance FROM public.organization_wallets WHERE organization_id = p_organization_id;

    RETURN COALESCE(v_balance, 0) >= v_required_collateral;
END;
$$;

-- 2. FUNCTIONS: Unified Payment Ledger Logic (Hyper-Safe Types)
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
    
    -- TRICK: Compare payment_method_id as text to safely identify 'cash'
    v_is_cash := (NEW.payment_method_id::text = 'cash');

    -- Auto-link organization if missing (from Emergency Requests)
    IF NEW.organization_id IS NULL AND NEW.emergency_request_id IS NOT NULL THEN
        SELECT h.organization_id INTO v_organization_id
        FROM public.emergency_requests er
        JOIN public.hospitals h ON er.hospital_id = h.id
        WHERE er.id = NEW.emergency_request_id;
        NEW.organization_id := v_organization_id;
    END IF;

    IF NEW.status = 'completed' AND COALESCE(v_already_credited, false) = false THEN
        NEW.metadata := jsonb_set(COALESCE(NEW.metadata, '{}'::jsonb), '{ledger_credited}', 'true');
        SELECT id INTO v_main_wallet_id FROM public.ivisit_main_wallet LIMIT 1;

        -- CASE: TOP-UP
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

        -- CASE: SERVICE PAYMENT
        ELSIF NEW.organization_id IS NOT NULL THEN
            SELECT ivisit_fee_percentage INTO v_fee_rate FROM public.organizations WHERE id = NEW.organization_id;
            v_fee_rate := COALESCE(v_fee_rate, 2.5);
            v_fee_amount := (NEW.amount * v_fee_rate) / 100;
            v_organization_amount := NEW.amount - v_fee_amount;

            NEW.organization_fee_rate := v_fee_rate;
            NEW.ivisit_deduction_amount := v_fee_amount;

            IF v_is_cash THEN
                -- CASH: Fee comes out of Org Balance
                UPDATE public.organization_wallets SET balance = balance - v_fee_amount WHERE organization_id = NEW.organization_id RETURNING id INTO v_org_wallet_id;
                INSERT INTO public.wallet_ledger (wallet_type, wallet_id, organization_id, amount, transaction_type, description, reference_id, reference_type)
                VALUES ('organization', v_org_wallet_id, NEW.organization_id, -v_fee_amount, 'debit', 'Cash fee for ' || NEW.id, NEW.id, 'payment');
            ELSE
                -- DIGITAL: Org gets the net amount
                INSERT INTO public.organization_wallets (organization_id, balance) VALUES (NEW.organization_id, v_organization_amount)
                ON CONFLICT (organization_id) DO UPDATE SET balance = organization_wallets.balance + v_organization_amount RETURNING id INTO v_org_wallet_id;
                INSERT INTO public.wallet_ledger (wallet_type, wallet_id, organization_id, amount, transaction_type, description, reference_id, reference_type)
                VALUES ('organization', v_org_wallet_id, NEW.organization_id, v_organization_amount, 'credit', 'Payment ' || NEW.id, NEW.id, 'payment');
            END IF;

            -- Main wallet always gets the fee
            UPDATE public.ivisit_main_wallet SET balance = balance + v_fee_amount WHERE id = v_main_wallet_id;
            INSERT INTO public.wallet_ledger (wallet_type, wallet_id, amount, transaction_type, description, reference_id, reference_type)
            VALUES ('main', v_main_wallet_id, v_fee_amount, 'credit', 'Fee from ' || NEW.id, NEW.id, 'payment');
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. FUNCTIONS: Auto Org-Admin Setup (Strict UUID)
CREATE OR REPLACE FUNCTION public.handle_org_admin_setup()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role = 'org_admin' THEN
        INSERT INTO public.organizations (id, name, contact_email)
        VALUES (NEW.id, COALESCE(NEW.full_name, 'New') || ' Organization', COALESCE(NEW.email, 'contact@ivisit.ai'))
        ON CONFLICT (id) DO NOTHING;
        
        NEW.organization_id := NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. APPLY TRIGGERS
DROP TRIGGER IF EXISTS process_payment_ledger_trigger ON public.payments;
CREATE TRIGGER process_payment_ledger_trigger
    BEFORE INSERT OR UPDATE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.process_payment_with_ledger();

DROP TRIGGER IF EXISTS on_org_admin_created ON public.profiles;
CREATE TRIGGER on_org_admin_created
    BEFORE INSERT OR UPDATE OF role ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_org_admin_setup();

COMMIT;
