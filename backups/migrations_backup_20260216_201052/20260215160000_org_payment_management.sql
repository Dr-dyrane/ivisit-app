-- Migration: Organization Payment & Payout Management
-- Adds support for native Stripe card collection and payout destination management

-- 1. Extend Organizations for Stripe Customer and Payout tracking
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS payout_method_id TEXT, -- The default payout destination
ADD COLUMN IF NOT EXISTS payout_method_last4 TEXT,
ADD COLUMN IF NOT EXISTS payout_method_brand TEXT;

-- 2. Extend Payment Methods for Organizations
ALTER TABLE public.payment_methods
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 3. Update RLS for Payment Methods to allow Org Admins
DROP POLICY IF EXISTS "Users can manage their own payment methods" ON public.payment_methods;

CREATE POLICY "Users can manage their own payment methods" ON public.payment_methods
    FOR ALL USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.organization_id = payment_methods.organization_id
            AND (profiles.role = 'org_admin' OR profiles.role = 'admin')
        )
    );

-- 4. RPC to get organization stripe details safely
CREATE OR REPLACE FUNCTION public.get_org_stripe_status(p_org_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_details JSONB;
BEGIN
    SELECT jsonb_build_object(
        'stripe_account_id', stripe_account_id,
        'stripe_customer_id', stripe_customer_id,
        'payout_method_last4', payout_method_last4,
        'payout_method_brand', payout_method_brand,
        'is_active', is_active
    ) INTO v_details
    FROM public.organizations
    WHERE id = p_org_id;
    
    RETURN v_details;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_org_stripe_status(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
