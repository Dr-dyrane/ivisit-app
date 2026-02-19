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
BEGIN
    -- Generates a prefix + 6 random hex characters (e.g. USR-A1B2C3)
    -- Statistically unique enough for our scale, and enforced by UNIQUE table constraints.
    RETURN prefix || '-' || UPPER(SUBSTRING(MD5(GEN_RANDOM_UUID()::TEXT), 1, 6));
END;
$$ LANGUAGE plpgsql;

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
