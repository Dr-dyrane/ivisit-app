-- Clean up excess hospitals - keep only 10 nearby hospitals within 15 minutes EMS time
-- Remove all existing hospitals first
DELETE FROM hospitals;

-- Update the nearby_hospitals RPC to limit to 10 hospitals within 15km (approx 15 minutes EMS time)
CREATE OR REPLACE FUNCTION nearby_hospitals(user_lat float, user_lng float, radius_km float DEFAULT 15)
RETURNS TABLE (
  id uuid,
  name text,
  address text,
  phone text,
  website text,
  rating float,
  google_photos jsonb,
  is_verified boolean,
  is_google_import boolean,
  distance_km float,
  place_id text,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.id,
    h.name,
    h.address,
    h.phone,
    h.website,
    h.rating,
    h.google_photos,
    h.is_verified,
    h.is_google_import,
    ROUND(
      ST_Distance(
        ST_Point(h.longitude, h.latitude)::geography,
        ST_Point(user_lng, user_lat)::geography
      ) / 1000.0, 2
    ) as distance_km,
    h.place_id,
    h.created_at,
    h.updated_at
  FROM hospitals h
  WHERE ST_DWithin(
    ST_Point(h.longitude, h.latitude)::geography,
    ST_Point(user_lng, user_lat)::geography,
    radius_km * 1000.0
  )
  ORDER BY distance_km ASC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment explaining the 15-minute EMS time constraint
COMMENT ON FUNCTION nearby_hospitals IS 'Returns up to 10 hospitals within 15km (approximately 15 minutes EMS response time) to reduce patient confusion and ensure rapid care access';
