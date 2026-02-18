-- ==========================================================================
-- ORG ADMIN MULTI-HOSPITAL VISITS RLS — 2026-02-17
-- ==========================================================================
-- Fix: An org_admin's profiles.organization_id points to a single hospital,
-- but they may manage multiple hospitals under one parent organization.
-- The RLS policy must resolve the parent org and match all sibling hospitals.
-- ==========================================================================
BEGIN;

-- Replace the single-hospital policy with a multi-hospital one
DROP POLICY IF EXISTS "Org admins can view org visits" ON public.visits;
CREATE POLICY "Org admins can view org visits"
ON public.visits
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.hospitals admin_h ON admin_h.id = p.organization_id
        JOIN public.hospitals visit_h ON visit_h.organization_id = admin_h.organization_id
        WHERE p.id = auth.uid()
        AND p.role = 'org_admin'
        AND p.organization_id IS NOT NULL
        AND visits.hospital_id IS NOT NULL
        AND visits.hospital_id = visit_h.id
    )
);

NOTIFY pgrst, 'reload schema';

COMMIT;
