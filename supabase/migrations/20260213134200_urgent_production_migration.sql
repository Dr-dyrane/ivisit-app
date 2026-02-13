-- URGENT: Apply Column Rename Migration to Production
-- Run this in Supabase SQL Editor immediately
-- This fixes the "experience column not found" error

BEGIN;

-- 1. Fix roles for existing doctor profiles
UPDATE public.profiles
SET role = 'provider'
WHERE provider_type = 'doctor' AND role = 'patient';

-- 2. Rename 'years_experience' to 'experience' (CRITICAL FIX)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'doctors' AND column_name = 'years_experience') THEN
        ALTER TABLE public.doctors RENAME COLUMN years_experience TO experience;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'doctors' AND column_name = 'specialty') THEN
        ALTER TABLE public.doctors RENAME COLUMN specialty TO specialization;
    END IF;
END $$;

-- 3. Add 'status' column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'doctors' AND column_name = 'status') THEN
        ALTER TABLE public.doctors ADD COLUMN status text DEFAULT 'available';
    END IF;
END $$;

-- 4. Backfill 'status' based on 'is_available'
UPDATE public.doctors
SET status = CASE
    WHEN is_available IS TRUE THEN 'available'
    WHEN is_available IS FALSE THEN 'off_duty'
    ELSE 'available'
END
WHERE status IS NULL OR status = 'available'; 

-- 5. Add constraint to ensure valid status values
ALTER TABLE public.doctors DROP CONSTRAINT IF EXISTS doctors_status_check;
ALTER TABLE public.doctors ADD CONSTRAINT doctors_status_check CHECK (status IN ('available', 'busy', 'off_duty', 'on_call', 'invited'));

-- 6. Make 'is_available' nullable (soft deprecation)
ALTER TABLE public.doctors ALTER COLUMN is_available DROP NOT NULL;

COMMIT;

-- IMPORTANT: After running this, refresh the Supabase schema cache:
-- Go to Settings → Database → Connection Pooling → Click "Refresh schema cache"
-- OR just restart the connection pooler

SELECT 'Migration applied successfully! Column renamed: years_experience → experience' AS result;
