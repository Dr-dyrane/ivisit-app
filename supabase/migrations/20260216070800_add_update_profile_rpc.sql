-- Migration: Add update_profile_by_admin RPC
--
-- ROOT CAUSE (same as delete): The FOR UPDATE RLS policy
--   "Admins can update any profile" USING (get_current_user_role() = 'admin')
-- silently excludes the target row from the UPDATE scope.
-- The PATCH returns 200 with 0 rows, and .single() throws PGRST116.
--
-- FIX: SECURITY DEFINER RPC bypasses RLS and checks admin role explicitly.

CREATE OR REPLACE FUNCTION public.update_profile_by_admin(
  target_user_id uuid,
  profile_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  allowed_keys text[] := ARRAY[
    'email', 'phone', 'username', 'first_name', 'last_name', 'full_name',
    'image_uri', 'role', 'organization_id', 'provider_type',
    'bvn_verified', 'address', 'gender', 'date_of_birth', 'updated_at'
  ];
  filtered_data jsonb := '{}';
  k text;
BEGIN
  -- 1. Verify caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access Denied: Only Admins can update other users profiles.';
  END IF;

  -- 2. Verify target profile exists
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = target_user_id
  ) THEN
    RAISE EXCEPTION 'Profile not found: %', target_user_id;
  END IF;

  -- 3. Whitelist fields (prevent injecting arbitrary columns)
  FOR k IN SELECT jsonb_object_keys(profile_data)
  LOOP
    IF k = ANY(allowed_keys) THEN
      filtered_data := filtered_data || jsonb_build_object(k, profile_data->k);
    END IF;
  END LOOP;

  -- 4. Always set updated_at
  filtered_data := filtered_data || jsonb_build_object('updated_at', now());

  -- 5. Perform the update using dynamic SQL with whitelisted fields
  UPDATE public.profiles
  SET
    email = COALESCE((filtered_data->>'email'), email),
    phone = COALESCE((filtered_data->>'phone'), phone),
    username = COALESCE((filtered_data->>'username'), username),
    first_name = COALESCE((filtered_data->>'first_name'), first_name),
    last_name = COALESCE((filtered_data->>'last_name'), last_name),
    full_name = COALESCE((filtered_data->>'full_name'), full_name),
    image_uri = COALESCE((filtered_data->>'image_uri'), image_uri),
    role = COALESCE((filtered_data->>'role'), role),
    organization_id = CASE
      WHEN filtered_data ? 'organization_id' THEN
        NULLIF(filtered_data->>'organization_id', '')::uuid
      ELSE organization_id
    END,
    provider_type = COALESCE((filtered_data->>'provider_type'), provider_type),
    bvn_verified = CASE
      WHEN filtered_data ? 'bvn_verified' THEN (filtered_data->>'bvn_verified')::boolean
      ELSE bvn_verified
    END,
    address = COALESCE((filtered_data->>'address'), address),
    gender = COALESCE((filtered_data->>'gender'), gender),
    date_of_birth = COALESCE((filtered_data->>'date_of_birth'), date_of_birth),
    updated_at = now()
  WHERE id = target_user_id;

  -- 6. Return the updated profile
  SELECT to_jsonb(p) INTO result
  FROM public.profiles p
  WHERE p.id = target_user_id;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_profile_by_admin(uuid, jsonb) TO authenticated;

COMMENT ON FUNCTION public.update_profile_by_admin(uuid, jsonb) IS
'Updates a user profile with whitelisted fields. SECURITY DEFINER bypasses RLS.
Only admins can execute. Same root cause fix as delete_user_by_admin.';

NOTIFY pgrst, 'reload schema';
