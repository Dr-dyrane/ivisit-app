-- 20260216020000_clean_slate.sql
-- "Starting Afresh": Transactional Cleanup with Data Preservation (Hardened)

BEGIN;

-- 1. DYNAMIC TRUNCATE (Only if tables exist)
DO $$
DECLARE
    tbl text;
    -- Define the list of tables we want to clear
    tables_to_clear text[] := ARRAY[
        'emergency_requests',
        'historical_emergencies', -- check variant names
        'visits',
        'payments',
        'wallet_ledger',
        'payment_methods',
        'notifications',
        'search_history',
        'analytics_events',
        'id_mappings',
        'dispatch_logs',
        'ambulance_tracking',
        'activity_logs'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables_to_clear LOOP
        -- Only attempt to truncate if the table exists in public schema
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            EXECUTE format('TRUNCATE TABLE public.%I CASCADE', tbl);
            RAISE NOTICE 'Truncated table %', tbl;
        ELSE
            RAISE NOTICE 'Skipping non-existent table %', tbl;
        END IF;
    END LOOP;
END $$;

-- 2. RESET WALLET BALANCES (Preserve the wallets, clear the money)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organization_wallets') THEN
        UPDATE public.organization_wallets SET balance = 0;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ivisit_main_wallet') THEN
        UPDATE public.ivisit_main_wallet SET balance = 0;
    END IF;
END $$;

-- 3. RE-SYNC PRESERVED ENTITY MAPPINGS
-- This ensures that your existing Admin/Hospital profiles still have their predictable short IDs.

-- Sync Hospitals
INSERT INTO public.id_mappings (entity_type, entity_id, display_id)
SELECT 'hospital', h.id, h.display_id
FROM public.hospitals h
WHERE h.display_id IS NOT NULL
ON CONFLICT (display_id) DO UPDATE SET entity_id = EXCLUDED.entity_id;

-- Sync Profiles
INSERT INTO public.id_mappings (entity_type, entity_id, display_id)
SELECT 
    CASE 
        WHEN p.role = 'patient' THEN 'patient'
        WHEN p.role IN ('admin', 'org_admin') THEN 'admin'
        WHEN p.role = 'dispatcher' THEN 'dispatcher'
        WHEN p.role = 'provider' THEN 'provider'
        ELSE 'user'
    END,
    p.id, p.display_id
FROM public.profiles p
WHERE p.display_id IS NOT NULL
ON CONFLICT (display_id) DO UPDATE SET entity_id = EXCLUDED.entity_id;

-- 4. FINAL TRIGGER VERIFICATION
-- Ensure triggers are enabled (if they exist)
DO $$
BEGIN
    -- Profiles Trigger
    IF EXISTS (SELECT 1 FROM information_schema.triggers WHERE event_object_table = 'profiles' AND trigger_name = 'on_profile_created_id_mapping') THEN
        ALTER TABLE public.profiles ENABLE TRIGGER on_profile_created_id_mapping;
    END IF;
    -- Hospitals Trigger
    IF EXISTS (SELECT 1 FROM information_schema.triggers WHERE event_object_table = 'hospitals' AND trigger_name = 'on_hospital_created_id_mapping') THEN
        ALTER TABLE public.hospitals ENABLE TRIGGER on_hospital_created_id_mapping;
    END IF;
END $$;

COMMIT;

-- Reload schema for PostgREST
NOTIFY pgrst, 'reload schema';
