-- Migration: Add RLS policies to emergency_requests table
-- Description: Implement Row Level Security for emergency_requests table following hybrid RBAC pattern

-- Enable RLS on emergency_requests table if not already enabled
ALTER TABLE emergency_requests ENABLE ROW LEVEL SECURITY;

-- Create universal admin function if it doesn't exist
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own emergency requests" ON emergency_requests;
DROP POLICY IF EXISTS "Admins can view all emergency requests" ON emergency_requests;

-- Create comprehensive RLS policy for emergency_requests
CREATE POLICY "Admins full access, users own data"
ON emergency_requests FOR ALL
TO authenticated
USING (
  public.is_admin() OR auth.uid() = user_id
)
WITH CHECK (
  public.is_admin() OR auth.uid() = user_id
);

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';
