-- Add organization_id to profiles for RBAC v2 Multi-tenancy
-- This enables "Platform", "Hospital", "Agency", and "Indie Provider" scopes.

-- We link valid organizations to the hospitals table for now.
-- In the future, if we separate 'Organizations' from 'Hospitals', we can migrate this FK or make it polymorphic.
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.hospitals(id);

-- Add comment to explain usage
COMMENT ON COLUMN public.profiles.organization_id IS 'Link to the Organization (Hospital/Agency) this user belongs to. Null for Platform Admins or non-org users.';

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';
