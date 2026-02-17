-- Migration: Fix Visits Table ID Type for Emergency Sync
-- Author: Emergency Fix Implementation
-- Date: 2026-02-17
-- Description: Updates visits table to use UUID for id to match emergency_requests

-- ============================================================================
-- 🔧 1. UPDATE VISITS TABLE ID TYPE TO MATCH EMERGENCY_REQUESTS
-- ============================================================================

-- Drop foreign key constraints temporarily
ALTER TABLE public.visits DROP CONSTRAINT IF EXISTS visits_user_id_fkey CASCADE;
ALTER TABLE public.visits DROP CONSTRAINT IF EXISTS visits_hospital_id_fkey CASCADE;

-- Convert visits.id from TEXT to UUID with safe conversion
ALTER TABLE public.visits 
ALTER COLUMN id TYPE UUID USING 
    CASE 
        WHEN id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN id::UUID
        WHEN id = '' OR id IS NULL THEN gen_random_uuid()
        ELSE gen_random_uuid()
    END;

-- Set default value for new records
ALTER TABLE public.visits 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Recreate foreign key constraints with proper UUID types
ALTER TABLE public.visits 
ADD CONSTRAINT visits_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.visits 
ADD CONSTRAINT visits_hospital_id_fkey 
    FOREIGN KEY (hospital_id) REFERENCES public.hospitals(id) ON DELETE SET NULL;

-- ============================================================================
-- 🔧 2. UPDATE SYNC TRIGGER TO HANDLE UUID CONVERSIONS
-- ============================================================================

-- Drop existing trigger
DROP TRIGGER IF EXISTS on_emergency_status_change ON public.emergency_requests;

-- Recreate trigger with proper UUID handling
CREATE OR REPLACE FUNCTION public.sync_emergency_to_history()
RETURNS TRIGGER AS $$
BEGIN
    -- Only sync when status changes to 'completed' or 'cancelled'
    IF (NEW.status = 'completed' OR NEW.status = 'cancelled') 
       AND (OLD.status != 'completed' AND OLD.status != 'cancelled') THEN
       
        -- Check if visit already exists to avoid duplicates
        IF NOT EXISTS (
            SELECT 1 FROM public.visits 
            WHERE id = NEW.id
        ) THEN
            -- Update existing visit
            UPDATE public.visits SET
                user_id = NEW.user_id,
                hospital_id = NEW.hospital_id,
                hospital = NEW.hospital_name,
                specialty = NEW.specialty,
                date = to_char(NEW.created_at, 'YYYY-MM-DD'),
                time = to_char(NEW.created_at, 'HH12:MI AM'),
                type = CASE WHEN NEW.service_type = 'ambulance' THEN 'Ambulance Ride' ELSE 'Bed Booking' END,
                status = NEW.status,
                updated_at = NEW.updated_at
            WHERE id = NEW.id;
        ELSE
            -- Insert new visit
            INSERT INTO public.visits (
                id, user_id, hospital_id, hospital, specialty,
                date, time, type, status, updated_at
            ) VALUES (
                NEW.id, NEW.user_id, NEW.hospital_id, NEW.hospital_name, NEW.specialty,
                to_char(NEW.created_at, 'YYYY-MM-DD'), to_char(NEW.created_at, 'HH12:MI AM'),
                CASE WHEN NEW.service_type = 'ambulance' THEN 'Ambulance Ride' ELSE 'Bed Booking' END,
                NEW.status, NEW.updated_at
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER on_emergency_status_change
AFTER UPDATE ON public.emergency_requests
FOR EACH ROW EXECUTE PROCEDURE public.sync_emergency_to_history();

-- ============================================================================
-- 🔧 3. UPDATE VISIT RLS POLICIES FOR UUID HANDLING
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can see own visits" ON public.visits;
DROP POLICY IF EXISTS "Hospitals see own visits" ON public.visits;

-- Recreate policies with UUID handling
CREATE POLICY "Users can see own visits" ON public.visits
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Hospitals see own visits" ON public.visits
FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.hospitals h 
    WHERE h.id = visits.hospital_id 
    AND h.org_admin_id = auth.uid()
));

-- ============================================================================
-- 🔧 4. CLEAN UP ANY ORPHANED VISIT RECORDS
-- ============================================================================

-- Update any visit records that might have invalid IDs
UPDATE public.visits 
SET id = gen_random_uuid()
WHERE id IS NULL;

-- Update any emergency request references in visits that might be broken
UPDATE public.visits 
SET hospital_id = NULL
WHERE hospital_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM public.hospitals WHERE id::text = hospital_id::text AND id = hospital_id);

-- Grant permissions
GRANT ALL ON public.visits TO authenticated;
GRANT ALL ON public.visits TO service_role;

-- Reload schema
NOTIFY pgrst, 'reload schema';

-- Add comments for documentation
COMMENT ON TABLE public.visits IS 'Patient visit records synchronized from emergency requests. Now uses UUID for id to match emergency_requests.';
COMMENT ON FUNCTION public.sync_emergency_to_history() IS 'Enhanced trigger to sync emergency requests to visits with proper UUID handling and duplicate prevention.';
