-- PULLBACK NOTE: FIX-DUPLICATE-LOCATIONS — Location-based unique constraint
-- Prevents duplicate hospitals at the same physical location (exact coordinates)
-- This fixes the issue where Google Places returns multiple entries for the same location
-- with different place_ids (e.g., "Christina Wargin" and "Walgreens" at same address)
-- GPS precision is sufficient for this dataset - exact coordinates = same physical location

ALTER TABLE public.hospitals
ADD CONSTRAINT location_unique UNIQUE (latitude, longitude);
