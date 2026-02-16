-- Migration: Infrastructure Pricing Seeder and RLS
-- Description: Seeds hospital_rooms and service_pricing, and adds RLS policies.

BEGIN;

-- 1. Ensure Organizations RLS and Seeder
INSERT INTO public.organizations (id, name, contact_email, is_active)
VALUES ('00000000-0000-0000-0000-000000000000', 'iVisit Network', 'admin@ivisit.com', true)
ON CONFLICT (id) DO NOTHING;

-- Link existing hospitals with no organization to the default one
UPDATE public.hospitals 
SET organization_id = '00000000-0000-0000-0000-000000000000'
WHERE organization_id IS NULL;

-- 2. Ensure schema support for organization overrides
-- Restore room_pricing if it was missing (console uses this)
CREATE TABLE IF NOT EXISTS public.room_pricing (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_type VARCHAR(50) NOT NULL,
  room_name VARCHAR(100) NOT NULL,
  price_per_night DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  hospital_id UUID REFERENCES public.hospitals(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.service_pricing ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.hospital_rooms ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.room_pricing ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- 2. Seeding Service Pricing
ALTER TABLE public.service_pricing DISABLE ROW LEVEL SECURITY;
INSERT INTO public.service_pricing (service_type, service_name, base_price, currency, description)
VALUES 
('ambulance', 'Basic Life Support (BLS)', 150.00, 'USD', 'Standard ambulance transportation with basic emergency care.'),
('ambulance', 'Advanced Life Support (ALS)', 250.00, 'USD', 'Specialized ambulance with advanced medical equipment and paramedics.'),
('consultation', 'General Practitioner', 80.00, 'USD', 'Standard medical consultation with a GP.'),
('consultation', 'Specialist Consultation', 150.00, 'USD', 'Consultation with a medical specialist.'),
('bed_booking', 'Standard Hospital Bed', 200.00, 'USD', 'Daily rate for a standard hospital bed.')
ON CONFLICT DO NOTHING;

-- 3. Seeding Hospital Rooms (Generic for known hospitals)
ALTER TABLE public.hospital_rooms DISABLE ROW LEVEL SECURITY;
INSERT INTO public.hospital_rooms (hospital_id, room_number, room_type, status, base_price, features)
SELECT 
  id as hospital_id,
  '101' as room_number,
  'standard_ward' as room_type,
  'available' as status,
  180.00 as base_price,
  ARRAY['AC', 'Shared Bathroom'] as features
FROM public.hospitals
ON CONFLICT DO NOTHING;

INSERT INTO public.hospital_rooms (hospital_id, room_number, room_type, status, base_price, features)
SELECT 
  id as hospital_id,
  'VIP-01' as room_number,
  'private_suite' as room_type,
  'available' as status,
  450.00 as base_price,
  ARRAY['AC', 'Private Kitchenette', 'TV', 'Extra Bed'] as features
FROM public.hospitals
ON CONFLICT DO NOTHING;

-- 4. Add RLS to hospital_rooms, service_pricing, and room_pricing
ALTER TABLE public.hospital_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_pricing ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
DROP POLICY IF EXISTS "Admins have full access to hospital_rooms" ON public.hospital_rooms;
CREATE POLICY "Admins have full access to hospital_rooms" ON public.hospital_rooms FOR ALL TO authenticated USING (public.get_current_user_role() = 'admin') WITH CHECK (public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Admins have full access to service_pricing" ON public.service_pricing;
CREATE POLICY "Admins have full access to service_pricing" ON public.service_pricing FOR ALL TO authenticated USING (public.get_current_user_role() = 'admin') WITH CHECK (public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Admins have full access to room_pricing" ON public.room_pricing;
CREATE POLICY "Admins have full access to room_pricing" ON public.room_pricing FOR ALL TO authenticated USING (public.get_current_user_role() = 'admin') WITH CHECK (public.get_current_user_role() = 'admin');

-- Org Admins can manage their own pricing
DROP POLICY IF EXISTS "Org Admins manage own hospital rooms" ON public.hospital_rooms;
CREATE POLICY "Org Admins manage own hospital rooms" ON public.hospital_rooms FOR ALL TO authenticated 
USING (public.get_current_user_role() = 'org_admin' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.organization_id = (SELECT organization_id FROM public.hospitals h WHERE h.id::text = hospital_rooms.hospital_id::text)))
WITH CHECK (public.get_current_user_role() = 'org_admin' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.organization_id = (SELECT organization_id FROM public.hospitals h WHERE h.id::text = hospital_rooms.hospital_id::text)));

DROP POLICY IF EXISTS "Org Admins manage own service pricing" ON public.service_pricing;
CREATE POLICY "Org Admins manage own service pricing" ON public.service_pricing FOR ALL TO authenticated 
USING (public.get_current_user_role() = 'org_admin' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.organization_id = service_pricing.organization_id))
WITH CHECK (public.get_current_user_role() = 'org_admin' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.organization_id = service_pricing.organization_id));

DROP POLICY IF EXISTS "Org Admins manage own room pricing" ON public.room_pricing;
CREATE POLICY "Org Admins manage own room pricing" ON public.room_pricing FOR ALL TO authenticated 
USING (public.get_current_user_role() = 'org_admin' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.organization_id = room_pricing.organization_id))
WITH CHECK (public.get_current_user_role() = 'org_admin' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.organization_id = room_pricing.organization_id));

-- Global view for providers/patients
DROP POLICY IF EXISTS "Authenticated users can view rooms" ON public.hospital_rooms;
CREATE POLICY "Authenticated users can view rooms" ON public.hospital_rooms FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can view prices" ON public.service_pricing;
CREATE POLICY "Authenticated users can view prices" ON public.service_pricing FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can view room prices" ON public.room_pricing;
CREATE POLICY "Authenticated users can view room prices" ON public.room_pricing FOR SELECT TO authenticated USING (true);

COMMIT;

-- Force PostgREST to reload
NOTIFY pgrst, 'reload schema';
