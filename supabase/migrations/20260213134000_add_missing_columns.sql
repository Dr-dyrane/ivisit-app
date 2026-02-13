-- Add missing columns to doctors table
-- Run this in Supabase SQL Editor NOW

BEGIN;

-- Check and add license_number column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'doctors' AND column_name = 'license_number') THEN
        ALTER TABLE public.doctors ADD COLUMN license_number TEXT;
        RAISE NOTICE 'Added license_number column';
    ELSE
        RAISE NOTICE 'license_number column already exists';
    END IF;
END $$;

-- Check and add phone column  
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'doctors' AND column_name = 'phone') THEN
        ALTER TABLE public.doctors ADD COLUMN phone TEXT;
        RAISE NOTICE 'Added phone column';
    ELSE
        RAISE NOTICE 'phone column already exists';
    END IF;
END $$;

COMMIT;

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'doctors' 
  AND column_name IN ('license_number', 'phone', 'email', 'experience', 'specialization', 'status')
ORDER BY column_name;
