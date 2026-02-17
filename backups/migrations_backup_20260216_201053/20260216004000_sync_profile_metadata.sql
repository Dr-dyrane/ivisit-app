-- ============================================================
-- Migration: SYNC PROFILE ROLES AND METADATA (FIXED)
-- ============================================================
-- 1. Updates handle_new_user() to sync human roles and names.
-- 2. Performs a one-time SYNC of all existing profiles.
-- 3. FIX: Removed provider_type sync (auth provider != medical provider).
-- ============================================================

BEGIN;

-- 1. Updated Function (Fixed)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name TEXT;
  v_first_name TEXT;
  v_last_name TEXT;
  v_role TEXT;
BEGIN
  v_full_name := NEW.raw_user_meta_data->>'full_name';
  v_role := COALESCE(NEW.raw_app_meta_data->>'role', 'patient');

  -- Ensure role is valid for the constraint
  IF v_role NOT IN ('patient', 'provider', 'admin') THEN
    v_role := 'patient';
  END IF;
  
  -- Name splitting
  IF v_full_name IS NOT NULL THEN
    v_first_name := split_part(v_full_name, ' ', 1);
    v_last_name := CASE 
      WHEN position(' ' in v_full_name) > 0 
      THEN substring(v_full_name from position(' ' in v_full_name) + 1)
      ELSE NULL 
    END;
  END IF;

  INSERT INTO public.profiles (
    id, 
    email, 
    phone, 
    full_name, 
    first_name, 
    last_name,
    avatar_url, 
    image_uri, 
    role, 
    created_at, 
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    v_full_name,
    v_first_name,
    v_last_name,
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'avatar_url',
    v_role,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
    first_name = COALESCE(profiles.first_name, EXCLUDED.first_name),
    last_name = COALESCE(profiles.last_name, EXCLUDED.last_name),
    role = COALESCE(profiles.role, EXCLUDED.role),
    updated_at = now();

  INSERT INTO public.preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 2. Run Sync for existing users
DO $$
DECLARE
  u RECORD;
  v_full_name TEXT;
  v_first_name TEXT;
  v_last_name TEXT;
  v_role TEXT;
BEGIN
  FOR u IN SELECT * FROM auth.users LOOP
    v_full_name := u.raw_user_meta_data->>'full_name';
    v_role := u.raw_app_meta_data->>'role';

    -- Validate role before update
    IF v_role NOT IN ('patient', 'provider', 'admin') THEN
      v_role := NULL;
    END IF;
    
    IF v_full_name IS NOT NULL THEN
      v_first_name := split_part(v_full_name, ' ', 1);
      v_last_name := CASE 
        WHEN position(' ' in v_full_name) > 0 
        THEN substring(v_full_name from position(' ' in v_full_name) + 1)
        ELSE NULL 
      END;
    END IF;

    UPDATE public.profiles
    SET 
      role = COALESCE(v_role, role, 'patient'),
      full_name = COALESCE(full_name, v_full_name),
      first_name = COALESCE(first_name, v_first_name),
      last_name = COALESCE(last_name, v_last_name),
      updated_at = now()
    WHERE id::text = u.id::text;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';

COMMIT;
