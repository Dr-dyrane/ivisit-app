-- Migration: Add RLS policies to support_tickets table
-- Description: Implement Row Level Security for support_tickets table following hybrid RBAC pattern

-- Enable RLS on support_tickets table if not already enabled
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

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
DROP POLICY IF EXISTS "Users can view own support tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admins can view all support tickets" ON support_tickets;

-- Create comprehensive RLS policy for support_tickets
CREATE POLICY "Admins full access, users own data"
ON support_tickets FOR ALL
TO authenticated
USING (
  public.is_admin() OR auth.uid() = user_id
)
WITH CHECK (
  public.is_admin() OR auth.uid() = user_id
);

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';
