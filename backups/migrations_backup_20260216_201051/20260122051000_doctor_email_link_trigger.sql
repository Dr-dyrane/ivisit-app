-- Add email column to doctors if it doesn't exist
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS email TEXT;
CREATE INDEX IF NOT EXISTS idx_doctors_email ON public.doctors(email);

-- Function to link doctor to profile when profile is created
CREATE OR REPLACE FUNCTION public.link_doctor_profile() 
RETURNS TRIGGER AS $$
BEGIN
  -- Update doctors table where email matches new user
  UPDATE public.doctors 
  SET profile_id = NEW.id 
  WHERE email = NEW.email 
  AND profile_id IS NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on public.profiles or auth.users?
-- Profiles is better because we need the profile to exist before we link foreign key?
-- Although doctors.profile_id references profiles.id, so profile MUST exist.
DROP TRIGGER IF EXISTS on_profile_created_link_doctor ON public.profiles;

CREATE TRIGGER on_profile_created_link_doctor
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.link_doctor_profile();

-- Backfill emails for doctors that are already linked (from the previous JS migration)
UPDATE public.doctors d
SET email = p.email
FROM public.profiles p
WHERE d.profile_id = p.id
AND d.email IS NULL;
