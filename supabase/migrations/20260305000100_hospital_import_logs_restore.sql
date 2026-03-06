-- Restore canonical hospital_import_logs table to match active app/console runtime usage.

CREATE TABLE IF NOT EXISTS public.hospital_import_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_type TEXT NOT NULL,
    location_lat DOUBLE PRECISION,
    location_lng DOUBLE PRECISION,
    radius_km NUMERIC,
    search_query TEXT,
    status TEXT DEFAULT 'running',
    total_found INTEGER DEFAULT 0,
    imported_count INTEGER DEFAULT 0,
    skipped_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    errors JSONB,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    CONSTRAINT hospital_import_logs_counts_non_negative CHECK (
        COALESCE(total_found, 0) >= 0
        AND COALESCE(imported_count, 0) >= 0
        AND COALESCE(skipped_count, 0) >= 0
        AND COALESCE(error_count, 0) >= 0
    )
);

CREATE INDEX IF NOT EXISTS idx_hospital_import_logs_created_at
    ON public.hospital_import_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_hospital_import_logs_created_by
    ON public.hospital_import_logs(created_by);

ALTER TABLE public.hospital_import_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage hospital import logs" ON public.hospital_import_logs;
CREATE POLICY "Admins manage hospital import logs"
ON public.hospital_import_logs
FOR ALL
TO authenticated
USING (public.p_is_admin())
WITH CHECK (public.p_is_admin());

DROP POLICY IF EXISTS "Users read own hospital import logs" ON public.hospital_import_logs;
CREATE POLICY "Users read own hospital import logs"
ON public.hospital_import_logs
FOR SELECT
TO authenticated
USING (
    created_by = auth.uid()
    OR public.p_is_admin()
);

DROP POLICY IF EXISTS "Users insert own hospital import logs" ON public.hospital_import_logs;
CREATE POLICY "Users insert own hospital import logs"
ON public.hospital_import_logs
FOR INSERT
TO authenticated
WITH CHECK (
    created_by IS NULL
    OR created_by = auth.uid()
    OR public.p_is_admin()
);

DROP POLICY IF EXISTS "Users update own hospital import logs" ON public.hospital_import_logs;
CREATE POLICY "Users update own hospital import logs"
ON public.hospital_import_logs
FOR UPDATE
TO authenticated
USING (
    created_by = auth.uid()
    OR public.p_is_admin()
)
WITH CHECK (
    created_by = auth.uid()
    OR public.p_is_admin()
);

GRANT SELECT, INSERT, UPDATE ON public.hospital_import_logs TO authenticated;
