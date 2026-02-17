-- Migration: Add stripe_customer_id to profiles for patient payment management
-- Description: Enables secure card collection and management for patients.

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON public.profiles(stripe_customer_id);

-- Update RLS policies for payment_methods to include patient access if not already handled
-- (Actually payment_methods already has user_id, so existing RLS should be fine)
-- But we'll ensure patients can only see their own methods.

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'payment_methods' AND policyname = 'Patients can manage their own payment methods'
    ) THEN
        CREATE POLICY "Patients can manage their own payment methods"
        ON public.payment_methods
        FOR ALL
        TO authenticated
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;
