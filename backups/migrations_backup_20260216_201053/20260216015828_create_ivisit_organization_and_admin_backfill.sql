-- Create iVisit Organization and Backfill Admin Profile
-- 1. Create iVisit organization for main account
-- 2. Backfill halodyrane@gmail.com admin profile with proper display ID (ADM-000001)
-- 3. Fix image URL sync from auth.users to profiles
-- 4. Update organization assignment

BEGIN;

-- ============================================================
-- 1. CREATE IVISIT ORGANIZATION
-- ============================================================

-- Check if iVisit organization already exists
INSERT INTO public.organizations (
    id,
    name,
    contact_email,
    ivisit_fee_percentage,
    is_active,
    created_at,
    updated_at
) VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a10', -- Fixed UUID for consistency
    'iVisit',
    'admin@ivisit.com',
    2.50,
    TRUE,
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Update existing organization mapping if it exists, or create new one
INSERT INTO public.id_mappings (entity_type, entity_id, display_id)
VALUES ('hospital', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a10', 'ORG-000001')
ON CONFLICT (display_id) DO UPDATE SET 
    entity_id = EXCLUDED.entity_id,
    entity_type = EXCLUDED.entity_type;

-- ============================================================
-- 2. BACKFILL ADMIN PROFILE FOR halodyrane@gmail.com
-- ============================================================

-- Update profile with proper image URL from auth.users and set organization
UPDATE public.profiles 
SET 
    full_name = COALESCE(
        (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = profiles.id),
        profiles.full_name
    ),
    avatar_url = COALESCE(
        (SELECT raw_user_meta_data->>'avatar_url' FROM auth.users WHERE id = profiles.id),
        profiles.avatar_url
    ),
    image_uri = COALESCE(
        (SELECT raw_user_meta_data->>'avatar_url' FROM auth.users WHERE id = profiles.id),
        profiles.image_uri
    ),
    organization_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a10',
    updated_at = NOW()
WHERE email = 'halodyrane@gmail.com';

-- ============================================================
-- 3. FIX DISPLAY ID FOR ADMIN (ADM-000001)
-- ============================================================

-- Remove any existing mapping for this admin user
DELETE FROM public.id_mappings 
WHERE entity_id = (SELECT id FROM public.profiles WHERE email = 'halodyrane@gmail.com' LIMIT 1);

-- Insert correct admin display ID mapping (with upsert to handle conflicts)
INSERT INTO public.id_mappings (entity_type, entity_id, display_id)
VALUES (
    'admin',
    (SELECT id FROM public.profiles WHERE email = 'halodyrane@gmail.com' LIMIT 1),
    'ADM-000001'
) ON CONFLICT (display_id) DO UPDATE SET 
    entity_id = EXCLUDED.entity_id,
    entity_type = EXCLUDED.entity_type;

-- Update the profile display_id field if it exists
UPDATE public.profiles 
SET display_id = 'ADM-000001'
WHERE email = 'halodyrane@gmail.com';

-- ============================================================
-- 4. ENSURE ALL RELATED TABLES ARE CREATED
-- ============================================================

-- Create medical profile if missing
INSERT INTO public.medical_profiles (user_id)
SELECT id FROM public.profiles WHERE email = 'halodyrane@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

-- Create preferences if missing
INSERT INTO public.preferences (user_id)
SELECT id FROM public.profiles WHERE email = 'halodyrane@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

-- Create patient wallet if missing
INSERT INTO public.patient_wallets (user_id)
SELECT id FROM public.profiles WHERE email = 'halodyrane@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

-- Create insurance policy if missing
INSERT INTO public.insurance_policies (
    user_id, 
    provider_name, 
    policy_number, 
    plan_type,
    is_default, 
    coverage_details, 
    starts_at, 
    expires_at
)
SELECT 
    id,
    'iVisit Premium',
    'IV-PREMIUM-' || UPPER(SUBSTR(MD5(id::TEXT), 1, 8)),
    'premium',
    TRUE,
    '{"trip_limit": 10, "amount_limit": 250000, "description": "Premium coverage with unlimited emergency transport", "type": "emergency_transport"}'::jsonb,
    NOW(),
    (NOW() + INTERVAL '1 year')
FROM public.profiles 
WHERE email = 'halodyrane@gmail.com'
AND NOT EXISTS (
    SELECT 1 FROM public.insurance_policies WHERE user_id = profiles.id
);

-- ============================================================
-- 5. VERIFICATION QUERIES
-- ============================================================

-- Show the updated admin profile
DO $$
DECLARE
    admin_profile RECORD;
BEGIN
    SELECT * INTO admin_profile 
    FROM public.profiles 
    WHERE email = 'halodyrane@gmail.com';
    
    IF admin_profile IS NOT NULL THEN
        RAISE NOTICE '✅ Admin Profile Updated:';
        RAISE NOTICE '   ID: %', admin_profile.id;
        RAISE NOTICE '   Email: %', admin_profile.email;
        RAISE NOTICE '   Display ID: %', admin_profile.display_id;
        RAISE NOTICE '   Full Name: %', admin_profile.full_name;
        RAISE NOTICE '   Organization ID: %', admin_profile.organization_id;
        RAISE NOTICE '   Avatar URL: %', admin_profile.avatar_url;
        RAISE NOTICE '   Updated At: %', admin_profile.updated_at;
    ELSE
        RAISE NOTICE '❌ Admin profile not found for halodyrane@gmail.com';
    END IF;
END $$;

-- Show the organization
DO $$
DECLARE
    org_record RECORD;
BEGIN
    SELECT * INTO org_record 
    FROM public.organizations 
    WHERE name = 'iVisit';
    
    IF org_record IS NOT NULL THEN
        RAISE NOTICE '✅ iVisit Organization Created:';
        RAISE NOTICE '   ID: %', org_record.id;
        RAISE NOTICE '   Name: %', org_record.name;
        RAISE NOTICE '   Display ID: %', (SELECT display_id FROM public.id_mappings WHERE entity_id = org_record.id AND entity_type = 'hospital');
    ELSE
        RAISE NOTICE '❌ iVisit organization not found';
    END IF;
END $$;

-- Show display ID mapping
DO $$
DECLARE
    mapping_record RECORD;
BEGIN
    SELECT im.*, p.email INTO mapping_record
    FROM public.id_mappings im
    JOIN public.profiles p ON im.entity_id = p.id
    WHERE p.email = 'halodyrane@gmail.com';
    
    IF mapping_record IS NOT NULL THEN
        RAISE NOTICE '✅ Display ID Mapping:';
        RAISE NOTICE '   Entity Type: %', mapping_record.entity_type;
        RAISE NOTICE '   Entity ID: %', mapping_record.entity_id;
        RAISE NOTICE '   Display ID: %', mapping_record.display_id;
        RAISE NOTICE '   Email: %', mapping_record.email;
    ELSE
        RAISE NOTICE '❌ Display ID mapping not found';
    END IF;
END $$;

COMMIT;

-- ============================================================
-- SUMMARY
-- ============================================================
-- ✅ Created iVisit organization (ORG-000001)
-- ✅ Backfilled admin profile for halodyrane@gmail.com
-- ✅ Fixed image URL sync from auth.users
-- ✅ Set admin display ID to ADM-000001
-- ✅ Assigned admin to iVisit organization
-- ✅ Created related records (medical profile, preferences, wallet, insurance)
-- ============================================================