-- Migration: Migrate Ambulance Hospital Text to Hospital ID FK
-- Description: Updates hospital_id by matching hospital text field to hospitals table
-- Run this in Supabase SQL Editor

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 1: Migrate Data
-- ═══════════════════════════════════════════════════════════════════════════

-- Update hospital_id by matching hospital text to hospitals.name
UPDATE public.ambulances a
SET 
  hospital_id = (
    SELECT h.id 
    FROM public.hospitals h
    WHERE LOWER(h.name) = LOWER(a.hospital)
    LIMIT 1
  ),
  updated_at = NOW()
WHERE a.hospital_id IS NULL
  AND a.hospital IS NOT NULL
  AND a.hospital != '';

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 2: Report Results
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  total_ambulances INTEGER;
  with_hospital_id INTEGER;
  with_hospital_text INTEGER;
  unmatched INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_ambulances FROM public.ambulances;
  SELECT COUNT(*) INTO with_hospital_id FROM public.ambulances WHERE hospital_id IS NOT NULL;
  SELECT COUNT(*) INTO with_hospital_text FROM public.ambulances WHERE hospital IS NOT NULL AND hospital != '';
  SELECT COUNT(*) INTO unmatched FROM public.ambulances WHERE hospital_id IS NULL AND hospital IS NOT NULL AND hospital != '';
  
  RAISE NOTICE '
═══════════════════════════════════════════════════════════════
  AMBULANCE HOSPITAL MIGRATION REPORT
═══════════════════════════════════════════════════════════════

Total Ambulances:              %
With hospital_id (FK):         % (%.1f%%)
With hospital (TEXT):          %
Unmatched:                     %

Migration Success:             %s

═══════════════════════════════════════════════════════════════
  ',
    total_ambulances,
    with_hospital_id,
    (with_hospital_id::FLOAT / NULLIF(total_ambulances, 0) * 100),
    with_hospital_text,
    unmatched,
    CASE WHEN unmatched = 0 THEN '✅ ALL MATCHED' ELSE '⚠️  SOME UNMATCHED' END;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 3: Show Unmatched Hospitals (if any)
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  unmatched_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unmatched_count
  FROM public.ambulances
  WHERE hospital_id IS NULL AND hospital IS NOT NULL AND hospital != '';
  
  IF unmatched_count > 0 THEN
    RAISE NOTICE '
⚠️  UNMATCHED HOSPITALS:
-------------------------------------------------------------------
The following ambulances have hospital names that don''t match any hospital in the hospitals table:
';
    
    -- Show unmatched ambulances
    FOR rec IN (
      SELECT call_sign, hospital
      FROM public.ambulances
      WHERE hospital_id IS NULL AND hospital IS NOT NULL AND hospital != ''
      ORDER BY call_sign
    ) LOOP
      RAISE NOTICE '  - % : "%"', rec.call_sign, rec.hospital;
    END LOOP;
    
    RAISE NOTICE '
Action: Manually verify these hospital names or add them to hospitals table.
-------------------------------------------------------------------
';
  END IF;
END $$;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION QUERY (run after migration)
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
  a.call_sign,
  a.hospital as text_field,
  a.hospital_id as fk_field,
  h.name as resolved_hospital_name,
  CASE 
    WHEN a.hospital_id IS NOT NULL THEN '✅ Matched'
    WHEN a.hospital IS NULL THEN '- No hospital'
    ELSE '❌ No match'
  END as status
FROM public.ambulances a
LEFT JOIN public.hospitals h ON h.id = a.hospital_id
ORDER BY status DESC, a.call_sign;
