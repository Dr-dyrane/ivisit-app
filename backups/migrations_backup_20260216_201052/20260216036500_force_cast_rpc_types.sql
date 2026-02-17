-- Migration: Force Cast RPC Types
-- Description: Resolves 42804 (Type Mismatch) by explicitly casting au.email and au.phone to text

-- 1. Drop and Re-create get_all_auth_users with explicit casts
DROP FUNCTION IF EXISTS public.get_all_auth_users(uuid);

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
    is_super_admin boolean;
    caller_org_id uuid;
BEGIN
    -- Check permissions
    SELECT (p.role = 'admin'), p.organization_id 
    INTO is_super_admin, caller_org_id
    FROM public.profiles p
    WHERE p.id = auth.uid();

    IF NOT is_super_admin AND NOT EXISTS (
        SELECT 1 FROM public.profiles p2
        WHERE p2.id = auth.uid() AND p2.role IN ('org_admin', 'dispatcher')
    ) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    -- Force org scoping if not super admin
    IF NOT is_super_admin THEN
        p_organization_id := caller_org_id;
    END IF;

    RETURN QUERY
    SELECT 
        au.id,
        au.email::text, -- FORCE CAST TO TEXT (Column 2)
        au.phone::text, -- FORCE CAST TO TEXT (Column 3)
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
    WHERE (p_organization_id IS NULL OR p3.organization_id = p_organization_id);
END;
$$;

-- 2. Ensure permissions are correct
GRANT EXECUTE ON FUNCTION public.get_all_auth_users(uuid) TO authenticated;

-- Force reload
NOTIFY pgrst, 'reload schema';
