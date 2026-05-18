-- PULLBACK NOTE: AUDIT-DUPLICATE-LOCATIONS — Diagnostic query to check for duplicate hospital locations
-- This script analyzes the current state of duplicate locations before applying fixes
-- Uses PostGIS spatial distance to find duplicates within tolerance (100 meters)
-- Run each section separately in the SQL Editor

-- ============================================
-- STEP 1: Count hospitals with duplicate locations (within 100 meters)
-- ============================================
WITH duplicate_pairs AS (
  SELECT 
    h1.id as id1,
    h2.id as id2
  FROM public.hospitals h1
  JOIN public.hospitals h2 ON h1.id < h2.id
    AND h1.coordinates IS NOT NULL
    AND h2.coordinates IS NOT NULL
    AND ST_DWithin(h1.coordinates, h2.coordinates, 100)  -- 100 meters
),
duplicate_groups AS (
  SELECT 
    LEAST(id1, id2) as group_id,
    COUNT(*) as duplicate_count
  FROM duplicate_pairs
  GROUP BY LEAST(id1, id2)
)
SELECT 
  COUNT(*) as total_duplicate_groups,
  SUM(duplicate_count) as total_duplicate_hospitals
FROM duplicate_groups;

-- ============================================
-- STEP 2: Show sample duplicate locations (within 100 meters, limit 10)
-- ============================================
WITH duplicate_pairs AS (
  SELECT 
    h1.id as id1,
    h2.id as id2
  FROM public.hospitals h1
  JOIN public.hospitals h2 ON h1.id < h2.id
    AND h1.coordinates IS NOT NULL
    AND h2.coordinates IS NOT NULL
    AND ST_DWithin(h1.coordinates, h2.coordinates, 100)
)
SELECT 
  h1.address,
  h1.latitude,
  h1.longitude,
  COUNT(*) as duplicate_count,
  ARRAY_AGG(h1.name ORDER BY 
    CASE 
      WHEN h1.verified = true THEN 1
      WHEN h1.verification_status IN ('verified', 'partner') THEN 2
      WHEN h1.place_id LIKE 'demo:%' THEN 3
      ELSE 4
    END,
    h1.created_at ASC
  ) as hospital_names,
  ARRAY_AGG(h1.place_id ORDER BY 
    CASE 
      WHEN h1.verified = true THEN 1
      WHEN h1.verification_status IN ('verified', 'partner') THEN 2
      WHEN h1.place_id LIKE 'demo:%' THEN 3
      ELSE 4
    END,
    h1.created_at ASC
  ) as place_ids
FROM duplicate_pairs dp
JOIN public.hospitals h1 ON dp.id1 = h1.id
GROUP BY h1.address, h1.latitude, h1.longitude
ORDER BY COUNT(*) DESC
LIMIT 10;

-- ============================================
-- STEP 3: Check provider records for duplicate hospitals (within 100 meters)
-- ============================================
WITH duplicate_pairs AS (
  SELECT 
    h1.id as id1,
    h2.id as id2
  FROM public.hospitals h1
  JOIN public.hospitals h2 ON h1.id < h2.id
    AND h1.coordinates IS NOT NULL
    AND h2.coordinates IS NOT NULL
    AND ST_DWithin(h1.coordinates, h2.coordinates, 100)
),
duplicate_hospital_ids AS (
  SELECT DISTINCT id1 FROM duplicate_pairs
  UNION SELECT DISTINCT id2 FROM duplicate_pairs
)
SELECT 
  h.address,
  h.latitude,
  h.longitude,
  COUNT(DISTINCT p.id) as total_provider_records,
  COUNT(DISTINCT p.provider_type) as unique_provider_types,
  ARRAY_AGG(DISTINCT p.provider_type) as provider_types_list
FROM duplicate_hospital_ids dhid
JOIN public.hospitals h ON dhid.id1 = h.id
LEFT JOIN public.providers p ON p.hospital_id = h.id
GROUP BY h.address, h.latitude, h.longitude
ORDER BY total_provider_records DESC
LIMIT 10;

-- ============================================
-- STEP 4: Check for provider_type conflicts within duplicate groups (within 100 meters)
-- ============================================
WITH duplicate_pairs AS (
  SELECT 
    h1.id as id1,
    h2.id as id2
  FROM public.hospitals h1
  JOIN public.hospitals h2 ON h1.id < h2.id
    AND h1.coordinates IS NOT NULL
    AND h2.coordinates IS NOT NULL
    AND ST_DWithin(h1.coordinates, h2.coordinates, 100)
)
SELECT 
  h1.address,
  h1.latitude,
  h1.longitude,
  p.provider_type,
  COUNT(DISTINCT p.hospital_id) as hospitals_with_this_provider
FROM duplicate_pairs dp
JOIN public.hospitals h1 ON dp.id1 = h1.id
JOIN public.providers p ON p.hospital_id = h1.id
GROUP BY h1.address, h1.latitude, h1.longitude, p.provider_type
HAVING COUNT(DISTINCT p.hospital_id) > 1
ORDER BY hospitals_with_this_provider DESC
LIMIT 10;
