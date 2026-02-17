-- Migration: Add RLS policies to medical_profiles table
-- Description: Implement Row Level Security for medical_profiles table following inherited access pattern

-- Enable RLS on medical_profiles table if not already enabled
ALTER TABLE medical_profiles ENABLE ROW LEVEL SECURITY;

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
DROP POLICY IF EXISTS "Users can view own medical profile" ON medical_profiles;
DROP POLICY IF EXISTS "Admins can view all medical profiles" ON medical_profiles;

-- Create comprehensive RLS policy for medical_profiles
-- Apple-standard approach: medical data inherits from profile access
CREATE POLICY "Admins full access, users own data"
ON medical_profiles FOR ALL
TO authenticated
USING (
  public.is_admin() OR auth.uid() = user_id
)
WITH CHECK (
  public.is_admin() OR auth.uid() = user_id
);

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';
