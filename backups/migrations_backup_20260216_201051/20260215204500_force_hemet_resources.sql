
-- Force update resources for Hemet Test Hospital to ensure > 0
UPDATE public.hospitals 
SET 
    available_beds = 10,
    ambulances_count = 5,
    status = 'available',
    verified = true
WHERE name = 'Hemet Valley Medical Center';
