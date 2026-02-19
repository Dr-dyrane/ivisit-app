-- ═══════════════════════════════════════════════════════════════
-- 🏗️ iVisit Platform Setup Script
-- Live fixes + seed data for initial deployment
-- Run via Supabase SQL Editor as service_role
-- ═══════════════════════════════════════════════════════════════

-- ─── PART 1: LIVE SCHEMA FIXES ───────────────────────────────

-- 1A. Fix subscribers table: add missing columns
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS new_user BOOLEAN DEFAULT true;
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS welcome_email_sent BOOLEAN DEFAULT false;
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS subscription_date TIMESTAMPTZ DEFAULT NOW();

-- 1B. Fix get_recent_activity RPC: align parameters with console service
CREATE OR REPLACE FUNCTION public.get_recent_activity(limit_count INTEGER DEFAULT 20, offset_count INTEGER DEFAULT 0)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    action TEXT,
    entity_type TEXT,
    entity_id UUID,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    IF NOT public.p_is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
    RETURN QUERY
    SELECT ua.id, ua.user_id, ua.action, ua.entity_type, ua.entity_id, ua.description, ua.metadata, ua.created_at
    FROM public.user_activity ua
    ORDER BY ua.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1C. Fix get_activity_stats RPC: align parameter name
CREATE OR REPLACE FUNCTION public.get_activity_stats(days_back INTEGER DEFAULT 7)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    IF NOT public.p_is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
    SELECT jsonb_build_object(
        'total_actions', count(*),
        'unique_users', count(DISTINCT ua.user_id),
        'period_days', days_back
    ) INTO v_result
    FROM public.user_activity ua
    WHERE ua.created_at >= NOW() - (days_back || ' days')::INTERVAL;
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ─── PART 2: PLATFORM ADMIN SETUP ───────────────────────────

-- 2A. Make halodyrane platform admin
UPDATE public.profiles
SET role = 'admin',
    onboarding_status = 'completed'
WHERE id = '2fdaa45f-787d-45a6-a476-8a71c24c1b8b';

-- 2B. Sync admin role to JWT claims
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb
WHERE id = '2fdaa45f-787d-45a6-a476-8a71c24c1b8b';


-- ─── PART 3: SEED PLATFORM WALLET ───────────────────────────

-- 3A. Create iVisit main wallet (required by console dashboard)
INSERT INTO public.ivisit_main_wallet (balance, currency)
VALUES (0.00, 'USD')
ON CONFLICT DO NOTHING;


-- ─── PART 4: SEED ORGANIZATION ───────────────────────────────

-- 4A. Create iVisit company organization
INSERT INTO public.organizations (id, name, contact_email, is_active)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'iVisit Medical Services',
    'halodyrane@gmail.com',
    true
)
ON CONFLICT (id) DO NOTHING;

-- 4B. Create organization wallet
INSERT INTO public.organization_wallets (organization_id, balance, currency)
VALUES ('a0000000-0000-0000-0000-000000000001', 0.00, 'USD')
ON CONFLICT (organization_id) DO NOTHING;


-- ─── PART 5: SEED HOSPITAL (Hemet area) ──────────────────────

-- 5A. Insert Hemet Valley Medical Center (nearest real hospital to 2235 Corinot Ct)
INSERT INTO public.hospitals (
    id, name, address, phone, rating, type,
    specialties, service_types, features, emergency_level,
    available_beds, ambulances_count, wait_time, price_range,
    latitude, longitude, verified, verification_status, status,
    org_admin_id, organization_id, base_price
)
VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'Hemet Valley Medical Center',
    '1117 E Devonshire Ave, Hemet, CA 92543',
    '+19517919811',
    4.2,
    'hospital',
    ARRAY['Emergency Medicine', 'Internal Medicine', 'Surgery', 'Cardiology', 'Orthopedics'],
    ARRAY['ambulance', 'bed', 'booking'],
    ARRAY['Emergency Room', 'ICU', 'Radiology', 'Laboratory', 'Pharmacy'],
    'Level III',
    45,
    3,
    '15-30 min',
    '$$',
    33.7394,  -- Latitude (Hemet, CA)
    -116.9719, -- Longitude
    true,
    'verified',
    'available',
    '2fdaa45f-787d-45a6-a476-8a71c24c1b8b', -- halodyrane as org_admin
    'a0000000-0000-0000-0000-000000000001', -- iVisit org
    150.00
)
ON CONFLICT (id) DO NOTHING;


-- ─── PART 6: SEED USERS (org_admin, doctor, driver) ─────────

-- NOTE: These users need to exist in auth.users first.
-- We create them via Supabase Auth Admin API.
-- The handle_new_user trigger will auto-create profiles.
-- After trigger fires, we UPDATE the profiles with correct roles.

-- 6A. Create auth users for seeded staff
-- org_admin
INSERT INTO auth.users (
    id, instance_id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new,
    is_sso_user
)
VALUES (
    'c0000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'orgadmin@ivisit.test',
    crypt('Test1234!', gen_salt('bf')),
    NOW(),
    '{"provider": "email", "providers": ["email"], "role": "org_admin"}'::jsonb,
    '{"full_name": "Sarah Mitchell", "role": "org_admin"}'::jsonb,
    NOW(), NOW(),
    '', '', '',
    false
)
ON CONFLICT (id) DO NOTHING;

