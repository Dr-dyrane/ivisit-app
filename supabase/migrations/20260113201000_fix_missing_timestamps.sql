-- Migration: Manually Add Missing Timestamp Columns
-- Description: Adding starts_at and expires_at if they are missing.

DO $$ 
BEGIN 
    -- Check and add expires_at
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'insurance_policies' 
        AND column_name = 'expires_at'
    ) THEN 
        ALTER TABLE public.insurance_policies 
        ADD COLUMN expires_at timestamptz;
    END IF;

    -- Check and add starts_at
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'insurance_policies' 
        AND column_name = 'starts_at'
    ) THEN 
        ALTER TABLE public.insurance_policies 
        ADD COLUMN starts_at timestamptz DEFAULT now();
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
