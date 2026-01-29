-- Migration: JWT Role Synchronization for Performance
-- Description: Sync profile roles to auth.users app_metadata for fast JWT role checks

-- Function to sync profile role to auth.users app_metadata
CREATE OR REPLACE FUNCTION public.sync_profile_role_to_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = 
    CASE 
      WHEN raw_app_meta_data IS NULL THEN jsonb_build_object('role', NEW.role)
      ELSE raw_app_meta_data || jsonb_build_object('role', NEW.role)
    END
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

-- Create trigger for automatic role sync
DROP TRIGGER IF EXISTS on_profile_role_sync ON public.profiles;
CREATE TRIGGER on_profile_role_sync
  AFTER INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_role_to_auth();

-- Enhanced admin function with JWT optimization
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check JWT claim first (fastest, no recursion)
  IF (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' THEN
    RETURN TRUE;
  END IF;

  -- Fallback to database check
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  );
END;
$$;

-- Enhanced role checking function for future multi-role support
CREATE OR REPLACE FUNCTION public.has_role(required_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check JWT claim first (fastest)
  IF (auth.jwt() -> 'app_metadata' ->> 'role') = required_role THEN
    RETURN TRUE;
  END IF;

  -- Fallback to database check
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = required_role
  );
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(text) TO authenticated;

-- Backfill existing roles to auth.users
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id, role FROM public.profiles LOOP
    UPDATE auth.users
    SET raw_app_meta_data = 
      CASE 
        WHEN raw_app_meta_data IS NULL THEN jsonb_build_object('role', r.role)
        ELSE raw_app_meta_data || jsonb_build_object('role', r.role)
      END
    WHERE id = r.id;
  END LOOP;
END;
$$;

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';
