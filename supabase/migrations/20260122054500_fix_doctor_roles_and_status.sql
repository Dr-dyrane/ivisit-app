-- Migration: Fix Doctor Roles, Status, and Column Mismatches
-- Description: 
-- 1. Updates profile roles from 'patient' to 'provider' for doctors.
-- 2. Renames 'specialty' column to 'specialization' to match the UI.
-- 3. Adds 'status' column and backfills it from 'is_available'.

BEGIN;

-- 1. Fix roles for existing doctor profiles (migrated ones)
-- This fixes the issue where doctors appear as "patient" in the profiles table
UPDATE public.profiles
SET role = 'provider'
WHERE provider_type = 'doctor' AND role = 'patient';

-- 2. Rename 'specialty' to 'specialization' to match UI code
-- The UI expects 'specialization', but DB had 'specialty'
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'doctors' AND column_name = 'specialty') THEN
        ALTER TABLE public.doctors RENAME COLUMN specialty TO specialization;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'doctors' AND column_name = 'years_experience') THEN
        ALTER TABLE public.doctors RENAME COLUMN years_experience TO experience;
    END IF;
END $$;

-- 3. Add 'status' column to 'doctors' table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'doctors' AND column_name = 'status') THEN
        ALTER TABLE public.doctors ADD COLUMN status text DEFAULT 'available';
    END IF;
END $$;

-- 4. Backfill 'status' based on 'is_available'
-- If 'is_available' is TRUE, status = 'available'
-- If 'is_available' is FALSE, status = 'off_duty'
UPDATE public.doctors
SET status = CASE
    WHEN is_available IS TRUE THEN 'available'
    WHEN is_available IS FALSE THEN 'off_duty'
    ELSE 'available'
END
WHERE status IS NULL OR status = 'available'; 

-- 5. Add constraint to ensure valid status values
ALTER TABLE public.doctors DROP CONSTRAINT IF EXISTS doctors_status_check;
ALTER TABLE public.doctors ADD CONSTRAINT doctors_status_check CHECK (status IN ('available', 'busy', 'off_duty', 'on_call'));

-- 6. Make 'is_available' nullable (soft deprecation)
ALTER TABLE public.doctors ALTER COLUMN is_available DROP NOT NULL;

COMMIT;
