-- Hospital media pipeline
-- Canonical media metadata lives in hospital_media while hospitals.image remains
-- the single render URL consumed by existing emergency/map flows.

ALTER TABLE public.hospitals
ADD COLUMN IF NOT EXISTS image_source TEXT,
ADD COLUMN IF NOT EXISTS image_confidence DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS image_attribution_text TEXT,
ADD COLUMN IF NOT EXISTS image_synced_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.hospital_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
    media_role TEXT NOT NULL DEFAULT 'hero',
    source_type TEXT NOT NULL,
    source_provider TEXT,
    remote_url TEXT,
    website_url TEXT,
    provider_photo_ref TEXT,
    attribution_text TEXT,
    attribution_html TEXT,
    attribution_required BOOLEAN NOT NULL DEFAULT false,
    confidence DOUBLE PRECISION NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'active',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT hospital_media_media_role_check CHECK (
        media_role IN ('hero', 'logo', 'gallery')
    ),
    CONSTRAINT hospital_media_source_type_check CHECK (
        source_type IN (
            'hospital_upload',
            'official_website_image',
            'provider_photo',
            'domain_logo',
            'deterministic_fallback',
            'seed_image'
        )
    ),
    CONSTRAINT hospital_media_status_check CHECK (
        status IN ('active', 'archived', 'failed')
    )
);

CREATE INDEX IF NOT EXISTS idx_hospital_media_hospital_id
ON public.hospital_media(hospital_id);

CREATE INDEX IF NOT EXISTS idx_hospital_media_status
ON public.hospital_media(status, media_role, is_primary);

CREATE UNIQUE INDEX IF NOT EXISTS idx_hospital_media_primary_per_role
ON public.hospital_media(hospital_id, media_role)
WHERE is_primary = true AND status = 'active';

ALTER TABLE public.hospital_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active hospital media" ON public.hospital_media;
CREATE POLICY "Public read active hospital media"
ON public.hospital_media FOR SELECT
USING (status = 'active');

DROP POLICY IF EXISTS "Org Admins manage hospital media" ON public.hospital_media;
CREATE POLICY "Org Admins manage hospital media"
ON public.hospital_media FOR ALL
TO authenticated
USING (
    public.p_is_admin()
    OR EXISTS (
        SELECT 1
        FROM public.hospitals h
        WHERE h.id = hospital_media.hospital_id
          AND h.organization_id = public.p_get_current_org_id()
    )
)
WITH CHECK (
    public.p_is_admin()
    OR EXISTS (
        SELECT 1
        FROM public.hospitals h
        WHERE h.id = hospital_media.hospital_id
          AND h.organization_id = public.p_get_current_org_id()
    )
);

DROP TRIGGER IF EXISTS handle_hospital_media_updated_at ON public.hospital_media;
CREATE TRIGGER handle_hospital_media_updated_at
BEFORE UPDATE ON public.hospital_media
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();
