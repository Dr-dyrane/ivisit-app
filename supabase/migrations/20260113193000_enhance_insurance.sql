-- Migration: Enhance Insurance Policies
-- Description: Add default status and linked payment method support

ALTER TABLE public.insurance_policies 
ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS linked_payment_method jsonb DEFAULT NULL; 
-- linked_payment_method structure: { type: 'card', last4: '4242', brand: 'Visa', expiry: '12/28' }

-- Ensure only one default per user (partial index)
CREATE UNIQUE INDEX IF NOT EXISTS idx_insurance_policies_one_default 
ON public.insurance_policies (user_id) 
WHERE (is_default = true);
