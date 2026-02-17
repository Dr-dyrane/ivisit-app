-- Migration: Fix Admin Organization Filtering
-- Description: Remove organization filtering for super admins in get_all_auth_users
-- Issue: Super admins were incorrectly being filtered by organization_id
-- Fix: Only apply org filtering to org_admin and dispatcher roles

-- Drop existing function
DROP FUNCTION IF EXISTS public.get_all_auth_users(uuid);

-- Recreate with correct admin-first logic
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
    -- CRITICAL FIX: Super admins are NOT filtered by organization
    IF caller_role = 'admin' THEN
        -- Super admin: use the provided filter (null = all users, specific uuid = filtered)
        -- This allows admin to optionally filter by org if they want
        effective_org_filter := p_organization_id;
    ELSIF caller_role IN ('org_admin', 'dispatcher') THEN
        -- Org-scoped roles: always filter by their own organization
        -- Ignore any provided p_organization_id parameter
        effective_org_filter := caller_org_id;
    ELSE
        -- Fallback: filter by their organization
        effective_org_filter := caller_org_id;
    END IF;

    -- Return users based on effective filter
    RETURN QUERY
    SELECT 
        au.id,
        au.email::text,
        au.phone::text,
        au.created_at,
        au.updated_at,
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
    FROM auth.users au
    JOIN public.profiles p3 ON au.id = p3.id
    WHERE (effective_org_filter IS NULL OR p3.organization_id = effective_org_filter);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_all_auth_users(uuid) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION public.get_all_auth_users(uuid) IS 
'Returns all auth users with profile data. Super admins see all users (no org filter). Org admins and dispatchers see only their organization users.';

-- Force schema reload
NOTIFY pgrst, 'reload schema';
