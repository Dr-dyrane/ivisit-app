-- Migration: Sync Insurance Policies Schema
-- Description: Ensures insurance_policies table has all columns required by Console and Mobile App.

DO $$ 
BEGIN 
    -- 1. plan_type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'insurance_policies' AND column_name = 'plan_type') THEN 
        ALTER TABLE public.insurance_policies ADD COLUMN plan_type text DEFAULT 'basic';
    END IF;

    -- 2. is_default
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'insurance_policies' AND column_name = 'is_default') THEN 
        ALTER TABLE public.insurance_policies ADD COLUMN is_default boolean DEFAULT false;
    END IF;

    -- 3. coverage_details
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'insurance_policies' AND column_name = 'coverage_details') THEN 
        ALTER TABLE public.insurance_policies ADD COLUMN coverage_details jsonb DEFAULT '{}'::jsonb;
    END IF;

    -- 4. starts_at (Sync with start_date if missing)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'insurance_policies' AND column_name = 'starts_at') THEN 
        ALTER TABLE public.insurance_policies ADD COLUMN starts_at timestamptz DEFAULT now();
    END IF;

    -- 5. expires_at (Sync with end_date if missing)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'insurance_policies' AND column_name = 'expires_at') THEN 
        ALTER TABLE public.insurance_policies ADD COLUMN expires_at timestamptz;
    END IF;

END $$;

-- Backfill data from old columns if they exist
UPDATE public.insurance_policies 
SET starts_at = COALESCE(starts_at, start_date::timestamptz),
    expires_at = COALESCE(expires_at, end_date::timestamptz)
WHERE start_date IS NOT NULL OR end_date IS NOT NULL;

NOTIFY pgrst, 'reload schema';
