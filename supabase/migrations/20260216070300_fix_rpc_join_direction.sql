-- Migration: Fix get_all_auth_users JOIN Direction
-- 
-- ROOT CAUSE: The function used `auth.users JOIN profiles` (INNER JOIN),
-- which only returned users that exist in BOTH tables. Profiles created
-- without corresponding auth.users entries (e.g., manual inserts, OAuth 
-- users with stale auth, seed data) were invisible — 5 users instead of 17.
--
-- FIX: Reverse to `profiles LEFT JOIN auth.users` so ALL profiles show up,
-- enriched with auth metadata where available.

-- Drop existing function
DROP FUNCTION IF EXISTS public.get_all_auth_users(uuid);

-- Recreate with profiles-first LEFT JOIN
CREATE OR REPLACE FUNCTION public.get_all_auth_users(p_organization_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  email text,
  phone text,
  created_at timestamptz,
  updated_at timestamptz,
  last_sign_in_at timestamptz,
  email_confirmed_at timestamptz,
  phone_confirmed_at timestamptz,
  banned_until timestamptz,
  profile_role text,
  profile_username text,
  profile_first_name text,
  profile_last_name text,
  profile_full_name text,
  profile_provider_type text,
  profile_bvn_verified boolean,
  profile_display_id text,
  organization_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_role text;
    caller_org_id uuid;
    effective_org_filter uuid;
BEGIN
    -- Get caller's role and organization
    SELECT p.role, p.organization_id 
    INTO caller_role, caller_org_id
    FROM public.profiles p
    WHERE p.id = auth.uid();

    -- Check if caller has admin privileges
    IF caller_role NOT IN ('admin', 'org_admin', 'dispatcher') THEN
        RAISE EXCEPTION 'Access denied: Invalid role for user management';
    END IF;

    -- Determine effective organization filter based on role
    IF caller_role = 'admin' THEN
        -- Super admin: use the provided filter (null = all users)
        effective_org_filter := p_organization_id;
    ELSIF caller_role IN ('org_admin', 'dispatcher') THEN
        -- Org-scoped roles: always filter by their own organization
        effective_org_filter := caller_org_id;
    ELSE
        effective_org_filter := caller_org_id;
    END IF;

    -- Return ALL profiles, enriched with auth data where available
    -- KEY FIX: profiles LEFT JOIN auth.users (not the other way around)
    RETURN QUERY
    SELECT 
        p3.id,
        COALESCE(au.email::text, p3.email::text) as email,
        COALESCE(au.phone::text, p3.phone::text) as phone,
        COALESCE(au.created_at, p3.created_at) as created_at,
        COALESCE(au.updated_at, p3.updated_at) as updated_at,
        au.last_sign_in_at,
        au.email_confirmed_at,
        au.phone_confirmed_at,
        au.banned_until,
        p3.role::text as profile_role,
        p3.username as profile_username,
        p3.first_name as profile_first_name,
        p3.last_name as profile_last_name,
        p3.full_name as profile_full_name,
        p3.provider_type as profile_provider_type,
        p3.bvn_verified as profile_bvn_verified,
        p3.display_id as profile_display_id,
        p3.organization_id
    FROM public.profiles p3
    LEFT JOIN auth.users au ON au.id = p3.id
    WHERE (effective_org_filter IS NULL OR p3.organization_id = effective_org_filter)
    ORDER BY p3.created_at DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_all_auth_users(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_all_auth_users(uuid) IS 
'Returns all profiles enriched with auth data. Uses profiles LEFT JOIN auth.users so no profiles are lost. Super admins see all; org admins/dispatchers see only their organization.';

-- Force PostgREST to reload
NOTIFY pgrst, 'reload schema';
