-- 🏯 20260221000300_smart_onboarding.sql
-- Automatic Onboarding Completion based on Data Presence

-- 1. Create the Recalculation Function
CREATE OR REPLACE FUNCTION public.recalculate_onboarding_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Only attempt to auto-complete if the current status is 'pending'
    IF NEW.onboarding_status = 'pending' THEN
        
        -- Rule 1: Administrative Blessing / Manual Assignment
        -- If an org_admin, provider, or dispatcher is linked to an organization, onboarding is effectively over.
        IF (NEW.role IN ('org_admin', 'provider', 'dispatcher') AND NEW.organization_id IS NOT NULL) THEN
            NEW.onboarding_status := 'complete';
        
        -- Rule 2: Field Operative Assignment
        -- If a driver or paramedic is assigned to an ambulance, they are ready for duty.
        ELSIF (NEW.assigned_ambulance_id IS NOT NULL) THEN
            NEW.onboarding_status := 'complete';
            
        -- Rule 3: System Sovereign
        -- Admins never need to onboarding.
        ELSIF (NEW.role = 'admin') THEN
            NEW.onboarding_status := 'complete';
            
        -- Rule 4: Verified Identity
        -- If a patient completes BVN verification, they have satisfied the core requirement.
        ELSIF (NEW.role = 'patient' AND NEW.bvn_verified = true) THEN
            NEW.onboarding_status := 'complete';
            
        -- Rule 5: Financial Commitment
        -- If a Stripe Customer ID is present, they have bypassed or completed the payment setup.
        ELSIF (NEW.stripe_customer_id IS NOT NULL) THEN
            NEW.onboarding_status := 'complete';
        END IF;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Attach the Trigger
DROP TRIGGER IF EXISTS on_profile_data_presence_onboarding ON public.profiles;
CREATE TRIGGER on_profile_data_presence_onboarding
BEFORE INSERT OR UPDATE OF organization_id, assigned_ambulance_id, role, bvn_verified, stripe_customer_id, onboarding_status
ON public.profiles
FOR EACH ROW
EXECUTE PROCEDURE public.recalculate_onboarding_status();

-- 3. Retroactive Repair: Force a touch on profiles to fix any stuck users
-- This will fire the trigger for everyone currently in 'pending' status
UPDATE public.profiles 
SET updated_at = NOW() 
WHERE onboarding_status = 'pending';
