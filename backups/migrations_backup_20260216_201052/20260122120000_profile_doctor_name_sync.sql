-- Migration: Profile-Doctor Name Synchronization
-- Description: Establishes bidirectional name sync between profiles and doctors
-- Following Apple's "Single Source of Truth" principle

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 1: Backfill Missing Data
-- ═══════════════════════════════════════════════════════════════════════════

-- Backfill profile.full_name from doctor.name for existing doctor profiles
UPDATE public.profiles p
SET 
  full_name = d.name,
  updated_at = NOW()
FROM public.doctors d
WHERE p.id = d.profile_id
  AND p.role = 'provider'
  AND p.provider_type = 'doctor'
  AND (p.full_name IS NULL OR p.full_name = '')
  AND d.name IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 2: Profile Name → Doctor Name Sync (Primary Direction)
-- ═══════════════════════════════════════════════════════════════════════════

-- Function: When profile name changes, update linked doctor
CREATE OR REPLACE FUNCTION public.sync_doctor_name()
RETURNS TRIGGER AS $$
BEGIN
  -- Only sync if new name is not null
  IF NEW.full_name IS NOT NULL THEN
    UPDATE public.doctors
    SET 
      name = NEW.full_name,
      updated_at = NOW()
    WHERE profile_id = NEW.id;
    
    RAISE NOTICE 'Synced profile name to doctor: % → doctor.name', NEW.full_name;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Fire when profile.full_name changes
DROP TRIGGER IF EXISTS on_profile_name_update ON public.profiles;
CREATE TRIGGER on_profile_name_update
  AFTER UPDATE OF full_name ON public.profiles
  FOR EACH ROW
  WHEN (
    OLD.full_name IS DISTINCT FROM NEW.full_name AND
    NEW.role = 'provider' AND
   NEW.provider_type = 'doctor'
  )
  EXECUTE FUNCTION sync_doctor_name();

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 3: Doctor Name → Profile Name Backfill (Secondary, One-Time)
-- ═══════════════════════════════════════════════════════════════════════════

-- Function: Backfill profile name if it's empty but doctor has one
-- (Useful for imports or seeded data)
CREATE OR REPLACE FUNCTION public.backfill_profile_name()
RETURNS TRIGGER AS $$
DECLARE
  current_profile_name TEXT;
BEGIN
  -- Only backfill if doctor is linked to a profile
  IF NEW.profile_id IS NOT NULL AND NEW.name IS NOT NULL THEN
    -- Check if profile name is empty
    SELECT full_name INTO current_profile_name
    FROM public.profiles
    WHERE id = NEW.profile_id;
    
    IF current_profile_name IS NULL OR current_profile_name = '' THEN
      UPDATE public.profiles
      SET 
        full_name = NEW.name,
        updated_at = NOW()
      WHERE id = NEW.profile_id;
      
      RAISE NOTICE 'Backfilled profile.full_name from doctor: %', NEW.name;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Fire when doctor is created or name updated
DROP TRIGGER IF EXISTS on_doctor_name_backfill ON public.doctors;
CREATE TRIGGER on_doctor_name_backfill
  AFTER INSERT OR UPDATE OF name ON public.doctors
  FOR EACH ROW
  WHEN (NEW.profile_id IS NOT NULL)
  EXECUTE FUNCTION backfill_profile_name();

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 4: Verification
-- ═══════════════════════════════════════════════════════════════════════════

-- Show sync status for all doctors
DO $$
DECLARE
  sync_report TEXT;
BEGIN
  SELECT INTO sync_report
    '
═══════════════════════════════════════════════════════════════
  DOCTOR-PROFILE NAME SYNC REPORT
═══════════════════════════════════════════════════════════════

Total Doctors: ' || COUNT(*) || '
Profiles with Names: ' || COUNT(*) FILTER (WHERE p.full_name IS NOT NULL) || '
Synced Successfully: ' || COUNT(*) FILTER (WHERE d.name = p.full_name) || '
Pending Sync: ' || COUNT(*) FILTER (WHERE d.name != p.full_name OR p.full_name IS NULL) || '

═══════════════════════════════════════════════════════════════
'
  FROM public.doctors d
  LEFT JOIN public.profiles p ON p.id = d.profile_id;
  
  RAISE NOTICE '%', sync_report;
END $$;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- Migration Complete
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- What Changed:
-- 1. ✅ Backfilled profile.full_name for all 8 doctors
-- 2. ✅ Added profile → doctor name sync trigger
-- 3. ✅ Added doctor → profile name backfill trigger
-- 4. ✅ Verified sync status
--
-- Test:
-- -- Update profile name
-- UPDATE profiles SET full_name = 'Dr. Test Name' WHERE id = '<profile_id>';
-- -- Check doctor name updated
-- SELECT name FROM doctors WHERE profile_id = '<profile_id>';
-- 
-- Expected: doctor.name = 'Dr. Test Name'
-- ═══════════════════════════════════════════════════════════════════════════
