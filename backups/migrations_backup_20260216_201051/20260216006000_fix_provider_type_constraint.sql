-- ============================================================
-- Migration: FIX PROVIDER TYPE CONSTRAINT
-- ============================================================
-- Description: Updates the profiles table to allow additional 
-- provider_type values that are being sent by the UI.
-- ============================================================

BEGIN;

-- 1. Drop existing constraint
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_provider_type_check;

-- 2. Re-create constraint with expanded list
-- Original: CHECK (provider_type IN ('hospital', 'ambulance_service', 'doctor', 'driver', 'paramedic'))
-- Added: 'ambulance', 'pharmacy', 'clinic'
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_provider_type_check
CHECK (provider_type IN (
  'hospital', 
  'ambulance_service', 
  'ambulance', 
  'doctor', 
  'driver', 
  'paramedic', 
  'pharmacy', 
  'clinic'
));

NOTIFY pgrst, 'reload schema';

COMMIT;
