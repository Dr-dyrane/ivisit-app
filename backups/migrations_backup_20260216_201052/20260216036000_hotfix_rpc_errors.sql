-- Migration: Hotfix RPC Ambiguity and Overloading
-- Description: Resolves PGRST203 (overloading) and 42702 (ambiguity) errors

-- 1. Drop ALL versions of get_user_statistics to clear overloading
DROP FUNCTION IF EXISTS public.get_user_statistics();
DROP FUNCTION IF EXISTS public.get_user_statistics(uuid);

-- 2. Re-create get_user_statistics with qualified references
CREATE OR REPLACE FUNCTION public.get_user_statistics(p_organization_id uuid DEFAULT NULL)
RETURNS TABLE (
  total_users bigint,
  total_profiles bigint,
  recent_signups bigint,
  email_verified_users bigint,
  phone_verified_users bigint,
  admin_count bigint,
  provider_count bigint,
  sponsor_count bigint,
  viewer_count bigint,
  patient_count bigint,
  org_admin_count bigint,
  dispatcher_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    is_super_admin boolean;
    caller_org_id uuid;
BEGIN
    -- Quality references with table aliases to avoid 42702
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

    -- If not super admin, force their own org_id
    IF NOT is_super_admin THEN
        p_organization_id := caller_org_id;
    END IF;

    RETURN QUERY
    WITH 
    user_stats AS (
        SELECT 
            COUNT(*) as total_users,
            COUNT(CASE WHEN au.email_confirmed_at IS NOT NULL THEN 1 END) as email_verified_users,
            COUNT(CASE WHEN au.phone_confirmed_at IS NOT NULL THEN 1 END) as phone_verified_users,
            COUNT(CASE WHEN au.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as recent_signups
        FROM auth.users au
        JOIN public.profiles p ON au.id = p.id
        WHERE (p_organization_id IS NULL OR p.organization_id = p_organization_id)
    ),
    profile_stats AS (
        SELECT 
            COUNT(*) as total_profiles,
            COUNT(CASE WHEN p3.role = 'admin' THEN 1 END) as admin_count,
            COUNT(CASE WHEN p3.role = 'provider' THEN 1 END) as provider_count,
            COUNT(CASE WHEN p3.role = 'sponsor' THEN 1 END) as sponsor_count,
            COUNT(CASE WHEN p3.role = 'viewer' THEN 1 END) as viewer_count,
            COUNT(CASE WHEN p3.role = 'patient' THEN 1 END) as patient_count,
            COUNT(CASE WHEN p3.role = 'org_admin' THEN 1 END) as org_admin_count,
            COUNT(CASE WHEN p3.role = 'dispatcher' THEN 1 END) as dispatcher_count
        FROM public.profiles p3
        WHERE (p_organization_id IS NULL OR p3.organization_id = p_organization_id)
    )
    SELECT 
        us.total_users,
        ps.total_profiles,
        us.recent_signups,
        us.email_verified_users,
        us.phone_verified_users,
        ps.admin_count,
        ps.provider_count,
        ps.sponsor_count,
        ps.viewer_count,
        ps.patient_count,
        ps.org_admin_count,
        ps.dispatcher_count
    FROM user_stats us, profile_stats ps;
END;
$$;

-- 3. Drop ALL versions of get_all_auth_users
DROP FUNCTION IF EXISTS public.get_all_auth_users();
DROP FUNCTION IF EXISTS public.get_all_auth_users(uuid);

-- 4. Re-create get_all_auth_users with qualified references
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
    -- Qualify references
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
        au.email,
        au.phone,
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

-- 5. Grant permissions back
GRANT EXECUTE ON FUNCTION public.get_user_statistics(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_auth_users(uuid) TO authenticated;

-- Force reload
NOTIFY pgrst, 'reload schema';
