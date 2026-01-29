-- Add hospital_id to ambulances table to enable RBAC Org Scope
ALTER TABLE public.ambulances 
ADD COLUMN IF NOT EXISTS hospital_id UUID REFERENCES public.hospitals(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_ambulances_hospital_id ON public.ambulances(hospital_id);

-- (Optional) Enable RLS if not already enabled
ALTER TABLE public.ambulances ENABLE ROW LEVEL SECURITY;

-- Policy: Members of an Organization can view their own ambulances
CREATE POLICY "Org members can view own ambulances" 
ON public.ambulances FOR SELECT 
USING (
  hospital_id IN (
    SELECT organization_id FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- Policy: Admin can view all
CREATE POLICY "Admins can view all ambulances" 
ON public.ambulances FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);
