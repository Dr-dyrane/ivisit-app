-- ============================================================================
-- SAFE TYPE FIX (PART 1: USERS & WALLET) — 2026-02-18
-- ============================================================================

BEGIN;

-- ═══════════════════════════════════════════════════════════
-- 1. FIX: update_profile_by_admin (TEXT Version)
-- ═══════════════════════════════════════════════════════════
DROP FUNCTION IF EXISTS public.update_profile_by_admin(uuid, jsonb);
DROP FUNCTION IF EXISTS public.update_profile_by_admin(text, jsonb);

CREATE OR REPLACE FUNCTION public.update_profile_by_admin(target_user_id uuid, profile_data jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result jsonb;
BEGIN
    IF NOT (public.get_current_user_role() IN ('admin', 'org_admin')) THEN
        RAISE EXCEPTION 'Access Denied: Insufficient permissions to update other users.';
    END IF;

    -- Ensure we use TEXT for organization_id
    UPDATE public.profiles
    SET 
        username = COALESCE(profile_data->>'username', username),
        role = COALESCE(profile_data->>'role', role),
        organization_id = CASE 
            WHEN profile_data ? 'organization_id' AND (profile_data->>'organization_id') IS NOT NULL 
            THEN (profile_data->>'organization_id')::text 
            ELSE organization_id 
        END,
        full_name = COALESCE(profile_data->>'full_name', full_name),
        provider_type = COALESCE(profile_data->>'provider_type', provider_type),
        bvn_verified = COALESCE((profile_data->>'bvn_verified')::boolean, bvn_verified),
        updated_at = now()
    WHERE id = target_user_id
    RETURNING to_jsonb(profiles) INTO result;

    RETURN result;
END;
$$;

-- ═══════════════════════════════════════════════════════════
-- 2. FIX: ivisit_main_wallet (Seed if missing)
-- ═══════════════════════════════════════════════════════════
-- Ensure ID is UUID but cast if needed, or rely on auto-generation
INSERT INTO public.ivisit_main_wallet (id, balance, currency, last_updated)
SELECT gen_random_uuid(), 0.00, 'USD', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.ivisit_main_wallet);

-- ═══════════════════════════════════════════════════════════
-- 3. FIX: get_all_auth_users (Correct Users List)
-- ═══════════════════════════════════════════════════════════
DROP FUNCTION IF EXISTS public.get_all_auth_users(uuid);
DROP FUNCTION IF EXISTS public.get_all_auth_users(text);

CREATE OR REPLACE FUNCTION public.get_all_auth_users(p_organization_id text DEFAULT NULL)
RETURNS TABLE (
    id uuid, email text, phone text, username text, role text, full_name text, 
    avatar_url text, organization_id text, 
    provider_type text, bvn_verified boolean, 
    display_id text, created_at timestamptz, last_sign_in_at timestamptz,
    organization_name text
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id, 
        au.email::text, 
        au.phone::text, 
        p.username, 
        p.role, 
        p.full_name, 
        p.image_uri as avatar_url, 
        p.organization_id,
        p.provider_type, 
        p.bvn_verified, 
        p.display_id, 
        COALESCE(au.created_at, p.created_at) as created_at, 
        au.last_sign_in_at,
        o.name as organization_name
    FROM public.profiles p
    LEFT JOIN auth.users au ON au.id = p.id
    LEFT JOIN public.organizations o ON p.organization_id = o.id
    WHERE (p_organization_id IS NULL OR p.organization_id = p_organization_id)
    ORDER BY p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_profile_by_admin(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_auth_users(text) TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
