-- Migration: Fix update_profile_by_admin FK re-validation issue
--
-- PostgreSQL re-validates FK constraints on UPDATE SET even when the
-- value hasn't changed. If a profile has an orphaned organization_id
-- (org was deleted or the ID is actually a hospital ID), every UPDATE
-- that touches organization_id triggers error 23503.
--
-- FIX: Only SET organization_id when the new value differs from current.
-- Also: skip empty-string fields (frontend sends '' for untouched fields).

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
  current_org_id uuid;
  new_org_id uuid;
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

  -- 2. Verify target profile exists and get current org_id
  SELECT organization_id INTO current_org_id
  FROM public.profiles WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found: %', target_user_id;
  END IF;

  -- 3. Whitelist fields (prevent injecting arbitrary columns)
  FOR k IN SELECT jsonb_object_keys(profile_data)
  LOOP
    IF k = ANY(allowed_keys) THEN
      filtered_data := filtered_data || jsonb_build_object(k, profile_data->k);
    END IF;
  END LOOP;

  -- 4. Resolve organization_id: only update if actually changing
  IF filtered_data ? 'organization_id' THEN
    new_org_id := NULLIF(filtered_data->>'organization_id', '')::uuid;
    -- If the new value equals the current value, remove it from the update
    -- to avoid FK re-validation on orphaned references
    IF new_org_id IS NOT DISTINCT FROM current_org_id THEN
      filtered_data := filtered_data - 'organization_id';
    END IF;
  END IF;

  -- 5. Perform the update (only changed fields affect FK constraints)
  UPDATE public.profiles
  SET
    email = COALESCE(NULLIF(filtered_data->>'email', ''), email),
    phone = CASE
      WHEN filtered_data ? 'phone' THEN NULLIF(filtered_data->>'phone', '')
      ELSE phone
    END,
    username = COALESCE(NULLIF(filtered_data->>'username', ''), username),
    first_name = COALESCE(NULLIF(filtered_data->>'first_name', ''), first_name),
    last_name = COALESCE(NULLIF(filtered_data->>'last_name', ''), last_name),
    full_name = COALESCE(NULLIF(filtered_data->>'full_name', ''), full_name),
    image_uri = COALESCE(NULLIF(filtered_data->>'image_uri', ''), image_uri),
    role = COALESCE(NULLIF(filtered_data->>'role', ''), role),
    organization_id = CASE
      WHEN filtered_data ? 'organization_id' THEN
        NULLIF(filtered_data->>'organization_id', '')::uuid
      ELSE organization_id
    END,
    provider_type = COALESCE(NULLIF(filtered_data->>'provider_type', ''), provider_type),
    bvn_verified = CASE
      WHEN filtered_data ? 'bvn_verified' THEN (filtered_data->>'bvn_verified')::boolean
      ELSE bvn_verified
    END,
    address = CASE
      WHEN filtered_data ? 'address' THEN filtered_data->>'address'
      ELSE address
    END,
    gender = CASE
      WHEN filtered_data ? 'gender' THEN filtered_data->>'gender'
      ELSE gender
    END,
    date_of_birth = CASE
      WHEN filtered_data ? 'date_of_birth' THEN filtered_data->>'date_of_birth'
      ELSE date_of_birth
    END,
    updated_at = now()
  WHERE id = target_user_id;

  -- 6. Return the updated profile
  SELECT to_jsonb(p) INTO result
  FROM public.profiles p
  WHERE p.id = target_user_id;

  RETURN result;
END;
$$;

NOTIFY pgrst, 'reload schema';
