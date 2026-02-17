-- Migration: Fix Doctor Hospital Mapping & Org Admin Permissions
--
-- 1. Fix Doctor/Ambulance Sync:
--    The `sync_provider_records` trigger was inserting `organization_id` into `hospital_id` columns.
--    This failed because `organization_id` (Org UUID) is not a valid `hospital_id` (Hospital UUID).
--    FIX: Look up the valid `hospital_id` associated with the profile's `organization_id`.
--
-- 2. Fix Admin Access:
--    `update_profile_by_admin` RPC only allowed global 'admin' role.
--    FIX: Allow 'org_admin' role IF the target user belongs to the same organization.

-- Part 1: Update sync_provider_records Trigger Function
CREATE OR REPLACE FUNCTION public.sync_provider_records()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    found_hospital_id uuid;
BEGIN
    -- Only act if role is provider and provider_type is set
    IF NEW.role = 'provider' AND NEW.provider_type IS NOT NULL THEN
        
        -- Attempt to resolve a valid hospital_id from the organization
        BEGIN
            SELECT id INTO found_hospital_id 
            FROM public.hospitals 
            WHERE organization_id = NEW.organization_id 
            LIMIT 1;
        EXCEPTION WHEN OTHERS THEN
            found_hospital_id := NULL;
        END;

        -- Handle Doctors
        IF LOWER(NEW.provider_type) = 'doctor' THEN
            INSERT INTO public.doctors (
                profile_id,
                name,
                email,
                phone,
                hospital_id,
                status,
                specialization,
                updated_at
            ) VALUES (
                NEW.id,
                COALESCE(NEW.full_name, NEW.username),
                NEW.email,
                NEW.phone,
                found_hospital_id, -- Use resolved hospital_id
                'available',
                'General Practice',
                now()
            )
            ON CONFLICT (profile_id) DO UPDATE SET
                name = EXCLUDED.name,
                email = EXCLUDED.email,
                phone = EXCLUDED.phone,
                hospital_id = EXCLUDED.hospital_id,
                updated_at = now();
        
        -- Handle Ambulances
        ELSIF LOWER(NEW.provider_type) = 'ambulance' THEN
            INSERT INTO public.ambulances (
                profile_id,
                call_sign,
                hospital_id,
                status,
                type,
                updated_at
            ) VALUES (
                NEW.id,
                NEW.username,
                found_hospital_id, -- Use resolved hospital_id
                'available',
                'Basic',
                now()
            )
            ON CONFLICT (profile_id) DO UPDATE SET
                call_sign = EXCLUDED.call_sign,
                hospital_id = EXCLUDED.hospital_id,
                updated_at = now();
        END IF;
        
    END IF;
    
    RETURN NEW;
END;
$$;

-- Part 2: Update update_profile_by_admin RPC to allow Org Admins
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
  caller_role text;
  caller_org_id uuid;
  current_org_id uuid;
  new_org_id uuid;
  target_current_org_id uuid;
  allowed_keys text[] := ARRAY[
    'email', 'phone', 'username', 'first_name', 'last_name', 'full_name',
    'image_uri', 'role', 'organization_id', 'provider_type',
    'bvn_verified', 'address', 'gender', 'date_of_birth', 'updated_at'
  ];
  filtered_data jsonb := '{}';
  k text;
BEGIN
  -- 1. Get Caller Info
  SELECT role, organization_id INTO caller_role, caller_org_id
  FROM public.profiles
  WHERE id = auth.uid();

  -- 2. Verify Caller Permissions
  IF caller_role = 'admin' THEN
      -- Global admin: allowed to access everything
      NULL;
  ELSIF caller_role = 'org_admin' THEN
      -- Org Admin: Verify target belongs to same org OR is being assigned to same org
      -- We need target's current org to verify ownership
      SELECT organization_id INTO target_current_org_id
      FROM public.profiles WHERE id = target_user_id;
      
      -- Check if target is already in another org (and not null)
      IF target_current_org_id IS NOT NULL AND target_current_org_id != caller_org_id THEN
         RAISE EXCEPTION 'Access Denied: You cannot update users from other organizations.';
      END IF;
      
      -- We also enforce that they can only assign the user to THEIR OWN org
      -- This logic happens in step 4
  ELSE
    RAISE EXCEPTION 'Access Denied: Only Admins can update other users profiles.';
  END IF;

  -- 3. Verify target profile exists and get current inputs
  SELECT organization_id INTO current_org_id
  FROM public.profiles WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found: %', target_user_id;
  END IF;

  -- 4. Whitelist fields and Validate Org Logic
  FOR k IN SELECT jsonb_object_keys(profile_data)
  LOOP
    IF k = ANY(allowed_keys) THEN
      filtered_data := filtered_data || jsonb_build_object(k, profile_data->k);
    END IF;
  END LOOP;

  -- Organization ID Logic
  IF filtered_data ? 'organization_id' THEN
    new_org_id := NULLIF(filtered_data->>'organization_id', '')::uuid;
    
    -- Restriction for Org Admins: Can only assign to their own org
    IF caller_role = 'org_admin' AND new_org_id IS DISTINCT FROM caller_org_id THEN
       RAISE EXCEPTION 'Access Denied: access to other organizations is forbidden.';
    END IF;

    -- Avoid FK re-validation on orphaned references if unchanged
    IF new_org_id IS NOT DISTINCT FROM current_org_id THEN
      filtered_data := filtered_data - 'organization_id';
    END IF;
  ELSE
    -- If org_admin creates/updates a user and doesn't specify org, force it to their org? 
    -- Or leave as is? Leaving as is for updates is safer.
    NULL; 
  END IF;

  -- 5. Perform the update
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
