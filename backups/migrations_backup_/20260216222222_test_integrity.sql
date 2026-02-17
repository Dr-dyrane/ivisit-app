-- Database Integrity & Sanity Check
-- Run this script to detect silent issues like Orphaned Records, Missing RLS Policies, or Data Mismatches.

BEGIN;

DO $$
DECLARE
    v_users_count INT;
    v_profiles_count INT;
    v_missing_profiles INT;
    v_tables_with_rls_no_policy INT;
    v_table_name TEXT;
BEGIN
    RAISE NOTICE '----------------------------------------------------------------';
    RAISE NOTICE 'RUNNING INTEGRITY CHECKS...';
    RAISE NOTICE '----------------------------------------------------------------';

    ----------------------------------------------------------------------------
    -- 1. Check for Orphaned Users (Auth Users without Profiles)
    ----------------------------------------------------------------------------
    SELECT COUNT(*) INTO v_users_count FROM auth.users;
    SELECT COUNT(*) INTO v_profiles_count FROM public.profiles;
    
    SELECT COUNT(*) INTO v_missing_profiles
    FROM auth.users au
    LEFT JOIN public.profiles p ON au.id = p.id
    WHERE p.id IS NULL;

    IF v_missing_profiles > 0 THEN
        RAISE WARNING '⚠️ Found % Auth Users without Profiles! (Orphaned Users)', v_missing_profiles;
    ELSE
        RAISE NOTICE '✅ All Auth Users have Profiles.';
    END IF;

    ----------------------------------------------------------------------------
    -- 2. Check for Missing RLS Policies on Protected Tables
    ----------------------------------------------------------------------------
    -- Tables with RLS enabled but ZERO policies (Data will be hidden from everyone except superuser)
    SELECT COUNT(*) INTO v_tables_with_rls_no_policy
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relrowsecurity = true
    AND n.nspname = 'public'
    AND NOT EXISTS (
        SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid
    );

    IF v_tables_with_rls_no_policy > 0 THEN
        RAISE WARNING '⚠️ Found % tables with RLS enabled but NO policies! (Data is effectively hidden)', v_tables_with_rls_no_policy;
        -- Optional: List them
        FOR v_table_name IN 
            SELECT relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relrowsecurity = true AND n.nspname = 'public' AND NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid)
        LOOP
            RAISE WARNING '   - Table: %', v_table_name;
        END LOOP;
    ELSE
        RAISE NOTICE '✅ All RLS-enabled tables have at least one policy.';
    END IF;

    ----------------------------------------------------------------------------
    -- 3. Room Pricing Check
    ----------------------------------------------------------------------------
    -- If room_pricing is empty but service_pricing has data, it might indicate a regression
    IF (SELECT COUNT(*) FROM public.room_pricing) = 0 THEN
        RAISE WARNING '⚠️ room_pricing table is empty! Check if seed data was applied.';
    END IF;

    RAISE NOTICE '----------------------------------------------------------------';
    RAISE NOTICE 'INTEGRITY CHECKS COMPLETE.';
    RAISE NOTICE '----------------------------------------------------------------';
END;
$$;
