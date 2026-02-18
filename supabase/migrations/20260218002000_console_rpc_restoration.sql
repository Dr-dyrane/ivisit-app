-- Migration: Master Console & Admin RPC Restoration
-- Author: Antigravity
-- Date: 2026-02-18
-- Description: Restores critical RPC functions required by the iVisit Console and Admin dashboard.
-- Targets: User management, statistics, and administrative controls.

BEGIN;

-- ═══════════════════════════════════════════════════════════
-- 1. UTILITY FUNCTIONS
-- ═══════════════════════════════════════════════════════════

-- Check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id::text = auth.uid()::text AND role = 'admin');
$$;

-- Alias for frontend compatibility
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin();
$$;

-- ═══════════════════════════════════════════════════════════
-- 2. USER MANAGEMENT RPCs
-- ═══════════════════════════════════════════════════════════

-- Get all auth users with profile data (Admin only)
-- Scoped by organization_id (TEXT-compatible)
DROP FUNCTION IF EXISTS public.get_all_auth_users(uuid);
DROP FUNCTION IF EXISTS public.get_all_auth_users(text);

CREATE OR REPLACE FUNCTION public.get_all_auth_users(p_organization_id text DEFAULT NULL)
RETURNS TABLE (
    id uuid, email text, phone text, username text, role text, full_name text, 
    avatar_url text, organization_id text, provider_type text, bvn_verified boolean, 
    display_id text, created_at timestamptz, last_sign_in_at timestamptz,
    organization_name text
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        au.id, 
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
        au.created_at, 
        au.last_sign_in_at,
        o.name as organization_name
    FROM auth.users au
    LEFT JOIN public.profiles p ON au.id = p.id
    LEFT JOIN public.organizations o ON p.organization_id = o.id
    WHERE (p_organization_id IS NULL OR 
           p_organization_id = '' OR 
           p.organization_id = p_organization_id)
    ORDER BY au.created_at DESC;
END;
$$;

-- Search auth users (Admin only)
DROP FUNCTION IF EXISTS public.search_auth_users(text);

CREATE OR REPLACE FUNCTION public.search_auth_users(search_term text)
RETURNS TABLE (
    id uuid, email text, phone text, created_at timestamptz, last_sign_in_at timestamptz,
    email_confirmed_at timestamptz, profile_role text, profile_username text, 
    profile_first_name text, profile_last_name text, profile_full_name text, 
    profile_provider_type text
) LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT 
    au.id, au.email::text, au.phone::text, au.created_at, au.last_sign_in_at, au.email_confirmed_at,
    p.role as profile_role, p.username as profile_username, p.first_name as profile_first_name,
    p.last_name as profile_last_name, p.full_name as profile_full_name, p.provider_type as profile_provider_type
  FROM auth.users au
  LEFT JOIN public.profiles p ON au.id = p.id
  WHERE (
    LOWER(au.email) LIKE LOWER('%' || search_term || '%') OR
    LOWER(p.username) LIKE LOWER('%' || search_term || '%') OR
    LOWER(p.full_name) LIKE LOWER('%' || search_term || '%')
  );
$$;

-- ═══════════════════════════════════════════════════════════
-- 3. STATISTICS & ANALYTICS
-- ═══════════════════════════════════════════════════════════

-- Get user statistics (Admin only)
DROP FUNCTION IF EXISTS public.get_user_statistics(uuid);
DROP FUNCTION IF EXISTS public.get_user_statistics(text);

CREATE OR REPLACE FUNCTION public.get_user_statistics(p_organization_id text DEFAULT NULL)
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
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
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
        WHERE (p_organization_id IS NULL OR p_organization_id = '' OR p.organization_id = p_organization_id)
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
        WHERE (p_organization_id IS NULL OR p_organization_id = '' OR p_organization_id = p3.organization_id)
    )
    SELECT 
        us.total_users, ps.total_profiles, us.recent_signups, us.email_verified_users, 
        us.phone_verified_users, ps.admin_count, ps.provider_count, ps.sponsor_count, 
        ps.viewer_count, ps.patient_count, ps.org_admin_count, ps.dispatcher_count
    FROM user_stats us, profile_stats ps;
END;
$$;

-- ═══════════════════════════════════════════════════════════
-- 4. ADMINISTRATIVE CONTROLS
-- ═══════════════════════════════════════════════════════════

-- Delete user (Admin only)
CREATE OR REPLACE FUNCTION public.delete_user_by_admin(target_user_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access Denied: Only platform admins can delete users.';
    END IF;
    DELETE FROM auth.users WHERE id::text = target_user_id;
END;
$$;

-- Update profile (Admin/Org Admin only)
CREATE OR REPLACE FUNCTION public.update_profile_by_admin(target_user_id text, profile_data jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result jsonb;
BEGIN
    IF NOT (public.get_current_user_role() IN ('admin', 'org_admin')) THEN
        RAISE EXCEPTION 'Access Denied: Insufficient permissions to update other users.';
    END IF;

    UPDATE public.profiles
    SET 
        username = COALESCE(profile_data->>'username', username),
        role = COALESCE(profile_data->>'role', role),
        organization_id = CASE WHEN profile_data ? 'organization_id' THEN (profile_data->>'organization_id')::text ELSE organization_id END,
        full_name = COALESCE(profile_data->>'full_name', full_name),
        provider_type = COALESCE(profile_data->>'provider_type', provider_type),
        bvn_verified = COALESCE((profile_data->>'bvn_verified')::boolean, bvn_verified),
        updated_at = now()
    WHERE id::text = target_user_id
    RETURNING to_jsonb(profiles) INTO result;

    RETURN result;
END;
$$;

-- ═══════════════════════════════════════════════════════════
-- 5. GRANTS & CLEANUP
-- ═══════════════════════════════════════════════════════════

GRANT EXECUTE ON FUNCTION public.get_all_auth_users(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_auth_users(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_statistics(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_by_admin(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_profile_by_admin(text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

COMMIT;

-- Reload PGRST cache
NOTIFY pgrst, 'reload schema';
