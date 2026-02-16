-- Migration: Infrastructure Pricing Seeder and RLS
-- Description: Seeds hospital_rooms and service_pricing, and adds RLS policies.

-- 1. Ensure Organizations RLS and Seeder
-- (Optional: seed a default org if none exists)
INSERT INTO public.organizations (id, name, contact_email, is_active)
VALUES ('00000000-0000-0000-0000-000000000000', 'iVisit Network', 'admin@ivisit.com', true)
ON CONFLICT (id) DO NOTHING;

-- Link existing hospitals with no organization to the default one
UPDATE public.hospitals 
SET organization_id = '00000000-0000-0000-0000-000000000000'
WHERE organization_id IS NULL;

-- 2. Add RLS to hospital_rooms and service_pricing
ALTER TABLE public.hospital_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_pricing ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins have full access to hospital_rooms" ON public.hospital_rooms FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins have full access to service_pricing" ON public.service_pricing FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Org Admins can manage their own pricing
CREATE POLICY "Org Admins manage own hospital rooms" ON public.hospital_rooms FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM public.hospitals h JOIN public.profiles p ON h.organization_id = p.organization_id WHERE h.id::text = hospital_rooms.hospital_id::text AND p.id = auth.uid() AND p.role = 'org_admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.hospitals h JOIN public.profiles p ON h.organization_id = p.organization_id WHERE h.id::text = hospital_rooms.hospital_id::text AND p.id = auth.uid() AND p.role = 'org_admin'));

CREATE POLICY "Org Admins manage own service pricing" ON public.service_pricing FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.organization_id = service_pricing.organization_id AND p.id = auth.uid() AND p.role = 'org_admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.organization_id = service_pricing.organization_id AND p.id = auth.uid() AND p.role = 'org_admin'));

-- Global view for providers/patients
CREATE POLICY "Authenticated users can view rooms" ON public.hospital_rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can view prices" ON public.service_pricing FOR SELECT TO authenticated USING (true);

-- 3. Seeding Service Pricing
INSERT INTO public.service_pricing (service_type, service_name, base_price, currency, description)
VALUES 
('ambulance', 'Basic Life Support (BLS)', 150.00, 'USD', 'Standard ambulance transportation with basic emergency care.'),
('ambulance', 'Advanced Life Support (ALS)', 250.00, 'USD', 'Specialized ambulance with advanced medical equipment and paramedics.'),
('consultation', 'General Practitioner', 80.00, 'USD', 'Standard medical consultation with a GP.'),
('consultation', 'Specialist Consultation', 150.00, 'USD', 'Consultation with a medical specialist.'),
('bed_booking', 'Standard Hospital Bed', 200.00, 'USD', 'Daily rate for a standard hospital bed.')
ON CONFLICT DO NOTHING;

-- 4. Seeding Hospital Rooms (Generic for known hospitals)
-- For demonstration, we link these to the default network or specific hospitals if known
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

-- Force PostgREST to reload
NOTIFY pgrst, 'reload schema';
