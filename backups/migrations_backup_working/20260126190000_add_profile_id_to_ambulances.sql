-- Add profile_id to ambulances table for driver assignment
ALTER TABLE public.ambulances 
ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_ambulances_profile_id ON public.ambulances(profile_id);

-- Add comment
COMMENT ON COLUMN public.ambulances.profile_id IS 'Link to the provider (driver) profile assigned to this ambulance.';

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
