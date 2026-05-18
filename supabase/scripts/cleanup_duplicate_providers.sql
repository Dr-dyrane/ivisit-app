-- PULLBACK NOTE: CLEANUP-DUPLICATE-PROVIDERS — Remove duplicate pharmacies/providers by coordinate
-- This script identifies and removes duplicate providers based on spatial proximity (100 meters)
-- Keeps the highest-priority row (verified > partner > demo > unverified)

-- ============================================
-- STEP 1: Identify duplicate groups (within 100 meters)
-- ============================================
WITH duplicate_pairs AS (
  SELECT 
    h1.id as id1,
    h2.id as id2,
    h1.name as name1,
    h2.name as name2,
    h1.address as address1,
    h2.address as address2,
    h1.latitude as lat1,
    h1.longitude as lng1,
    h2.latitude as lat2,
    h2.longitude as lng2,
    h1.provider_type,
    h1.verified as verified1,
    h1.verification_status as status1,
    h2.verified as verified2,
    h2.verification_status as status2,
    h1.place_id as place_id1,
    h2.place_id as place_id2,
    h1.created_at as created1,
    h2.created_at as created2,
    -- Priority score for selection
    CASE 
      WHEN h1.verified = true THEN 4
      WHEN h1.verification_status IN ('verified', 'partner') THEN 3
      WHEN h1.place_id LIKE 'demo:%' THEN 2
      ELSE 1
    END as priority1,
    CASE 
      WHEN h2.verified = true THEN 4
      WHEN h2.verification_status IN ('verified', 'partner') THEN 3
      WHEN h2.place_id LIKE 'demo:%' THEN 2
      ELSE 1
    END as priority2
  FROM public.hospitals h1
  JOIN public.hospitals h2 ON h1.id < h2.id
    AND h1.provider_type = h2.provider_type
    AND h1.provider_type IN ('pharmacy', 'lab', 'radiology', 'urgent_care', 'clinic', 'mental_health', 'womens_care', 'pediatrics')
    AND h1.coordinates IS NOT NULL
    AND h2.coordinates IS NOT NULL
    AND ST_DWithin(h1.coordinates, h2.coordinates, 100)  -- 100 meters
),
-- Determine which row to keep (higher priority wins, older created_at wins on tie)
keep_decision AS (
  SELECT 
    id1, id2, name1, name2, address1, address2,
    provider_type, lat1, lng1,
    CASE 
      WHEN priority1 > priority2 THEN id1
      WHEN priority2 > priority1 THEN id2
      WHEN created1 < created2 THEN id1  -- Older wins on tie
      ELSE id2
    END as keep_id,
    CASE 
      WHEN priority1 > priority2 THEN id2
      WHEN priority2 > priority1 THEN id1
      WHEN created1 < created2 THEN id2
      ELSE id1
    END as remove_id
  FROM duplicate_pairs
)
SELECT 
  provider_type,
  COUNT(*) as duplicate_pairs,
  COUNT(DISTINCT keep_id) as unique_locations_to_keep,
  COUNT(DISTINCT remove_id) as duplicates_to_remove
FROM keep_decision
GROUP BY provider_type
ORDER BY duplicate_pairs DESC;

