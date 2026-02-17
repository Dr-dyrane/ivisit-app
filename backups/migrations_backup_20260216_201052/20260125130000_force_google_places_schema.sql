-- Force Apply Google Places Schema - Direct SQL Execution
-- This migration will be applied directly to fix missing columns

-- Add Google Places data fields (IF NOT EXISTS should prevent errors)
ALTER TABLE public.hospitals 
ADD COLUMN IF NOT EXISTS place_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS google_rating DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS google_photos TEXT[],
ADD COLUMN IF NOT EXISTS google_opening_hours JSONB,
ADD COLUMN IF NOT EXISTS google_types TEXT[],
ADD COLUMN IF NOT EXISTS google_address TEXT,
ADD COLUMN IF NOT EXISTS google_phone TEXT,
ADD COLUMN IF NOT EXISTS google_website TEXT,
ADD COLUMN IF NOT EXISTS last_google_sync TIMESTAMP WITH TIME ZONE;

-- Add hospital admin assignment fields
ALTER TABLE public.hospitals 
ADD COLUMN IF NOT EXISTS org_admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS imported_from_google BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS import_status TEXT DEFAULT 'pending' CHECK (import_status IN ('pending', 'verified', 'rejected'));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_hospitals_place_id ON public.hospitals(place_id);
CREATE INDEX IF NOT EXISTS idx_hospitals_org_admin_id ON public.hospitals(org_admin_id);
CREATE INDEX IF NOT EXISTS idx_hospitals_import_status ON public.hospitals(import_status);

-- Grant permissions for new columns
GRANT ALL ON public.hospitals TO authenticated;
GRANT ALL ON public.hospitals TO service_role;

-- Update existing hospitals to have default values
UPDATE public.hospitals 
SET 
    import_status = 'verified',
    imported_from_google = false,
    verified = true
WHERE import_status IS NULL;

-- Log the schema update
DO $$
BEGIN
    RAISE NOTICE 'Google Places schema migration completed at %', NOW();
END $$;
