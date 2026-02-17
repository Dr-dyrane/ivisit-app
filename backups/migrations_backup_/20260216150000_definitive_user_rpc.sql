-- Migration: Definitive User Management RPC
-- Description: Consolidates all iterations of get_all_auth_users into a single, robust function.
-- Drops all possible param variations to avoid conflicts.

DROP FUNCTION IF EXISTS public.get_all_auth_users();
DROP FUNCTION IF EXISTS public.get_all_auth_users(UUID);
DROP FUNCTION IF EXISTS public.get_all_auth_users(uuid, text);

CREATE OR REPLACE FUNCTION public.get_all_auth_users(p_organization_id UUID DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    email TEXT,
    phone TEXT,
    username TEXT,
    role TEXT,
    first_name TEXT,
    last_name TEXT,
    full_name TEXT,
    image_uri TEXT,
    avatar_url TEXT,
    organization_id UUID,
    provider_type TEXT,
    bvn_verified BOOLEAN,
    display_id TEXT,
    created_at TIMESTAMPTZ,
    last_sign_in_at TIMESTAMPTZ,
    -- Compatibility fields for older service mappings
    profile_role TEXT,
    profile_username TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        au.id,
        au.email::TEXT,
        au.phone::TEXT,
        p.username,
        p.role,
        p.first_name,
        p.last_name,
        p.full_name,
        p.image_uri,
        p.image_uri as avatar_url,
        COALESCE(p.organization_id, h.organization_id) as organization_id,
        p.provider_type,
        p.bvn_verified,
        p.display_id,
        au.created_at,
        au.last_sign_in_at,
        -- Set compatibility fields
        p.role as profile_role,
        p.username as profile_username
    FROM auth.users au
    LEFT JOIN public.profiles p ON au.id = p.id
    LEFT JOIN public.hospitals h ON p.id = h.org_admin_id
    WHERE 
        (p_organization_id IS NULL OR 
         p.organization_id = p_organization_id OR 
         h.organization_id = p_organization_id)
    ORDER BY au.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_auth_users(UUID) TO authenticated;
NOTIFY pgrst, 'reload schema';
