-- Helper function to avoid RLS recursion on profiles
-- SECURITY DEFINER allows it to read profiles table bypassing RLS
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- Helper to get Org Id
CREATE OR REPLACE FUNCTION public.get_current_user_org_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid();
$$;


-- Enable RLS on core tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Update Role Constraint to include new RBAC roles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('patient', 'provider', 'admin', 'org_admin', 'dispatcher', 'viewer', 'sponsor'));

ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_requests ENABLE ROW LEVEL SECURITY;

-- PROFILES
-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING ( auth.uid() = id );

-- Policy: Staff (Admin, Org Admin, Provider) can view ALL profiles (to search/link patients)
CREATE POLICY "Staff can view all profiles for directory" 
ON public.profiles FOR SELECT 
USING (
  public.get_current_user_role() IN ('admin', 'org_admin', 'provider', 'dispatcher')
);

-- Policy: Admin can update any profile
CREATE POLICY "Admins can update any profile" 
ON public.profiles FOR UPDATE
USING ( public.get_current_user_role() = 'admin' );

-- Policy: Users can update own profile
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE
USING ( auth.uid() = id );


-- HOSPITALS
-- Policy: Everyone can view hospitals (Directory is public/authenticated)
CREATE POLICY "Authenticated users can view hospitals" 
ON public.hospitals FOR SELECT 
USING ( auth.role() = 'authenticated' );

-- Policy: Platform Admins can manage hospitals
CREATE POLICY "Platform Admins can manage hospitals" 
ON public.hospitals FOR ALL 
USING ( public.get_current_user_role() = 'admin' );

-- Policy: Org Admins can update their OWN hospital
CREATE POLICY "Org Admins can update own hospital" 
ON public.hospitals FOR UPDATE
USING ( id = public.get_current_user_org_id() );


-- DOCTORS
-- Policy: Everyone can view doctors (Directory)
CREATE POLICY "Authenticated users can view doctors" 
ON public.doctors FOR SELECT 
USING ( auth.role() = 'authenticated' );

-- Policy: Org Admins can manage THEIR doctors
CREATE POLICY "Org Admins can manage own doctors" 
ON public.doctors FOR ALL
USING ( hospital_id = public.get_current_user_org_id() );

-- Policy: Platform Admins can manage all
CREATE POLICY "Platform Admins can manage all doctors" 
ON public.doctors FOR ALL 
USING ( public.get_current_user_role() = 'admin' );


-- EMERGENCY REQUESTS
-- Policy: Admin View All
CREATE POLICY "Admins view all emergencies" 
ON public.emergency_requests FOR ALL 
USING ( public.get_current_user_role() = 'admin' );

-- Policy: Org Admin View/Manage Own Hospital Requests
CREATE POLICY "Org Admins manage hospital emergencies" 
ON public.emergency_requests FOR ALL 
USING ( hospital_id = public.get_current_user_org_id()::text );

-- Policy: Responders (Providers) View Assigned OR Pending (to accept)
CREATE POLICY "Responders view assigned or pending" 
ON public.emergency_requests FOR SELECT 
USING (
  responder_id = auth.uid() OR status = 'pending'
);

-- Policy: Responders can update assigned
CREATE POLICY "Responders update assigned" 
ON public.emergency_requests FOR UPDATE
USING (
  responder_id = auth.uid() OR status = 'pending'
);

-- Policy: Users (Patients) View/Manage Own Requests
CREATE POLICY "Users manage own emergencies" 
ON public.emergency_requests FOR ALL 
USING ( user_id = auth.uid() );
