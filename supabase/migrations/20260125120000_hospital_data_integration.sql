-- Hospital Data Integration Migration
-- Extends hospitals table for Google Places integration and admin assignment

-- Add Google Places data fields
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

-- Add hospital admin assignment
ALTER TABLE public.hospitals 
ADD COLUMN IF NOT EXISTS org_admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS imported_from_google BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS import_status TEXT DEFAULT 'pending' CHECK (import_status IN ('pending', 'verified', 'rejected'));

-- Add index for place_id lookup
CREATE INDEX IF NOT EXISTS idx_hospitals_place_id ON public.hospitals(place_id);

-- Add index for admin assignment
CREATE INDEX IF NOT EXISTS idx_hospitals_org_admin_id ON public.hospitals(org_admin_id);

-- Add index for import status
CREATE INDEX IF NOT EXISTS idx_hospitals_import_status ON public.hospitals(import_status);

-- Create hospital_import_logs table for tracking imports
CREATE TABLE IF NOT EXISTS public.hospital_import_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    import_type TEXT NOT NULL CHECK (import_type IN ('google_places', 'manual')),
    location_lat DECIMAL(10,8),
    location_lng DECIMAL(11,8),
    radius_km INTEGER DEFAULT 10,
    search_query TEXT,
    total_found INTEGER DEFAULT 0,
    imported_count INTEGER DEFAULT 0,
    skipped_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    errors JSONB DEFAULT '[]',
    status TEXT DEFAULT 'completed' CHECK (status IN ('running', 'completed', 'failed')),
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Add index for import logs
CREATE INDEX IF NOT EXISTS idx_hospital_import_logs_created_at ON public.hospital_import_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_hospital_import_logs_created_by ON public.hospital_import_logs(created_by);

-- RLS Policies for hospital_import_logs
ALTER TABLE public.hospital_import_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all import logs"
    ON public.hospital_import_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins can insert import logs"
    ON public.hospital_import_logs FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Update existing hospitals to have default import status
UPDATE public.hospitals 
SET import_status = 'verified', imported_from_google = false 
WHERE import_status IS NULL;

-- Add comment for documentation
COMMENT ON TABLE public.hospitals IS 'Hospital data with Google Places integration and admin assignment';
COMMENT ON TABLE public.hospital_import_logs IS 'Audit log for hospital import operations';
