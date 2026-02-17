-- Migration: Align Service Pricing with Mobile App Types
-- Description: Adds "Critical Care" and renames "Premium ALS" to match mobile UI standards.

BEGIN;

-- 1. Rename 'Premium ALS Ambulance' to 'Advanced Life Support'
UPDATE public.service_pricing 
SET service_name = 'Advanced Life Support', 
    base_price = 250.00
WHERE service_name = 'Premium ALS Ambulance' AND service_type = 'ambulance';

-- 2. Rename 'Standard Ambulance' to 'Basic Life Support' (matches mobile default)
UPDATE public.service_pricing 
SET service_name = 'Basic Life Support', 
    base_price = 150.00
WHERE service_name = 'Standard Ambulance' AND service_type = 'ambulance';

-- 3. Insert 'Critical Care' if not exists
INSERT INTO public.service_pricing (service_type, service_name, base_price, is_active, hospital_id, organization_id)
SELECT 'ambulance', 'Critical Care', 400.00, true, NULL, NULL
WHERE NOT EXISTS (
    SELECT 1 FROM public.service_pricing 
    WHERE service_name = 'Critical Care' AND service_type = 'ambulance'
);

COMMIT;

NOTIFY pgrst, 'reload schema';
