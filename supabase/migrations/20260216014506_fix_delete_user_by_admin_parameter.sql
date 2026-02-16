-- Fix delete_user_by_admin RPC function parameter name
-- Change from 'user_id' to 'target_user_id' to match API calls

-- Drop and recreate the function with correct parameter name
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

  -- 2. Delete the target user from auth.users
  --    This should CASCADE to profiles if configured, or we delete profile manually first if needed.
  --    Usually deleting from auth.users is the 'hard' delete.
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

-- Grant execute permission to authenticated users (security check is inside)
GRANT EXECUTE ON FUNCTION public.delete_user_by_admin(target_user_id uuid) TO authenticated;