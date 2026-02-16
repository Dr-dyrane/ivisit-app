-- Migration: Force Refresh of User Management RPC and Permissions
-- Description: Explicitly drops and recreates get_all_auth_users to ensure SECURITY DEFINER and LEFT JOIN logic is active.
--             Also ensures correct table permissions for the join.

BEGIN;

-- 1. Drop existing functions to allow clean recreation
DROP FUNCTION IF EXISTS public.get_all_auth_users();
DROP FUNCTION IF EXISTS public.get_all_auth_users(UUID);
DROP FUNCTION IF EXISTS public.get_all_auth_users(uuid, text);

-- 2. Recreate the Definitive RPC
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
    organization_name TEXT,
    provider_type TEXT,
    bvn_verified BOOLEAN,
    display_id TEXT,
    created_at TIMESTAMPTZ,
    last_sign_in_at TIMESTAMPTZ,
    -- Compatibility fields
    profile_role TEXT,
    profile_username TEXT,
    profile_first_name TEXT,
    profile_last_name TEXT,
    profile_full_name TEXT,
    profile_image_uri TEXT,
    profile_avatar_url TEXT,
    profile_organization_id UUID,
    profile_organization_name TEXT,
    profile_provider_type TEXT,
    profile_bvn_verified BOOLEAN,
    profile_display_id TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER -- CRITICAL: Runs with creator's permissions to bypassing RLS on allowed tables
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
        o.name as organization_name,
        p.provider_type,
        p.bvn_verified,
        p.display_id,
        au.created_at,
        au.last_sign_in_at,
        -- Compatibility mappings (duplicating for frontend safety)
        p.role as profile_role,
        p.username as profile_username,
        p.first_name as profile_first_name,
        p.last_name as profile_last_name,
        p.full_name as profile_full_name,
        p.image_uri as profile_image_uri,
        p.image_uri as profile_avatar_url,
        COALESCE(p.organization_id, h.organization_id) as profile_organization_id,
        o.name as profile_organization_name,
        p.provider_type as profile_provider_type,
        p.bvn_verified as profile_bvn_verified,
        p.display_id as profile_display_id
    FROM auth.users au
    LEFT JOIN public.profiles p ON au.id = p.id
    LEFT JOIN public.hospitals h ON p.id = h.org_admin_id
    LEFT JOIN public.organizations o ON (p.organization_id = o.id OR h.organization_id = o.id)
    WHERE 
        (p_organization_id IS NULL OR 
         p.organization_id = p_organization_id OR 
         h.organization_id = p_organization_id)
    ORDER BY au.created_at DESC;
END;
$$;

-- 3. Explicitly Grant Permissions
GRANT EXECUTE ON FUNCTION public.get_all_auth_users(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_auth_users(UUID) TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
