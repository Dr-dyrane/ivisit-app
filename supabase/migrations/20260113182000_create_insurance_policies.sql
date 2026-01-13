-- Migration: Create Insurance Policies Table
-- Description: Stores user insurance details (iVisit Basic or Third Party)

CREATE TABLE IF NOT EXISTS public.insurance_policies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    provider_name text NOT NULL, -- e.g., 'iVisit Basic', 'AXA Mansard', 'Hygeia'
    policy_number text, -- Can be null for internal schemes
    plan_type text, -- 'basic', 'premium', 'family'
    status text DEFAULT 'active' CHECK (status IN ('active', 'expired', 'pending')),
    coverage_details jsonb DEFAULT '{}'::jsonb, -- Flexible storage for limits/benefits
    starts_at timestamptz DEFAULT now(),
    expires_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.insurance_policies ENABLE ROW LEVEL SECURITY;

-- Users can read their own policies
CREATE POLICY "Users can view own policies" 
ON public.insurance_policies FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert (e.g. claiming a new policy)
CREATE POLICY "Users can insert own policies" 
ON public.insurance_policies FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Only admins/service role can update status (usually) but for MVP let users edit
CREATE POLICY "Users can update own policies" 
ON public.insurance_policies FOR UPDATE 
USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_insurance_user_id ON public.insurance_policies(user_id);
