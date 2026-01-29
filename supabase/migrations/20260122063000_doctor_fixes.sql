-- Migration: Doctor Image Sync & Schema Fixes
-- Description:
-- 1. Adds a trigger to sync profile image updates to the linked doctor record.
-- 2. Ensures column renames (years_experience -> experience) are applied if not already.

BEGIN;

-- 1. Image Sync Trigger
-- Function to sync image
CREATE OR REPLACE FUNCTION public.sync_doctor_image()
RETURNS TRIGGER AS $$
BEGIN
  -- If profile's image_uri or avatar_url changes, update linked doctor's image
  -- We prefer image_uri but support avatar_url fallback if your system uses that
  UPDATE public.doctors
  SET image = COALESCE(NEW.image_uri, NEW.avatar_url)
  WHERE profile_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger definition
DROP TRIGGER IF EXISTS on_profile_image_update ON public.profiles;
CREATE TRIGGER on_profile_image_update
  AFTER UPDATE OF image_uri, avatar_url ON public.profiles
  FOR EACH ROW
  WHEN (OLD.image_uri IS DISTINCT FROM NEW.image_uri OR OLD.avatar_url IS DISTINCT FROM NEW.avatar_url)
  EXECUTE FUNCTION public.sync_doctor_image();

-- 2. Ensure Schema Consistency (Idempotent Renames)
DO $$
BEGIN
    -- Ensure years_experience -> experience
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'doctors' AND column_name = 'years_experience') THEN
        ALTER TABLE public.doctors RENAME COLUMN years_experience TO experience;
    END IF;

    -- Ensure specialty -> specialization
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'doctors' AND column_name = 'specialty') THEN
        ALTER TABLE public.doctors RENAME COLUMN specialty TO specialization;
    END IF;
END $$;

COMMIT;
