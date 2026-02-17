-- ============================================================
-- Migration: DISABLE AUTO-INSURANCE ENROLLMENT
-- ============================================================
-- Description: Removes the trigger that automatically gives every 
-- new user an insurance policy. Users must now choose to enroll.
-- ============================================================

BEGIN;

-- 1. Drop the auto-enrollment trigger
-- We keep the functions (enroll_basic_insurance, etc.) so they can 
-- be called manually from the app, but they will no longer fire automatically.
DROP TRIGGER IF EXISTS on_profile_created_enroll_insurance ON public.profiles;

-- 2. Optional: If you want to delete the cleanup function as well, 
-- but it's safer to keep it for manual use.

NOTIFY pgrst, 'reload schema';

COMMIT;
