-- Migration: Ledger-based Wallet System (Optimized & Non-Breaking)
-- This version respects the existing 'org_id = hospital_id' pattern in the UI.

-- 1. Create Wallet Transactions (Ledger) table
CREATE TABLE IF NOT EXISTS public.wallet_ledger (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_type TEXT NOT NULL, -- 'main' or 'organization'
    wallet_id UUID NOT NULL, -- ivisit_main_wallet.id or organization_wallets.id
    organization_id UUID REFERENCES public.organizations(id), -- NULL for main wallet
    amount DECIMAL(12,2) NOT NULL,
    transaction_type TEXT NOT NULL, -- 'credit', 'debit', 'payout', 'refund'
    description TEXT,
    reference_id UUID, -- Link to payment_id, refund_id, etc.
    reference_type TEXT, -- 'payment', 'payout', 'adjustment'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Index for performance
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_wallet ON public.wallet_ledger(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_org ON public.wallet_ledger(organization_id);

-- 3. Data Integrity: Ensure Hospitals are linked to an Organization anchor for the Wallet
-- This ensures the billing lookup always works.
INSERT INTO public.organizations (name, is_active)
SELECT DISTINCT name, true 
FROM public.hospitals 
WHERE organization_id IS NULL
AND name NOT IN (SELECT name FROM public.organizations)
ON CONFLICT DO NOTHING;

UPDATE public.hospitals h
SET organization_id = o.id
FROM public.organizations o
WHERE h.name = o.name AND h.organization_id IS NULL;

-- 5. Apply Trigger (Refined for Status Lifecycle)
CREATE OR REPLACE FUNCTION process_payment_with_ledger()
RETURNS TRIGGER AS $$
DECLARE
    v_organization_id UUID;
    v_fee_amount DECIMAL;
    v_organization_amount DECIMAL;
    v_fee_rate DECIMAL;
    v_main_wallet_id UUID;
    v_org_wallet_id UUID;
    v_already_credited BOOLEAN;
BEGIN
    -- 1. Identify the Parent Organization for the payment
    IF NEW.organization_id IS NULL THEN
        -- Link from Emergency Request -> Hospital -> Organization
        IF NEW.emergency_request_id IS NOT NULL THEN
            SELECT h.organization_id INTO v_organization_id
            FROM public.emergency_requests er
            JOIN public.hospitals h ON er.hospital_id = h.id::text
            WHERE er.id = NEW.emergency_request_id;
        END IF;
        
        NEW.organization_id := v_organization_id;
    END IF;

    -- 2. ONLY proceed with financial ledgering if status is 'completed'
    -- And ensure we haven't already credited this payment (checked via metadata flag)
    v_already_credited := (NEW.metadata->>'ledger_credited')::boolean;
    
    IF NEW.status = 'completed' AND COALESCE(v_already_credited, false) = false AND NEW.organization_id IS NOT NULL THEN
        -- Calculate Fees
        SELECT ivisit_fee_percentage INTO v_fee_rate FROM public.organizations WHERE id = NEW.organization_id;
        v_fee_rate := COALESCE(v_fee_rate, 2.5);
        v_fee_amount := (NEW.amount * v_fee_rate) / 100;
        v_organization_amount := NEW.amount - v_fee_amount;
        
        NEW.organization_fee_rate := v_fee_rate;
        NEW.ivisit_deduction_amount := v_fee_amount;
        
        -- Mark as credited in metadata TO PREVENT DOUBLE CREDITING
        NEW.metadata := jsonb_set(COALESCE(NEW.metadata, '{}'::jsonb), '{ledger_credited}', 'true');
        
        -- 3. Credit Organization Wallet & Log Ledger
        INSERT INTO public.organization_wallets (organization_id, balance)
        VALUES (NEW.organization_id, v_organization_amount)
        ON CONFLICT (organization_id) 
        DO UPDATE SET balance = organization_wallets.balance + v_organization_amount, updated_at = NOW()
        RETURNING id INTO v_org_wallet_id;
        
        INSERT INTO public.wallet_ledger (
            wallet_type, wallet_id, organization_id, amount, 
            transaction_type, description, reference_id, reference_type
        ) VALUES (
            'organization', v_org_wallet_id, NEW.organization_id, v_organization_amount,
            'credit', 'Payment ' || NEW.id, NEW.id, 'payment'
        );
        
        -- 4. Credit Platform Wallet & Log Ledger
        SELECT id INTO v_main_wallet_id FROM public.ivisit_main_wallet LIMIT 1;
        UPDATE public.ivisit_main_wallet SET balance = balance + v_fee_amount, last_updated = NOW() WHERE id = v_main_wallet_id;
        
        INSERT INTO public.wallet_ledger (
            wallet_type, wallet_id, organization_id, amount, 
            transaction_type, description, reference_id, reference_type
        ) VALUES (
            'main', v_main_wallet_id, NULL, v_fee_amount,
            'credit', 'Fee from Org ' || NEW.organization_id, NEW.id, 'payment'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS process_payment_fees_trigger ON public.payments;
CREATE TRIGGER process_payment_fees_trigger
    BEFORE INSERT OR UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION process_payment_with_ledger();

-- 6. RLS for Ledger
ALTER TABLE public.wallet_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins see all ledger entries" ON public.wallet_ledger
    FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Org admins see ledger for their hospital's organization
CREATE POLICY "Org admins see their ledger" ON public.wallet_ledger
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.hospitals h ON p.organization_id = h.id -- profiles.org_id is Hospital ID
            WHERE p.id = auth.uid() 
            AND h.organization_id = wallet_ledger.organization_id
        )
    );

NOTIFY pgrst, 'reload schema';
