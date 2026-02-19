-- Fix: Add is_active column to payment_methods table
-- This resolves the "column payment_methods.is_active does not exist" error
-- Part of Master System Improvement Plan - Phase 1 Critical Emergency Flow Fixes

-- Add missing is_active column to existing table
ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update existing records to be active by default
UPDATE public.payment_methods SET is_active = true WHERE is_active IS NULL;

-- Add index for performance (already exists in migration but ensuring it's created)
CREATE INDEX IF NOT EXISTS idx_payment_methods_active ON public.payment_methods(user_id, is_active);

-- Add index for default payment method lookup
CREATE INDEX IF NOT EXISTS idx_payment_methods_default ON public.payment_methods(user_id, is_default);

-- Verify the fix
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE 
    table_name = 'payment_methods' 
    AND column_name = 'is_active';

-- Test query that was failing
SELECT COUNT(*) as active_payment_methods
FROM public.payment_methods 
WHERE is_active = true;
