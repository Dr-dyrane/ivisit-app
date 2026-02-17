-- Add profile_id to doctors table to link with auth.users/public.profiles
ALTER TABLE public.doctors 
ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_doctors_profile_id ON public.doctors(profile_id);

-- Add unique constraint to ensure one profile can't be multiple doctors (optional but good for strict 1:1)
-- ALTER TABLE public.doctors ADD CONSTRAINT unique_doctor_profile UNIQUE (profile_id);
