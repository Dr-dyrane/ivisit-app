-- Diagnostic Migration: Find the source of uuid = text error
-- This migration does NOT change anything. It only runs diagnostics.

DO $$
DECLARE
    col_rec RECORD;
    trigger_rec RECORD;
BEGIN
    -- 1. Check ambulances table column types
    RAISE NOTICE '=== AMBULANCES TABLE COLUMNS ===';
    FOR col_rec IN 
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'ambulances'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE 'Column: % | Type: % | Nullable: % | Default: %', 
            col_rec.column_name, col_rec.data_type, col_rec.is_nullable, col_rec.column_default;
    END LOOP;

    -- 2. Check hospitals table column types (especially organization_id)
    RAISE NOTICE '=== HOSPITALS TABLE COLUMNS ===';
    FOR col_rec IN 
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'hospitals'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE 'Column: % | Type: % | Nullable: % | Default: %', 
            col_rec.column_name, col_rec.data_type, col_rec.is_nullable, col_rec.column_default;
    END LOOP;

    -- 3. Check doctors table column types
    RAISE NOTICE '=== DOCTORS TABLE COLUMNS ===';
    FOR col_rec IN 
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'doctors'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE 'Column: % | Type: % | Nullable: % | Default: %', 
            col_rec.column_name, col_rec.data_type, col_rec.is_nullable, col_rec.column_default;
    END LOOP;

    -- 4. Check profiles table key column types
    RAISE NOTICE '=== PROFILES KEY COLUMNS ===';
    FOR col_rec IN 
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles'
        AND column_name IN ('id', 'organization_id', 'role', 'provider_type')
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE 'Column: % | Type: % | Nullable: %', 
            col_rec.column_name, col_rec.data_type, col_rec.is_nullable;
    END LOOP;

    -- 5. List ALL triggers on profiles
    RAISE NOTICE '=== TRIGGERS ON PROFILES ===';
    FOR trigger_rec IN
        SELECT trigger_name, event_manipulation, action_timing, action_statement
        FROM information_schema.triggers
        WHERE event_object_schema = 'public' AND event_object_table = 'profiles'
        ORDER BY action_order
    LOOP
        RAISE NOTICE 'Trigger: % | Event: % | Timing: % | Function: %',
            trigger_rec.trigger_name, trigger_rec.event_manipulation, 
            trigger_rec.action_timing, trigger_rec.action_statement;
    END LOOP;

    -- 6. List ALL triggers on ambulances
    RAISE NOTICE '=== TRIGGERS ON AMBULANCES ===';
    FOR trigger_rec IN
        SELECT trigger_name, event_manipulation, action_timing, action_statement
        FROM information_schema.triggers
        WHERE event_object_schema = 'public' AND event_object_table = 'ambulances'
        ORDER BY action_order
    LOOP
        RAISE NOTICE 'Trigger: % | Event: % | Timing: % | Function: %',
            trigger_rec.trigger_name, trigger_rec.event_manipulation, 
            trigger_rec.action_timing, trigger_rec.action_statement;
    END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';
