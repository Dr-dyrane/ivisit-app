-- Migration: Fix ON CONFLICT on doctors and ambulances tables
--
-- The sync_provider_records trigger uses ON CONFLICT (profile_id) on
-- both doctors and ambulances tables, but no unique constraint exists
-- on profile_id in either table. This causes error 42P10 when
-- updating a provider's profile (e.g. changing provider_type).
--
-- FIX: Add unique constraints on profile_id.

-- 1. Doctors: add unique constraint on profile_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'doctors_profile_id_key'
  ) THEN
    ALTER TABLE public.doctors ADD CONSTRAINT doctors_profile_id_key UNIQUE (profile_id);
  END IF;
END $$;

-- 2. Ambulances: add unique constraint on profile_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ambulances_profile_id_key'
  ) THEN
    ALTER TABLE public.ambulances ADD CONSTRAINT ambulances_profile_id_key UNIQUE (profile_id);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
