-- Migration: Add delete_hospital_by_admin RPC
--
-- The direct supabase.from('hospitals').delete() goes through RLS,
-- but the FOR ALL policy using get_current_user_role() = 'admin'
-- silently returns 0 rows (DELETE succeeds with nothing deleted).
-- This SECURITY DEFINER RPC bypasses RLS for reliable admin deletes.

CREATE OR REPLACE FUNCTION public.delete_hospital_by_admin(target_hospital_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Verify caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access Denied: Only Admins can delete hospitals.';
  END IF;

  -- 2. Verify hospital exists
  IF NOT EXISTS (
    SELECT 1 FROM public.hospitals WHERE id = target_hospital_id
  ) THEN
    RAISE EXCEPTION 'Hospital not found: %', target_hospital_id;
  END IF;

  -- 3. Delete related ambulances first (FK constraint)
  DELETE FROM public.ambulances WHERE hospital_id = target_hospital_id;

  -- 4. Delete the hospital
  DELETE FROM public.hospitals WHERE id = target_hospital_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_hospital_by_admin(uuid) TO authenticated;

COMMENT ON FUNCTION public.delete_hospital_by_admin(uuid) IS
'Deletes a hospital and its ambulances. SECURITY DEFINER bypasses RLS. Only admins can execute.';

NOTIFY pgrst, 'reload schema';
