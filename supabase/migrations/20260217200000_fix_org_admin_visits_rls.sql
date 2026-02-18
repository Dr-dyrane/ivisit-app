-- ==========================================================================
-- FIX ORG ADMIN VISITS RLS — profiles.organization_id = organizations.id
-- ==========================================================================
-- Corrects the wrong assumption that profiles.organization_id pointed to
-- hospitals.id. It actually stores the PARENT organization UUID (as TEXT).
-- hospitals.organization_id is UUID. We cast both to TEXT for safe comparison.
-- ==========================================================================
BEGIN;

DROP POLICY IF EXISTS "Org admins can view org visits" ON public.visits;
CREATE POLICY "Org admins can view org visits"
ON public.visits
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.hospitals h 
            ON CAST(h.organization_id AS text) = CAST(p.organization_id AS text)
        WHERE p.id = auth.uid()
        AND p.role = 'org_admin'
        AND p.organization_id IS NOT NULL
        AND visits.hospital_id IS NOT NULL
        AND visits.hospital_id = h.id
    )
);

NOTIFY pgrst, 'reload schema';

COMMIT;
