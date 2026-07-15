-- 🏯 Module 01: Infrastructure
-- Extensions & Core Utilities

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 🛠️ SHARED FUNCTIONS
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.generate_display_id(prefix TEXT)
RETURNS TEXT AS $$
DECLARE
    v_prefix TEXT := UPPER(NULLIF(BTRIM(prefix), ''));
    v_candidate TEXT;
    v_attempt INTEGER;
BEGIN
    IF v_prefix IS NULL OR v_prefix !~ '^[A-Z0-9]{2,8}$' THEN
        RAISE EXCEPTION 'Invalid display ID prefix';
    END IF;

    -- Keep the established short label while reserving each candidate globally.
    -- The transaction-scoped candidate lock closes the concurrent allocation race.
    FOR v_attempt IN 1..64 LOOP
        v_candidate := v_prefix || '-' || UPPER(SUBSTRING(MD5(GEN_RANDOM_UUID()::TEXT), 1, 6));
        PERFORM pg_catalog.pg_advisory_xact_lock(
            pg_catalog.hashtextextended('ivisit-display-id:' || v_candidate, 0)
        );

        IF NOT EXISTS (
            SELECT 1
            FROM public.id_mappings AS mapping
            WHERE mapping.display_id = v_candidate
        ) THEN
            RETURN v_candidate;
        END IF;
    END LOOP;

    RAISE EXCEPTION 'Unable to allocate a unique display ID for prefix %', v_prefix;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

-- 🛠️ ADMIN UTILITIES
CREATE OR REPLACE FUNCTION public.exec_sql(sql TEXT)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    -- Only allow service_role
    IF current_setting('request.jwt.claims', true)::jsonb->>'role' != 'service_role' THEN
        RAISE EXCEPTION 'Permission denied';
    END IF;
    
    EXECUTE sql;
    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.exec_sql(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.exec_sql(TEXT) TO service_role;
