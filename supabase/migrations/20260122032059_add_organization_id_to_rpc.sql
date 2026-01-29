-- Migration: Add organization_id to get_all_auth_users RPC
-- Description: Updates the get_all_auth_users function to include profile_organization_id

-- DROP FUNCTION FIRST because generic return type signature changed
DROP FUNCTION IF EXISTS public.get_all_auth_users();

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
  profile_bvn_verified boolean,
  profile_organization_id uuid  -- Added field
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
    p.bvn_verified as profile_bvn_verified,
    p.organization_id as profile_organization_id -- Added selection
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
