-- Fix Profiles RLS for Org Admins

-- Drop existing likely conflicting policies to be safe (or we can just add this one if unique name)
DROP POLICY IF EXISTS "Org Admins can update profiles in their organization" ON public.profiles;

CREATE POLICY "Org Admins can update profiles in their organization"
ON public.profiles
FOR UPDATE
USING (
  EXISTs (
    SELECT 1 FROM public.profiles AS admin_profile
    WHERE admin_profile.id = auth.uid()
    AND admin_profile.role = 'org_admin'
    AND admin_profile.organization_id = profiles.organization_id
  )
);

-- Also ensure they can SELECT (View) them
DROP POLICY IF EXISTS "Org Admins can view profiles in their organization" ON public.profiles;

CREATE POLICY "Org Admins can view profiles in their organization"
ON public.profiles
FOR SELECT
USING (
  EXISTs (
    SELECT 1 FROM public.profiles AS admin_profile
    WHERE admin_profile.id = auth.uid()
    AND admin_profile.role = 'org_admin'
    AND admin_profile.organization_id = profiles.organization_id
  )
);
