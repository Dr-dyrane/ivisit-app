-- Migration to unify the payment system according to payment.md
-- This migration creates the organizations table and sets up the 2.5% fee logic

-- 1. Create Organizations table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    stripe_account_id TEXT UNIQUE, -- For Stripe Connect Express/Custom
    ivisit_fee_percentage DECIMAL(5,2) DEFAULT 2.5,
    fee_tier TEXT DEFAULT 'standard', -- standard, premium, enterprise, non-profit
    custom_fee_enabled BOOLEAN DEFAULT FALSE,
    contact_email TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Link Hospitals to Organizations
-- Adding organization_id to hospitals table
ALTER TABLE public.hospitals 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- 3. Create Payments table if it doesn't exist, then update with fee tracking
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'pending',
    payment_method_id TEXT,
    stripe_payment_intent_id TEXT UNIQUE,
    emergency_request_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id),
ADD COLUMN IF NOT EXISTS organization_fee_rate DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS ivisit_deduction_amount DECIMAL(10,2) DEFAULT 0.00;

-- 4. Create iVisit Main Wallet (Platform Wallet)
CREATE TABLE IF NOT EXISTS public.ivisit_main_wallet (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    balance DECIMAL(12,2) DEFAULT 0.00,
    currency TEXT DEFAULT 'USD',
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create Organization Wallets (Provider Earnings)
CREATE TABLE IF NOT EXISTS public.organization_wallets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    balance DECIMAL(12,2) DEFAULT 0.00,
    currency TEXT DEFAULT 'USD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id)
);

-- 6. Function to calculate organization-specific iVisit fee
CREATE OR REPLACE FUNCTION calculate_organization_ivisit_fee(
    p_organization_id UUID,
    p_amount DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
    v_fee_percentage DECIMAL;
    v_fee_amount DECIMAL;
BEGIN
    -- Get organization's specific fee rate
    SELECT ivisit_fee_percentage INTO v_fee_percentage
    FROM public.organizations
    WHERE id = p_organization_id;
    
    -- Default to 2.5% if organization not found or fee not set
    IF v_fee_percentage IS NULL THEN
        v_fee_percentage := 2.5;
    END IF;
    
    -- Calculate fee amount
    v_fee_amount := (p_amount * v_fee_percentage) / 100;
    
    RETURN ROUND(v_fee_amount, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 7. Trigger function for automatic payment processing and fee distribution
CREATE OR REPLACE FUNCTION process_payment_with_fees()
RETURNS TRIGGER AS $$
DECLARE
    v_organization_id UUID;
    v_fee_amount DECIMAL;
    v_organization_amount DECIMAL;
    v_fee_rate DECIMAL;
BEGIN
    -- If organization_id is not provided, try to get it from the hospital linked to the emergency request
    IF NEW.organization_id IS NULL AND NEW.emergency_request_id IS NOT NULL THEN
        SELECT h.organization_id INTO v_organization_id
        FROM public.emergency_requests er
        JOIN public.hospitals h ON er.hospital_id = h.id::text
        WHERE er.id = NEW.emergency_request_id;
        
        NEW.organization_id := v_organization_id;
    END IF;

    -- If we still don't have an organization_id, we can't distribute fees automatically
    IF NEW.organization_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Get the organization's current fee rate
    SELECT ivisit_fee_percentage INTO v_fee_rate
    FROM public.organizations
    WHERE id = NEW.organization_id;
    
    v_fee_rate := COALESCE(v_fee_rate, 2.5);
    
    -- Calculate iVisit fee
    v_fee_amount := (NEW.amount * v_fee_rate) / 100;
    v_organization_amount := NEW.amount - v_fee_amount;
    
    -- Update payment record with fee details
    NEW.organization_fee_rate := v_fee_rate;
    NEW.ivisit_deduction_amount := v_fee_amount;
    
    -- Credit organization wallet
    INSERT INTO public.organization_wallets (organization_id, balance)
    VALUES (NEW.organization_id, v_organization_amount)
    ON CONFLICT (organization_id) 
    DO UPDATE SET 
        balance = organization_wallets.balance + v_organization_amount,
        updated_at = NOW();
    
    -- Credit iVisit main wallet
    -- We assume there's only one row in ivisit_main_wallet for now
    UPDATE public.ivisit_main_wallet 
    SET balance = balance + v_fee_amount,
        last_updated = NOW();
    
    -- If no row was updated, initialize it
    IF NOT FOUND THEN
        INSERT INTO public.ivisit_main_wallet (balance) VALUES (v_fee_amount);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create trigger for automatic payment processing
DROP TRIGGER IF EXISTS process_payment_fees_trigger ON public.payments;
CREATE TRIGGER process_payment_fees_trigger
    BEFORE INSERT ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION process_payment_with_fees();

-- 9. Trigger function for handling refunds
CREATE OR REPLACE FUNCTION process_refund_with_fees()
RETURNS TRIGGER AS $$
DECLARE
    v_fee_amount DECIMAL;
    v_organization_id UUID;
BEGIN
    -- Only process refunds for completed payments being moved to 'refunded' status
    IF NEW.status = 'refunded' AND OLD.status = 'completed' THEN
        v_fee_amount := OLD.ivisit_deduction_amount;
        v_organization_id := OLD.organization_id;
        
        IF v_organization_id IS NOT NULL THEN
            -- Deduct from organization wallet
            UPDATE public.organization_wallets 
            SET balance = balance - (OLD.amount - v_fee_amount),
                updated_at = NOW()
            WHERE organization_id = v_organization_id;
            
            -- Deduct from iVisit main wallet
            UPDATE public.ivisit_main_wallet 
            SET balance = balance - v_fee_amount,
                last_updated = NOW();
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create trigger for refund processing
DROP TRIGGER IF EXISTS process_refund_fees_trigger ON public.payments;
CREATE TRIGGER process_refund_fees_trigger
    AFTER UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION process_refund_with_fees();

-- 11. Row Level Security
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ivisit_main_wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_wallets ENABLE ROW LEVEL SECURITY;

-- Policies for Organizations
CREATE POLICY "Public read for active organizations" ON public.organizations
    FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Admins manage all organizations" ON public.organizations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Policies for Wallets (Admin only for now)
CREATE POLICY "Admins manage main wallet" ON public.ivisit_main_wallet
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Org admins view their own wallet" ON public.organization_wallets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND (profiles.role = 'admin' OR profiles.organization_id = organization_wallets.organization_id)
        )
    );

-- 12. Initialize main wallet if empty
INSERT INTO public.ivisit_main_wallet (balance, currency)
SELECT 0.00, 'USD'
WHERE NOT EXISTS (SELECT 1 FROM public.ivisit_main_wallet);

-- 13. Create indexes
CREATE INDEX IF NOT EXISTS idx_hospitals_organization_id ON public.hospitals(organization_id);
CREATE INDEX IF NOT EXISTS idx_payments_organization_id ON public.payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_wallets_org_id ON public.organization_wallets(organization_id);

-- 14. Refresh schema cache
NOTIFY pgrst, 'reload schema';
