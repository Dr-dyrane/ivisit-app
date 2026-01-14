-- Migration: Fix Insurance Schema Mismatch
-- Description: Reconciles differences between 170000 and 182000 migrations to ensure all service columns exist.

DO $$ 
BEGIN 
    -- 1. Ensure 'plan_type' exists (Missing if table created by 170000)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'insurance_policies' AND column_name = 'plan_type'
    ) THEN 
        -- If coverage_type exists, we might want to migrate it or just add plan_type
        ALTER TABLE public.insurance_policies ADD COLUMN plan_type text DEFAULT 'basic';
    END IF;

    -- 2. Ensure 'group_number' exists (Missing if table created by 182000)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'insurance_policies' AND column_name = 'group_number'
    ) THEN 
        ALTER TABLE public.insurance_policies ADD COLUMN group_number text;
    END IF;

    -- 3. Ensure 'policy_holder_name' exists (Missing if table created by 182000)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'insurance_policies' AND column_name = 'policy_holder_name'
    ) THEN 
        ALTER TABLE public.insurance_policies ADD COLUMN policy_holder_name text;
    END IF;
    
    -- 4. Ensure 'policy_number' exists (Standard check)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'insurance_policies' AND column_name = 'policy_number'
    ) THEN 
        ALTER TABLE public.insurance_policies ADD COLUMN policy_number text;
    END IF;
    
    -- 5. Ensure 'status' exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'insurance_policies' AND column_name = 'status'
    ) THEN 
        ALTER TABLE public.insurance_policies ADD COLUMN status text DEFAULT 'active';
    END IF;

END $$;

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';
