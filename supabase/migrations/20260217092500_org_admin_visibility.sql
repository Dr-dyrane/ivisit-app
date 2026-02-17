-- Migration: Org Admin Visibility for Emergency Requests
-- 1. Updates RLS to allow Org Admins to view requests for their hospitals
-- 2. Adds notification support for Org Admins

BEGIN;

-- ═══════════════════════════════════════════════════════════
-- 1. UPDATE EMERGENCY REQUESTS RLS
-- ═══════════════════════════════════════════════════════════

-- Ensure Org Admins can see emergencies for any hospital in their organization
-- We use profiles.organization_id which can be either an Org ID or a Hospital ID
DROP POLICY IF EXISTS "Org admins see their emergencies" ON public.emergency_requests;
CREATE POLICY "Org admins see their emergencies" ON public.emergency_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() 
            AND p.role IN ('org_admin', 'admin')
            -- Case A: profiles.organization_id is the Hospital ID
            AND (
                p.organization_id::text = emergency_requests.hospital_id::text
                OR
                -- Case B: profiles.organization_id is the Parent Org ID
                EXISTS (
                    SELECT 1 FROM public.hospitals h
                    WHERE h.id::text = emergency_requests.hospital_id::text
                    AND h.organization_id = p.organization_id
                )
            )
        )
    );

-- Also allow Org Admins to UPDATE (e.g., mark as accepted, arrived, etc.)
DROP POLICY IF EXISTS "Org admins update their emergencies" ON public.emergency_requests;
CREATE POLICY "Org admins update their emergencies" ON public.emergency_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() 
            AND p.role IN ('org_admin', 'admin')
            AND (
                p.organization_id::text = emergency_requests.hospital_id::text
                OR
                EXISTS (
                    SELECT 1 FROM public.hospitals h
                    WHERE h.id::text = emergency_requests.hospital_id::text
                    AND h.organization_id = p.organization_id
                )
            )
        )
    );

-- ═══════════════════════════════════════════════════════════
-- 2. UPDATE PAYMENTS RLS
-- ═══════════════════════════════════════════════════════════

-- Allow Org Admins to see payments for their organization
DROP POLICY IF EXISTS "Org admins see their payments" ON public.payments;
CREATE POLICY "Org admins see their payments" ON public.payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() 
            AND p.role IN ('org_admin', 'admin')
            AND (
                p.organization_id = payments.organization_id
                OR
                EXISTS (
                    SELECT 1 FROM public.hospitals h
                    WHERE h.id::text = p.organization_id::text
                    AND h.organization_id = payments.organization_id
                )
            )
        )
    );

COMMIT;

NOTIFY pgrst, 'reload schema';
