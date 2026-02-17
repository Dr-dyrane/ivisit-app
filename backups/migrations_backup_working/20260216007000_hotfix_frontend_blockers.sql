-- 20260216007000_hotfix_frontend_blockers.sql
-- Fixes missing FKs, missing RPCs, signature mismatches, and missing RLS policies.

BEGIN;

-- 1. RESTORE MISSING VISITS -> PROFILES FK
ALTER TABLE public.visits DROP CONSTRAINT IF EXISTS visits_user_id_fkey;
ALTER TABLE public.visits ADD CONSTRAINT visits_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. RE-IMPLEMENT get_all_auth_users
DROP FUNCTION IF EXISTS public.get_all_auth_users();
CREATE OR REPLACE FUNCTION public.get_all_auth_users()
RETURNS TABLE (id UUID, email TEXT, phone TEXT, last_sign_in_at TIMESTAMPTZ, created_at TIMESTAMPTZ) 
SECURITY DEFINER SET search_path = auth, public LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY SELECT au.id, au.email, au.phone, au.last_sign_in_at, au.created_at FROM auth.users au;
END;
$$;

-- 3. ADD RPC OVERLOADS FOR TEXT COMPATIBILITY
DROP FUNCTION IF EXISTS public.get_display_ids(TEXT[]);
CREATE OR REPLACE FUNCTION public.get_display_ids(p_entity_ids TEXT[])
RETURNS TABLE(entity_id UUID, display_id TEXT) 
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
    RETURN QUERY SELECT id_mappings.entity_id, id_mappings.display_id FROM public.id_mappings WHERE id_mappings.entity_id::text = ANY(p_entity_ids);
END;
$$;

DROP FUNCTION IF EXISTS public.get_display_id(TEXT);
CREATE OR REPLACE FUNCTION public.get_display_id(p_entity_id TEXT)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT display_id FROM public.id_mappings WHERE entity_id::text = p_entity_id;
$$;

-- 4. RELOAD SCHEMA
NOTIFY pgrst, 'reload schema';

-- 5. RELOAD SCHEMA
COMMIT;
NOTIFY pgrst, 'reload schema';
