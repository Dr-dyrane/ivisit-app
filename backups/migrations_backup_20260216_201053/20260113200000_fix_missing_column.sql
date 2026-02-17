-- Migration: Manually Add Missing Coverage Details Column
-- Description: The column seems to be missing despite previous migrations. We are adding it explicitly.

DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'insurance_policies' 
        AND column_name = 'coverage_details'
    ) THEN 
        ALTER TABLE public.insurance_policies 
        ADD COLUMN coverage_details jsonb DEFAULT '{}'::jsonb;
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
