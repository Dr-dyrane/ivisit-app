-- ============================================================================
-- ONBOARDING STATUS MIGRATION
-- ============================================================================
-- 
-- PURPOSE:
-- Enables self-service organization registration by allowing new org admins
-- to create their hospital during the onboarding flow while maintaining
-- security through Row Level Security (RLS).
--
-- FLOW:
-- 1. User visits /onboarding
-- 2. Selects organization type (Step 1)
-- 3. Creates account via Supabase Auth (Step 2)
--    → Sets onboarding_status = 'pending'
-- 4. Fills organization details (Step 3)
-- 5. Optional setup and verification (Steps 4-5)
-- 6. Submits → Creates hospital, links to profile
--    → Sets role = 'org_admin', onboarding_status = 'complete'
-- 7. Platform admin verifies the organization
--
-- SECURITY:
-- - RLS ensures users can only create ONE hospital
-- - Must have onboarding_status = 'pending' AND no existing organization_id
-- - Once linked, user cannot create another hospital
--
-- RELATED FILES:
-- - src/services/onboardingService.js     (createAdminAccount, submitOnboarding)
-- - src/contexts/OnboardingContext.jsx    (state management, auto-skip logic)
-- - src/components/pages/OnboardingPage.jsx (auth guard with isOnboarding)
-- - src/components/common/ProtectedRoute.jsx (redirects pending users)
-- - src/contexts/AuthContext.jsx           (isOnboarding helper)
--
-- ROLLBACK:
-- ALTER TABLE public.profiles DROP COLUMN onboarding_status;
-- DROP FUNCTION IF EXISTS public.get_current_user_onboarding_status();
-- DROP POLICY IF EXISTS "Onboarding users can create hospital" ON public.hospitals;
-- DROP POLICY IF EXISTS "Onboarding users can update their new hospital" ON public.hospitals;
--
-- ============================================================================

-- ============================================================================
-- 1. ADD ONBOARDING STATUS COLUMN TO PROFILES
-- ============================================================================
-- Values:
--   NULL     = Legacy user or hasn't started onboarding
--   'pending' = User is mid-onboarding (Steps 1-2 complete, waiting for org setup)
--   'complete' = Onboarding finished, organization linked
-- ============================================================================

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_status TEXT DEFAULT NULL;

-- Constraint: Only allow valid status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_onboarding_status_check'
  ) THEN
    ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_onboarding_status_check 
    CHECK (onboarding_status IN ('pending', 'complete', NULL));
  END IF;
END $$;

COMMENT ON COLUMN public.profiles.onboarding_status IS 
'Tracks onboarding state: pending=in_progress, complete=done, NULL=not_started_or_legacy';


-- ============================================================================
-- 2. HELPER FUNCTION: GET CURRENT USER ONBOARDING STATUS
-- ============================================================================
-- Used by RLS policies to check if user is in onboarding state.
-- SECURITY DEFINER ensures function runs with table owner privileges.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_current_user_onboarding_status()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT onboarding_status FROM profiles WHERE id = auth.uid();
$$;


-- ============================================================================
-- 3. RLS POLICY: ONBOARDING USERS CAN CREATE ONE HOSPITAL
-- ============================================================================
-- Conditions for hospital creation:
--   ✓ User is authenticated
--   ✓ User has onboarding_status = 'pending'
--   ✓ User does NOT already have an organization_id (prevents duplicates)
-- ============================================================================

DROP POLICY IF EXISTS "Onboarding users can create hospital" ON public.hospitals;
CREATE POLICY "Onboarding users can create hospital" 
ON public.hospitals FOR INSERT 
WITH CHECK (
  auth.role() = 'authenticated'
  AND public.get_current_user_onboarding_status() = 'pending'
  AND public.get_current_user_org_id() IS NULL
);


-- ============================================================================
-- 4. RLS POLICY: ONBOARDING USERS CAN UPDATE THEIR NEW HOSPITAL
-- ============================================================================
-- Allows users to update hospital details during onboarding Steps 3-5.
-- Once onboarding_status = 'complete', this policy no longer applies.
-- ============================================================================

DROP POLICY IF EXISTS "Onboarding users can update their new hospital" ON public.hospitals;
CREATE POLICY "Onboarding users can update their new hospital" 
ON public.hospitals FOR UPDATE
USING (
  auth.role() = 'authenticated'
  AND public.get_current_user_onboarding_status() = 'pending'
);


-- ============================================================================
-- 5. REFRESH SCHEMA CACHE
-- ============================================================================
-- Notify PostgREST to reload schema so new column/policies take effect.
-- ============================================================================

NOTIFY pgrst, 'reload schema';