-- doctor (provider / doctor)
INSERT INTO auth.users (
    id, instance_id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new,
    is_sso_user
)
VALUES (
    'c0000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'doctor@ivisit.test',
    crypt('Test1234!', gen_salt('bf')),
    NOW(),
    '{"provider": "email", "providers": ["email"], "role": "provider"}'::jsonb,
    '{"full_name": "Dr. James Carter", "role": "provider"}'::jsonb,
    NOW(), NOW(),
    '', '', '',
    false
)
ON CONFLICT (id) DO NOTHING;

-- ambulance driver (provider / ambulance)
INSERT INTO auth.users (
    id, instance_id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new,
    is_sso_user
)
VALUES (
    'c0000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'driver@ivisit.test',
    crypt('Test1234!', gen_salt('bf')),
    NOW(),
    '{"provider": "email", "providers": ["email"], "role": "provider"}'::jsonb,
    '{"full_name": "Marcus Johnson", "role": "provider"}'::jsonb,
    NOW(), NOW(),
    '', '', '',
    false
)
ON CONFLICT (id) DO NOTHING;

-- 6B. Wait for trigger to fire, then set correct roles and link to org
-- org_admin
UPDATE public.profiles
SET role = 'org_admin',
    provider_type = NULL,
    organization_id = 'a0000000-0000-0000-0000-000000000001',
    onboarding_status = 'completed',
    phone = '+19515551001',
    address = '2235 Corinot Ct, Hemet, CA 92545'
WHERE id = 'c0000000-0000-0000-0000-000000000001';

-- doctor
UPDATE public.profiles
SET role = 'provider',
    provider_type = 'doctor',
    organization_id = 'a0000000-0000-0000-0000-000000000001',
    onboarding_status = 'completed',
    phone = '+19515551002'
WHERE id = 'c0000000-0000-0000-0000-000000000002';

-- ambulance driver
UPDATE public.profiles
SET role = 'provider',
    provider_type = 'ambulance',
    organization_id = 'a0000000-0000-0000-0000-000000000001',
    onboarding_status = 'completed',
    phone = '+19515551003'
WHERE id = 'c0000000-0000-0000-0000-000000000003';

-- 6C. Seed Doctor record (linked to profile)
INSERT INTO public.doctors (
    id, profile_id, hospital_id, name, specialization,
    rating, experience, about, consultation_fee,
    is_available, department, status, email, phone
)
VALUES (
    'd0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000001',
    'Dr. James Carter',
    'Emergency Medicine',
    4.8,
    12,
    'Board-certified Emergency Medicine physician with 12 years of experience.',
    '$200',
    true,
    'Emergency',
    'available',
    'doctor@ivisit.test',
    '+19515551002'
)
ON CONFLICT (id) DO NOTHING;

-- 6D. Seed Ambulance (linked to driver profile + hospital)
INSERT INTO public.ambulances (
    id, hospital_id, organization_id, profile_id,
    type, call_sign, status, vehicle_number, license_plate, base_price,
    location
)
VALUES (
    'e0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000003',
    'ALS',
    'HEMET-1',
    'available',
    'AMB-001',
    'CA-7VIS1T',
    150.00,
    ST_SetSRID(ST_MakePoint(-116.9719, 33.7394), 4326) -- Hemet area
)
ON CONFLICT (id) DO NOTHING;

-- 6E. Link driver to ambulance
UPDATE public.profiles
SET assigned_ambulance_id = 'e0000000-0000-0000-0000-000000000001'
WHERE id = 'c0000000-0000-0000-0000-000000000003';

-- 6F. Update hospital ambulance count
UPDATE public.hospitals
SET ambulances_count = 1
WHERE id = 'b0000000-0000-0000-0000-000000000001';


-- ─── PART 7: SYNC JWT CLAIMS FOR SEEDED USERS ───────────────

UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "org_admin"}'::jsonb
WHERE id = 'c0000000-0000-0000-0000-000000000001';

UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "provider"}'::jsonb
WHERE id = 'c0000000-0000-0000-0000-000000000002';

UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "provider"}'::jsonb
WHERE id = 'c0000000-0000-0000-0000-000000000003';


-- ─── PART 8: VERIFY ──────────────────────────────────────────

-- Quick verification queries (uncomment to run)
-- SELECT id, email, role, onboarding_status, organization_id, display_id FROM profiles;
-- SELECT id, name, display_id FROM organizations;
-- SELECT id, name, address, display_id, org_admin_id FROM hospitals;
-- SELECT id, name, specialization, display_id FROM doctors;
-- SELECT id, type, call_sign, display_id, profile_id FROM ambulances;
-- SELECT * FROM ivisit_main_wallet;

-- ═══════════════════════════════════════════════════════════════
-- 🎯 SUMMARY:
--   ✅ Fixed: subscribers.new_user column
--   ✅ Fixed: get_recent_activity RPC params
--   ✅ Fixed: get_activity_stats RPC params
--   ✅ Seeded: Platform wallet (ivisit_main_wallet)
--   ✅ Seeded: halodyrane as platform admin
--   ✅ Seeded: iVisit Medical Services org
--   ✅ Seeded: Hemet Valley Medical Center hospital
--   ✅ Seeded: Sarah Mitchell (org_admin)
--   ✅ Seeded: Dr. James Carter (doctor/provider)
--   ✅ Seeded: Marcus Johnson (ambulance driver/provider)
--   ✅ Synced: JWT claims for all users
-- ═══════════════════════════════════════════════════════════════
