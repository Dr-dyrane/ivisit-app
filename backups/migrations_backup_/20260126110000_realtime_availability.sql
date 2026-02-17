-- Real-time Availability Tracking Migration
-- Adds real-time updates and last_updated timestamps for hospital availability

-- Add real-time availability fields
ALTER TABLE public.hospitals 
ADD COLUMN IF NOT EXISTS last_availability_update TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS bed_availability JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ambulance_availability JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS emergency_wait_time_minutes INTEGER,
ADD COLUMN IF NOT EXISTS real_time_sync BOOLEAN DEFAULT false;

-- Create indexes for real-time queries
CREATE INDEX IF NOT EXISTS idx_hospitals_status ON public.hospitals(status);
CREATE INDEX IF NOT EXISTS idx_hospitals_last_availability_update ON public.hospitals(last_availability_update);
CREATE INDEX IF NOT EXISTS idx_hospitals_import_status ON public.hospitals(import_status);

-- Create function to update availability with timestamp
CREATE OR REPLACE FUNCTION update_hospital_availability(
    hospital_id UUID,
    new_available_beds INTEGER DEFAULT NULL,
    new_ambulances_count INTEGER DEFAULT NULL,
    new_status TEXT DEFAULT NULL,
    new_wait_time INTEGER DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.hospitals 
    SET 
        available_beds = COALESCE(new_available_beds, available_beds),
        ambulances_count = COALESCE(new_ambulances_count, ambulances_count),
        status = COALESCE(new_status, status),
        emergency_wait_time_minutes = COALESCE(new_wait_time, emergency_wait_time_minutes),
        last_availability_update = now(),
        updated_at = now()
    WHERE id = hospital_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update last_availability_update
CREATE OR REPLACE FUNCTION update_availability_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_availability_update = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for availability updates
DROP TRIGGER IF EXISTS update_availability_trigger ON public.hospitals;
CREATE TRIGGER update_availability_trigger
    BEFORE UPDATE OF available_beds, ambulances_count, status
    ON public.hospitals
    FOR EACH ROW
    EXECUTE FUNCTION update_availability_timestamp();

-- Create view for real-time available hospitals
CREATE OR REPLACE VIEW public.available_hospitals AS
SELECT 
    id,
    name,
    status,
    available_beds,
    ambulances_count,
    emergency_wait_time_minutes,
    last_availability_update,
    imported_from_google,
    import_status,
    latitude,
    longitude
FROM public.hospitals 
WHERE status = 'available'
  AND (available_beds > 0 OR ambulances_count > 0)
ORDER BY last_availability_update DESC;

-- Grant access to the view
GRANT SELECT ON public.available_hospitals TO anon;
GRANT SELECT ON public.available_hospitals TO authenticated;

-- Add RLS policy for real-time updates
CREATE POLICY "Allow authenticated users to update availability"
ON public.hospitals
FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Comments for documentation
COMMENT ON COLUMN public.hospitals.last_availability_update IS 'Timestamp of last availability update';
COMMENT ON COLUMN public.hospitals.bed_availability IS 'Detailed bed availability by type (ICU, ER, etc.)';
COMMENT ON COLUMN public.hospitals.ambulance_availability IS 'Detailed ambulance availability by type';
COMMENT ON COLUMN public.hospitals.emergency_wait_time_minutes IS 'Current emergency wait time in minutes';
COMMENT ON COLUMN public.hospitals.real_time_sync IS 'Whether this hospital supports real-time sync';
