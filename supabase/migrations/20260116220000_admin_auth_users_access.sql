-- Migration: Grant admin users access to auth.users table
-- Description: Allows users with admin role in profiles to fetch all auth.users data

-- Create a function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  );
$$;

-- Create a function for admins to get all auth users with profile data
CREATE OR REPLACE FUNCTION public.get_all_auth_users()
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
  profile_bvn_verified boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- This function will only return data if caller is admin
  -- The security check happens inside the function
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
    p.role as profile_role,
    p.username as profile_username,
    p.first_name as profile_first_name,
    p.last_name as profile_last_name,
    p.full_name as profile_full_name,
    p.provider_type as profile_provider_type,
    p.bvn_verified as profile_bvn_verified
  FROM auth.users au
  LEFT JOIN public.profiles p ON au.id = p.id
  WHERE EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_all_auth_users() TO authenticated;

-- Create a simpler function for admin check
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT public.is_admin();
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO authenticated;

-- Create a function to get user statistics
CREATE OR REPLACE FUNCTION public.get_user_statistics()
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
  patient_count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Only allow admins to execute this function
  WITH 
  user_stats AS (
    SELECT 
      COUNT(*) as total_users,
      COUNT(CASE WHEN email_confirmed_at IS NOT NULL THEN 1 END) as email_verified_users,
      COUNT(CASE WHEN phone_confirmed_at IS NOT NULL THEN 1 END) as phone_verified_users,
      COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as recent_signups
    FROM auth.users
    WHERE EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  ),
  profile_stats AS (
    SELECT 
      COUNT(*) as total_profiles,
      COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count,
      COUNT(CASE WHEN role = 'provider' THEN 1 END) as provider_count,
      COUNT(CASE WHEN role = 'sponsor' THEN 1 END) as sponsor_count,
      COUNT(CASE WHEN role = 'viewer' THEN 1 END) as viewer_count,
      COUNT(CASE WHEN role = 'patient' THEN 1 END) as patient_count
    FROM public.profiles
    WHERE EXISTS (
      SELECT 1 FROM public.profiles p2 
      WHERE p2.id = auth.uid() 
      AND p2.role = 'admin'
    )
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
    ps.patient_count
  FROM user_stats us, profile_stats ps
  WHERE EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_statistics() TO authenticated;

-- Create a function to search users
CREATE OR REPLACE FUNCTION public.search_auth_users(search_term text)
RETURNS TABLE (
  id uuid,
  email text,
  phone text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  email_confirmed_at timestamptz,
  profile_role text,
  profile_username text,
  profile_first_name text,
  profile_last_name text,
  profile_full_name text,
  profile_provider_type text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Only allow admins to execute this function
  SELECT 
    au.id,
    au.email,
    au.phone,
    au.created_at,
    au.last_sign_in_at,
    au.email_confirmed_at,
    p.role as profile_role,
    p.username as profile_username,
    p.first_name as profile_first_name,
    p.last_name as profile_last_name,
    p.full_name as profile_full_name,
    p.provider_type as profile_provider_type
  FROM auth.users au
  LEFT JOIN public.profiles p ON au.id = p.id
  WHERE EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
  AND (
    LOWER(au.email) LIKE LOWER('%' || search_term || '%') OR
    LOWER(p.username) LIKE LOWER('%' || search_term || '%') OR
    LOWER(p.first_name) LIKE LOWER('%' || search_term || '%') OR
    LOWER(p.last_name) LIKE LOWER('%' || search_term || '%') OR
    LOWER(p.full_name) LIKE LOWER('%' || search_term || '%')
  );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.search_auth_users(text) TO authenticated;
