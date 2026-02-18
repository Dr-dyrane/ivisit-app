-- ==========================================================================
-- UNIVERSAL ORG ADMIN RBAC — 2026-02-17
-- ==========================================================================
-- Corrects Org Admin visibility across all core tables.
-- logic: profiles.organization_id = parent organization UUID (TEXT).
-- We resolve all hospitals belonging to that parent org and grant access.
-- ==========================================================================

BEGIN;

-- ═══════════════════════════════════════════════════════════
-- 1. DOCTORS
-- ═══════════════════════════════════════════════════════════

-- Org admins can manage doctors in their hospitals
DROP POLICY IF EXISTS "Org admins manage their doctors" ON public.doctors;
CREATE POLICY "Org admins manage their doctors"
ON public.doctors
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.hospitals h ON CAST(h.organization_id AS text) = CAST(p.organization_id AS text)
        WHERE p.id = auth.uid()
        AND p.role = 'org_admin'
        AND p.organization_id IS NOT NULL
        AND doctors.hospital_id IS NOT NULL
        AND doctors.hospital_id = h.id
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.hospitals h ON CAST(h.organization_id AS text) = CAST(p.organization_id AS text)
        WHERE p.id = auth.uid()
        AND p.role = 'org_admin'
        AND p.organization_id IS NOT NULL
        AND doctors.hospital_id IS NOT NULL
        AND doctors.hospital_id = h.id
    )
);


-- ═══════════════════════════════════════════════════════════
-- 2. AMBULANCES
-- ═══════════════════════════════════════════════════════════

-- Org admins can manage ambulances in their hospitals
DROP POLICY IF EXISTS "Org admins manage their ambulances" ON public.ambulances;
CREATE POLICY "Org admins manage their ambulances"
ON public.ambulances
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.hospitals h ON CAST(h.organization_id AS text) = CAST(p.organization_id AS text)
        WHERE p.id = auth.uid()
        AND p.role = 'org_admin'
        AND p.organization_id IS NOT NULL
        AND ambulances.hospital_id IS NOT NULL
        AND ambulances.hospital_id = h.id
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.hospitals h ON CAST(h.organization_id AS text) = CAST(p.organization_id AS text)
        WHERE p.id = auth.uid()
        AND p.role = 'org_admin'
        AND p.organization_id IS NOT NULL
        AND ambulances.hospital_id IS NOT NULL
        AND ambulances.hospital_id = h.id
    )
);


-- ═══════════════════════════════════════════════════════════
-- 3. EMERGENCY REQUESTS
-- ═══════════════════════════════════════════════════════════

-- Modernize the emergency requests policy to use the same cast-safe join
DROP POLICY IF EXISTS "Org admins see their emergencies" ON public.emergency_requests;
CREATE POLICY "Org admins see their emergencies"
ON public.emergency_requests
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.hospitals h ON CAST(h.organization_id AS text) = CAST(p.organization_id AS text)
        WHERE p.id = auth.uid()
        AND p.role = 'org_admin'
        AND p.organization_id IS NOT NULL
        AND emergency_requests.hospital_id IS NOT NULL
        AND emergency_requests.hospital_id = h.id
    )
);

DROP POLICY IF EXISTS "Org admins update their emergencies" ON public.emergency_requests;
CREATE POLICY "Org admins update their emergencies"
ON public.emergency_requests
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.hospitals h ON CAST(h.organization_id AS text) = CAST(p.organization_id AS text)
        WHERE p.id = auth.uid()
        AND p.role = 'org_admin'
        AND p.organization_id IS NOT NULL
        AND emergency_requests.hospital_id IS NOT NULL
        AND emergency_requests.hospital_id = h.id
    )
);

COMMIT;

NOTIFY pgrst, 'reload schema';
