-- Migration: Cleanup Service Pricing (Remove Bed/Room entries)
-- Description: Enforce separation of concerns. Beds belong in 'room_pricing', not 'service_pricing'.

BEGIN;

-- 1. Remove any 'bed' or 'bed_booking' entries from service_pricing
DELETE FROM public.service_pricing 
WHERE service_type IN ('bed', 'bed_booking');

-- 2. Ensure we have basic defaults in room_pricing if empty (Safety Net)
INSERT INTO public.room_pricing (room_type, room_name, price_per_night, is_active)
SELECT 'general', 'General Ward', 150.00, true
WHERE NOT EXISTS (SELECT 1 FROM public.room_pricing WHERE room_type = 'general');

INSERT INTO public.room_pricing (room_type, room_name, price_per_night, is_active)
SELECT 'private', 'Private Room', 350.00, true
WHERE NOT EXISTS (SELECT 1 FROM public.room_pricing WHERE room_type = 'private');

COMMIT;

NOTIFY pgrst, 'reload schema';
