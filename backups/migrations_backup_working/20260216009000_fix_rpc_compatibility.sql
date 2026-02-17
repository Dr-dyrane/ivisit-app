-- 20260216009000_fix_rpc_compatibility.sql
-- Master fix for RPC overloading, missing columns, and auth user type mismatches.

BEGIN;

-- 1. RESTORE MISSING COLUMNS
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_id TEXT;
ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS display_id TEXT;

-- 2. CONSOLIDATE RPCs (Eliminate Overloading)
-- Drop all variants to ensure a clean state for PostgREST
DROP FUNCTION IF EXISTS public.get_display_id(UUID);
DROP FUNCTION IF EXISTS public.get_display_id(TEXT);
DROP FUNCTION IF EXISTS public.get_display_ids(UUID[]);
DROP FUNCTION IF EXISTS public.get_display_ids(TEXT[]);
DROP FUNCTION IF EXISTS public.get_entity_id(TEXT);

-- Implement single signatures (Accept TEXT, cast internally)
CREATE OR REPLACE FUNCTION public.get_display_id(p_entity_id TEXT)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT display_id FROM public.id_mappings WHERE entity_id::text = p_entity_id;
$$;

CREATE OR REPLACE FUNCTION public.get_display_ids(p_entity_ids TEXT[])
RETURNS TABLE(entity_id UUID, display_id TEXT) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
    RETURN QUERY SELECT id_mappings.entity_id, id_mappings.display_id 
    FROM public.id_mappings 
    WHERE id_mappings.entity_id::text = ANY(p_entity_ids);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_entity_id(p_display_id TEXT)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT entity_id FROM public.id_mappings WHERE display_id = p_display_id;
$$;

-- 3. FIX AUTH USER RPC (Explicit Casting)
DROP FUNCTION IF EXISTS public.get_all_auth_users();
CREATE OR REPLACE FUNCTION public.get_all_auth_users()
RETURNS TABLE (
    id UUID, 
    email TEXT, 
    phone TEXT, 
    last_sign_in_at TIMESTAMPTZ, 
    created_at TIMESTAMPTZ
) SECURITY DEFINER SET search_path = auth, public LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY SELECT 
        au.id::UUID, 
        au.email::TEXT, 
        au.phone::TEXT, 
        au.last_sign_in_at::TIMESTAMPTZ, 
        au.created_at::TIMESTAMPTZ 
    FROM auth.users au;
END;
$$;

-- 4. UPDATE TRIGGERS FOR SYNCHRONIZATION
CREATE OR REPLACE FUNCTION public.on_hospital_created_generate_id()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_display_id TEXT;
BEGIN
    v_display_id := public.generate_display_id('ORG');
    INSERT INTO public.id_mappings (entity_type, entity_id, display_id)
    VALUES ('hospital', NEW.id, v_display_id) 
    ON CONFLICT (entity_type, entity_id) DO NOTHING;
    -- Also update the table's local column
    UPDATE public.hospitals SET display_id = v_display_id WHERE id = NEW.id;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.on_profile_created_generate_id()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE prefix TEXT; v_display_id TEXT; entity_type_val TEXT;
BEGIN
    IF NEW.role = 'patient' THEN prefix := 'IVP'; entity_type_val := 'patient';
    ELSIF NEW.role IN ('admin', 'org_admin') THEN prefix := 'ADM'; entity_type_val := 'admin';
    ELSIF NEW.role = 'dispatcher' THEN prefix := 'DSP'; entity_type_val := 'dispatcher';
    ELSIF NEW.role = 'provider' THEN prefix := 'PRV'; entity_type_val := 'provider';
    ELSE RETURN NEW; END IF;
    
    v_display_id := public.generate_display_id(prefix);
    INSERT INTO public.id_mappings (entity_type, entity_id, display_id)
    VALUES (entity_type_val, NEW.id, v_display_id) 
    ON CONFLICT (entity_type, entity_id) DO NOTHING;
    -- Also update the table's local column
    NEW.display_id := v_display_id;
    RETURN NEW;
END;
$$;

-- 5. BACKFILL DATA
UPDATE public.profiles p SET display_id = m.display_id 
FROM public.id_mappings m WHERE p.id = m.entity_id AND p.display_id IS NULL;

UPDATE public.hospitals h SET display_id = m.display_id 
FROM public.id_mappings m WHERE h.id = m.entity_id AND h.display_id IS NULL;

-- 6. RELOAD SCHEMA
NOTIFY pgrst, 'reload schema';

COMMIT;
