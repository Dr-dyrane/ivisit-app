-- Migration: Force Reload Schema Cache
-- Author: Emergency Fix Implementation  
-- Date: 2026-02-17
-- Description: Forces PostgREST to reload schema cache to recognize new functions

-- Force schema reload
NOTIFY pgrst, 'reload schema';

-- Add a small delay to ensure reload completes
DO $$
BEGIN
    PERFORM pg_sleep(1);
END $$;

-- Notify again for good measure
NOTIFY pgrst, 'reload schema';
