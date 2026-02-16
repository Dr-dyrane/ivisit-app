-- Migration: Fix delete_user_by_admin to handle profile-only users
--
-- BUG: The function only deleted from auth.users. Users that exist only
-- in profiles (no auth.users entry) were silently "deleted" (0 rows affected)
-- but their profile remained. After reload, user was still there.
--
-- FIX: Delete from profiles first, then auth.users. Both are guarded
-- so missing rows don't cause errors.

DROP FUNCTION IF EXISTS public.delete_user_by_admin(uuid);

CREATE OR REPLACE FUNCTION public.delete_user_by_admin(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Check if the executing user is an Admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access Denied: Only Admins can delete users.';
  END IF;

  -- 2. Verify target user exists (in either table)
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = target_user_id
  ) AND NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id = target_user_id
  ) THEN
    RAISE EXCEPTION 'User not found: %', target_user_id;
  END IF;

  -- 3. Delete profile first (no FK cascade assumed)
  DELETE FROM public.profiles WHERE id = target_user_id;

  -- 4. Delete auth entry if it exists
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_by_admin(target_user_id uuid) TO authenticated;

COMMENT ON FUNCTION public.delete_user_by_admin(uuid) IS
'Deletes a user from both profiles and auth.users. Handles profile-only users (no auth entry) and auth-only users. Only admins can execute.';

NOTIFY pgrst, 'reload schema';
