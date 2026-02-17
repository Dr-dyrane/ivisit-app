-- Fix RLS Recursion using Security Definer Function

-- 1. Create Helper Function
CREATE OR REPLACE FUNCTION public.check_is_org_admin(_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- Bypasses RLS
SET search_path = public -- Secure search path
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'org_admin'
    AND organization_id = _org_id
  );
END;
$$;

-- 2. Update Policies to use Function

-- Update Policy
DROP POLICY IF EXISTS "Org Admins can update profiles in their organization" ON public.profiles;

CREATE POLICY "Org Admins can update profiles in their organization"
ON public.profiles
FOR UPDATE
USING ( check_is_org_admin(organization_id) );

-- Select Policy
DROP POLICY IF EXISTS "Org Admins can view profiles in their organization" ON public.profiles;

CREATE POLICY "Org Admins can view profiles in their organization"
ON public.profiles
FOR SELECT
USING ( 
    -- User can view own profile OR is org admin
    auth.uid() = id 
    OR 
    check_is_org_admin(organization_id) 
);
