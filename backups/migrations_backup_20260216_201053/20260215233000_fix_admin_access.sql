
-- Fix Admin Access to Emergency Requests and Visits
-- Ensures Console/Admin users can see all records regardless of creator.

-- 1. Get Current User Role Function (Ensure it exists and works)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- 2. EMERGENCY REQUESTS POLICIES

-- Drop potential conflicting policies
DROP POLICY IF EXISTS "Admins view all emergencies" ON public.emergency_requests;
DROP POLICY IF EXISTS "Service Role full access emergencies" ON public.emergency_requests;

-- Service Role (Supabase Admin / Script) - Bypass RLS
CREATE POLICY "Service Role full access emergencies"
ON public.emergency_requests
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Admin User (Authenticated with 'admin' role in profiles)
CREATE POLICY "Admins view all emergencies"
ON public.emergency_requests
FOR ALL
USING (
  public.get_current_user_role() IN ('admin', 'org_admin', 'dispatcher', 'super_admin')
);

-- 3. VISITS POLICIES
-- Ensure Admins can also see all Visits (just in case)

DROP POLICY IF EXISTS "Admins view all visits" ON public.visits;
DROP POLICY IF EXISTS "Service Role full access visits" ON public.visits;

CREATE POLICY "Service Role full access visits"
ON public.visits
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins view all visits"
ON public.visits
FOR ALL
USING (
  public.get_current_user_role() IN ('admin', 'org_admin', 'dispatcher', 'super_admin')
);

-- 4. ENSURE RLS IS ENABLED
ALTER TABLE public.emergency_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
