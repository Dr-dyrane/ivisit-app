-- Migration: Sync Insurance Columns
-- Description: Adds missing columns to insurance_policies table.

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'insurance_policies' AND column_name = 'plan_type') THEN 
        ALTER TABLE public.insurance_policies ADD COLUMN plan_type text DEFAULT 'basic';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'insurance_policies' AND column_name = 'is_default') THEN 
        ALTER TABLE public.insurance_policies ADD COLUMN is_default boolean DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'insurance_policies' AND column_name = 'coverage_details') THEN 
        ALTER TABLE public.insurance_policies ADD COLUMN coverage_details jsonb DEFAULT '{}'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'insurance_policies' AND column_name = 'starts_at') THEN 
        ALTER TABLE public.insurance_policies ADD COLUMN starts_at timestamptz DEFAULT now();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'insurance_policies' AND column_name = 'expires_at') THEN 
        ALTER TABLE public.insurance_policies ADD COLUMN expires_at timestamptz;
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
