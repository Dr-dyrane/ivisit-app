-- ═══════════════════════════════════════════════════════════════
-- 🏗️ iVisit Platform Seed Script
-- Pure seed data — no schema fixes (those live in pillar files)
-- Run via Supabase SQL Editor as service_role
--
-- PREREQUISITE: Apply pillar migrations first to get:
--   • subscribers columns  → 0001_identity.sql
--   • RPC param fixes      → 0100_core_rpcs.sql
-- ═══════════════════════════════════════════════════════════════


-- ─── 1. PLATFORM ADMIN ──────────────────────────────────────

-- 1A. Make halodyrane platform admin
UPDATE public.profiles
SET role = 'admin',
    onboarding_status = 'completed'
WHERE id = '2fdaa45f-787d-45a6-a476-8a71c24c1b8b';

-- 1B. Sync admin role to JWT claims
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb
WHERE id = '2fdaa45f-787d-45a6-a476-8a71c24c1b8b';


-- ─── 2. PLATFORM WALLET ─────────────────────────────────────

INSERT INTO public.ivisit_main_wallet (balance, currency)
VALUES (0.00, 'USD')
ON CONFLICT DO NOTHING;


-- ─── 3. ORGANIZATION ────────────────────────────────────────

INSERT INTO public.organizations (id, name, contact_email, is_active)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'iVisit Medical Services',
    'halodyrane@gmail.com',
    true
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.organization_wallets (organization_id, balance, currency)
VALUES ('a0000000-0000-0000-0000-000000000001', 0.00, 'USD')
ON CONFLICT (organization_id) DO NOTHING;


-- ─── 4. HOSPITAL (Hemet area) ───────────────────────────────

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
    33.7394,
    -116.9719,
    true,
    'verified',
    'available',
    '2fdaa45f-787d-45a6-a476-8a71c24c1b8b',
    'a0000000-0000-0000-0000-000000000001',
    150.00
)
ON CONFLICT (id) DO NOTHING;


-- ─── 5. SEED USERS (org_admin, doctor, driver) ──────────────

-- 5A. Create auth users (trigger auto-creates profiles)

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

-- doctor
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

-- ambulance driver
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

-- 5B. Set correct roles and link to org (after trigger fires)

UPDATE public.profiles
SET role = 'org_admin',
    provider_type = NULL,
    organization_id = 'a0000000-0000-0000-0000-000000000001',
    onboarding_status = 'completed',
    phone = '+19515551001',
    address = '2235 Corinot Ct, Hemet, CA 92545'
WHERE id = 'c0000000-0000-0000-0000-000000000001';

UPDATE public.profiles
SET role = 'provider',
    provider_type = 'doctor',
    organization_id = 'a0000000-0000-0000-0000-000000000001',
    onboarding_status = 'completed',
    phone = '+19515551002'
WHERE id = 'c0000000-0000-0000-0000-000000000002';

UPDATE public.profiles
SET role = 'provider',
    provider_type = 'ambulance',
    organization_id = 'a0000000-0000-0000-0000-000000000001',
    onboarding_status = 'completed',
    phone = '+19515551003'
WHERE id = 'c0000000-0000-0000-0000-000000000003';

-- 5C. Sync JWT claims for seeded users

UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "org_admin"}'::jsonb
WHERE id = 'c0000000-0000-0000-0000-000000000001';

UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "provider"}'::jsonb
WHERE id = 'c0000000-0000-0000-0000-000000000002';

UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "provider"}'::jsonb
WHERE id = 'c0000000-0000-0000-0000-000000000003';


-- ─── 6. SEED DOCTOR & AMBULANCE ─────────────────────────────

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
    ST_SetSRID(ST_MakePoint(-116.9719, 33.7394), 4326)
)
ON CONFLICT (id) DO NOTHING;

-- Link driver to ambulance
UPDATE public.profiles
SET assigned_ambulance_id = 'e0000000-0000-0000-0000-000000000001'
WHERE id = 'c0000000-0000-0000-0000-000000000003';

-- Update hospital ambulance count
UPDATE public.hospitals
SET ambulances_count = 1
WHERE id = 'b0000000-0000-0000-0000-000000000001';


-- ═══════════════════════════════════════════════════════════════
-- 🎯 SUMMARY (pure seed data — no DDL):
--   ✅ halodyrane → platform admin
--   ✅ iVisit main wallet → seeded
--   ✅ iVisit Medical Services → org + wallet
--   ✅ Hemet Valley Medical Center → hospital
--   ✅ Sarah Mitchell → org_admin (orgadmin@ivisit.test / Test1234!)
--   ✅ Dr. James Carter → doctor (doctor@ivisit.test / Test1234!)
--   ✅ Marcus Johnson → driver (driver@ivisit.test / Test1234!)
--   ✅ Doctor record + Ambulance record → linked
-- ═══════════════════════════════════════════════════════════════
