-- Migration: Patient Wallet System
-- Extends the ledger-based system to support patient balances

-- 1. Create Patient Wallets table
CREATE TABLE IF NOT EXISTS public.patient_wallets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    balance DECIMAL(12,2) DEFAULT 0.00,
    currency TEXT DEFAULT 'USD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add user_id to wallet_ledger to track patient transactions
ALTER TABLE public.wallet_ledger 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 3. Update wallet_ledger RLS to allow patients to see their own history
CREATE POLICY "Patients see their own ledger" ON public.wallet_ledger
    FOR SELECT USING (user_id = auth.uid());

-- 4. RLS for patient_wallets
ALTER TABLE public.patient_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own wallet" ON public.patient_wallets
    FOR SELECT USING (user_id = auth.uid());

-- 5. Auto-create wallet on profile creation or first use
CREATE OR REPLACE FUNCTION public.ensure_patient_wallet()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.patient_wallets (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger for wallet creation (linked to profiles table usually)
-- Note: We'll also handle manual fetching in the service just in case.
DROP TRIGGER IF EXISTS on_profile_created_create_wallet ON public.profiles;
CREATE TRIGGER on_profile_created_create_wallet
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.ensure_patient_wallet();

-- 7. Function to perform Top-Up (Secure)
-- This would be called after a successful Stripe payment for a top-up
DROP FUNCTION IF EXISTS public.top_up_patient_wallet(UUID, DECIMAL, UUID); -- Drop old signature if exists
DROP FUNCTION IF EXISTS public.top_up_patient_wallet(UUID, DECIMAL, TEXT); -- Drop current signature

/*
CREATE OR REPLACE FUNCTION public.top_up_patient_wallet(
    p_user_id UUID,
    p_amount DECIMAL,
    p_payment_method TEXT
)
RETURNS DECIMAL AS $$
DECLARE
    v_wallet_id UUID;
    v_new_balance DECIMAL;
BEGIN
    -- Get or create wallet
    INSERT INTO public.patient_wallets (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()
    RETURNING id INTO v_wallet_id;

    -- Update balance
    UPDATE public.patient_wallets 
    SET balance = balance + p_amount, updated_at = NOW()
    WHERE id = v_wallet_id
    RETURNING balance INTO v_new_balance;

    -- Log ledger
    INSERT INTO public.wallet_ledger (
        wallet_type, wallet_id, user_id, amount, 
        transaction_type, description, reference_id, reference_type
    ) VALUES (
        'patient', v_wallet_id, p_user_id, p_amount,
        'top-up', 'Wallet Top-up via ' || p_payment_method, NULL, 'external_payment'
    );

    RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
*/

-- Refresh schema
NOTIFY pgrst, 'reload schema';
