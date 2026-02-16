-- Migration: Seed Extended Pricing Data
-- Description: Adds pricing for global defaults, Orgs, and Hospitals.

-- 1. Clear existing pricing data to ensure a clean seed for testing
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'service_pricing') THEN
        EXECUTE 'TRUNCATE TABLE public.service_pricing CASCADE';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'room_pricing') THEN
        EXECUTE 'TRUNCATE TABLE public.room_pricing CASCADE';
    END IF;
END $$;

-- 2. Global Admin Defaults
INSERT INTO public.service_pricing (service_type, service_name, base_price, is_active, hospital_id, organization_id)
VALUES 
    ('ambulance', 'Standard Ambulance', 150.00, true, NULL, NULL),
    ('ambulance', 'Premium ALS Ambulance', 250.00, true, NULL, NULL),
    ('consultation', 'Standard Consultation', 80.00, true, NULL, NULL),
    ('bed', 'Standard Ward Bed', 120.00, true, NULL, NULL)
ON CONFLICT DO NOTHING;

INSERT INTO public.room_pricing (room_type, room_name, price_per_night, is_active, hospital_id, organization_id)
VALUES 
    ('general', 'General Ward', 50.00, true, NULL, NULL),
    ('private', 'Private Suite', 350.00, true, NULL, NULL),
    ('icu', 'ICU Specialized', 800.00, true, NULL, NULL)
ON CONFLICT DO NOTHING;

-- 3. Organization Overrides
DO $$
DECLARE
    v_org_id UUID;
BEGIN
    SELECT id INTO v_org_id FROM public.organizations WHERE name = 'Hemet Health Network' LIMIT 1;
    
    IF v_org_id IS NOT NULL THEN
        INSERT INTO public.service_pricing (service_type, service_name, base_price, is_active, hospital_id, organization_id)
        VALUES 
            ('ambulance', 'Hemet Express EMS', 200.00, true, NULL, v_org_id),
            ('bed', 'Hemet Ward Reservation', 150.00, true, NULL, v_org_id);
            
        INSERT INTO public.room_pricing (room_type, room_name, price_per_night, is_active, hospital_id, organization_id)
        VALUES 
            ('general', 'Hemet Regular Ward', 65.00, true, NULL, v_org_id);
    END IF;
END $$;

-- 4. Hospital Overrides (Specific Facility Pricing)
DO $$
DECLARE
    v_hospital_id UUID;
    v_org_id UUID;
BEGIN
    -- Linking to the first hospital found in the system
    SELECT id, organization_id INTO v_hospital_id, v_org_id FROM public.hospitals LIMIT 1;
    
    IF v_hospital_id IS NOT NULL THEN
        INSERT INTO public.service_pricing (service_type, service_name, base_price, is_active, hospital_id, organization_id)
        VALUES 
            ('ambulance', 'Direct Facility Pickup', 100.00, true, v_hospital_id, v_org_id);
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