-- ============================================
-- STEP 2: Show sample duplicates for review
-- ============================================
WITH duplicate_pairs AS (
  SELECT 
    h1.id as id1,
    h2.id as id2,
    h1.name as name1,
    h2.name as name2,
    h1.address as address1,
    h2.address as address2,
    h1.latitude as lat1,
    h1.longitude as lng1,
    h2.latitude as lat2,
    h2.longitude as lng2,
    h1.provider_type,
    h1.verified as verified1,
    h1.verification_status as status1,
    h2.verified as verified2,
    h2.verification_status as status2,
    h1.place_id as place_id1,
    h2.place_id as place_id2,
    h1.created_at as created1,
    h2.created_at as created2,
    CASE 
      WHEN h1.verified = true THEN 4
      WHEN h1.verification_status IN ('verified', 'partner') THEN 3
      WHEN h1.place_id LIKE 'demo:%' THEN 2
      ELSE 1
    END as priority1,
    CASE 
      WHEN h2.verified = true THEN 4
      WHEN h2.verification_status IN ('verified', 'partner') THEN 3
      WHEN h2.place_id LIKE 'demo:%' THEN 2
      ELSE 1
    END as priority2
  FROM public.hospitals h1
  JOIN public.hospitals h2 ON h1.id < h2.id
    AND h1.provider_type = h2.provider_type
    AND h1.provider_type IN ('pharmacy', 'lab', 'radiology', 'urgent_care', 'clinic', 'mental_health', 'womens_care', 'pediatrics')
    AND h1.coordinates IS NOT NULL
    AND h2.coordinates IS NOT NULL
    AND ST_DWithin(h1.coordinates, h2.coordinates, 100)
),
keep_decision AS (
  SELECT 
    id1, id2, name1, name2, address1, address2,
    provider_type, lat1, lng1,
    CASE 
      WHEN priority1 > priority2 THEN id1
      WHEN priority2 > priority1 THEN id2
      WHEN created1 < created2 THEN id1
      ELSE id2
    END as keep_id,
    CASE 
      WHEN priority1 > priority2 THEN id2
      WHEN priority2 > priority1 THEN id1
      WHEN created1 < created2 THEN id2
      ELSE id1
    END as remove_id,
    priority1, priority2, created1, created2
  FROM duplicate_pairs
)
SELECT 
  provider_type,
  name1 as keep_name,
  address1 as keep_address,
  name2 as remove_name,
  address2 as remove_address,
  priority1 as keep_priority,
  priority2 as remove_priority,
  remove_id
FROM keep_decision
ORDER BY provider_type, remove_priority DESC, keep_priority DESC
LIMIT 20;

-- ============================================
-- STEP 3: DELETE duplicates (RUN THIS ONLY AFTER REVIEWING STEP 2)
-- ============================================
-- WITH duplicate_pairs AS (
--   SELECT 
--     h1.id as id1,
--     h2.id as id2,
--     h1.provider_type,
--     h1.verified as verified1,
--     h1.verification_status as status1,
--     h2.verified as verified2,
--     h2.verification_status as status2,
--     h1.place_id as place_id1,
--     h2.place_id as place_id2,
--     h1.created_at as created1,
--     h2.created_at as created2,
--     CASE 
--       WHEN h1.verified = true THEN 4
--       WHEN h1.verification_status IN ('verified', 'partner') THEN 3
--       WHEN h1.place_id LIKE 'demo:%' THEN 2
--       ELSE 1
--     END as priority1,
--     CASE 
--       WHEN h2.verified = true THEN 4
--       WHEN h2.verification_status IN ('verified', 'partner') THEN 3
--       WHEN h2.place_id LIKE 'demo:%' THEN 2
--       ELSE 1
--     END as priority2
--   FROM public.hospitals h1
--   JOIN public.hospitals h2 ON h1.id < h2.id
--     AND h1.provider_type = h2.provider_type
--     AND h1.provider_type IN ('pharmacy', 'lab', 'radiology', 'urgent_care', 'clinic', 'mental_health', 'womens_care', 'pediatrics')
--     AND h1.coordinates IS NOT NULL
--     AND h2.coordinates IS NOT NULL
--     AND ST_DWithin(h1.coordinates, h2.coordinates, 100)
-- ),
-- keep_decision AS (
--   SELECT 
--     id1, id2,
--     CASE 
--       WHEN priority1 > priority2 THEN id1
--       WHEN priority2 > priority1 THEN id2
--       WHEN created1 < created2 THEN id1
--       ELSE id2
--     END as keep_id,
--     CASE 
--       WHEN priority1 > priority2 THEN id2
--       WHEN priority2 > priority1 THEN id1
--       WHEN created1 < created2 THEN id2
--       ELSE id1
--     END as remove_id
--   FROM duplicate_pairs
-- )
-- DELETE FROM public.hospitals
-- WHERE id IN (SELECT remove_id FROM keep_decision);
