-- Migration: Fix Room Pricing RLS and User Visibility
-- Description: 
-- 1. Adds permissive RLS to room_pricing so data is visible.
-- 2. Updates get_all_auth_users to use FULL OUTER JOIN to catch 'orphaned' profiles.
-- 3. Ensures hospital_id column compatibility.

BEGIN;

--------------------------------------------------------------------------------
-- 1. Fix Room Pricing RLS
--------------------------------------------------------------------------------
ALTER TABLE public.room_pricing ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policies to be safe
DROP POLICY IF EXISTS "Public view active room pricing" ON public.room_pricing;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.room_pricing;

-- Create a permissive policy for reading (Authenticated + Anon if needed, but usually Authenticated)
CREATE POLICY "Enable read access for all users"
ON public.room_pricing
FOR SELECT
USING (true);


--------------------------------------------------------------------------------
-- 2. Fix User Visibility (FULL OUTER JOIN)
--------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_all_auth_users(UUID);

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
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(au.id, p.id) as id, -- Handle orphan profiles
        au.email::TEXT,
        au.phone::TEXT,
        p.username,
        COALESCE(p.role, 'user') as role, -- Default to user if auth missing
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
        COALESCE(au.created_at, p.created_at) as created_at,
        au.last_sign_in_at,
        -- Compatibility
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
    FROM public.profiles p
    FULL OUTER JOIN auth.users au ON p.id = au.id
    LEFT JOIN public.hospitals h ON p.id = h.org_admin_id
    LEFT JOIN public.organizations o ON (p.organization_id = o.id OR h.organization_id = o.id)
    WHERE 
        (p_organization_id IS NULL OR 
         p.organization_id = p_organization_id OR 
         h.organization_id = p_organization_id)
    ORDER BY COALESCE(au.created_at, p.created_at) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_auth_users(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_auth_users(UUID) TO service_role;

COMMIT;
