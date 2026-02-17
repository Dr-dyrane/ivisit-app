-- Migration: Fix get_user_statistics JOIN Direction
-- Same issue as get_all_auth_users: INNER JOIN dropped profiles without auth entries
-- FIX: Use profiles LEFT JOIN auth.users for accurate counts

DROP FUNCTION IF EXISTS public.get_user_statistics(uuid);

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
        RAISE EXCEPTION 'Access denied: Invalid role for statistics access';
    END IF;

    -- Determine effective organization filter based on role
    IF caller_role = 'admin' THEN
        effective_org_filter := p_organization_id;
    ELSIF caller_role IN ('org_admin', 'dispatcher') THEN
        effective_org_filter := caller_org_id;
    ELSE
        effective_org_filter := caller_org_id;
    END IF;

    -- Return statistics based on effective filter
    -- KEY FIX: profiles LEFT JOIN auth.users (not inner join)
    RETURN QUERY
    WITH 
    user_stats AS (
        SELECT 
            COUNT(*) as total_users,
            COUNT(CASE WHEN au.email_confirmed_at IS NOT NULL THEN 1 END) as email_verified_users,
            COUNT(CASE WHEN au.phone_confirmed_at IS NOT NULL THEN 1 END) as phone_verified_users,
            COUNT(CASE WHEN p.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as recent_signups
        FROM public.profiles p
        LEFT JOIN auth.users au ON au.id = p.id
        WHERE (effective_org_filter IS NULL OR p.organization_id = effective_org_filter)
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
        WHERE (effective_org_filter IS NULL OR p3.organization_id = effective_org_filter)
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

GRANT EXECUTE ON FUNCTION public.get_user_statistics(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_user_statistics(uuid) IS 
'Returns user statistics using profiles LEFT JOIN auth.users for accurate counts across all profiles.';

NOTIFY pgrst, 'reload schema';
