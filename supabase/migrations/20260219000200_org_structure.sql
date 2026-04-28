-- 🏯 Module 03: Organizational Structure
-- Organizations, Hospitals, and Providers (Doctors)

-- 1. Organizations
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    stripe_account_id TEXT UNIQUE,
    ivisit_fee_percentage NUMERIC DEFAULT 2.5,
    fee_tier TEXT DEFAULT 'standard',
    contact_email TEXT,
    is_active BOOLEAN DEFAULT true,
    display_id TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Hospitals
CREATE TABLE IF NOT EXISTS public.hospitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    phone TEXT,
    rating DOUBLE PRECISION DEFAULT 0,
    type TEXT DEFAULT 'standard',
    image TEXT,
    specialties TEXT[] DEFAULT '{}',
    service_types TEXT[] DEFAULT '{}',
    features TEXT[] DEFAULT '{}',
    emergency_level TEXT,
    available_beds INTEGER DEFAULT 0,
    icu_beds_available INTEGER DEFAULT 0,
    total_beds INTEGER DEFAULT 0,
    ambulances_count INTEGER DEFAULT 0,
    wait_time TEXT,
    price_range TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    coordinates GEOMETRY(POINT, 4326),  -- Shared geospatial field
    verified BOOLEAN DEFAULT false,
    verification_status TEXT DEFAULT 'pending',
    status TEXT DEFAULT 'available',
    place_id TEXT UNIQUE,
    org_admin_id UUID REFERENCES public.profiles(id),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    display_id TEXT UNIQUE,
    base_price NUMERIC,
    bed_availability JSONB DEFAULT '{}',
    ambulance_availability JSONB DEFAULT '{}',
    emergency_wait_time_minutes INTEGER,
    last_availability_update TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2b. Hospital Import Logs (admin/provider operational ingest audit)
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

-- Keep bed capacity columns and bed_availability JSON in sync.
CREATE OR REPLACE FUNCTION public.normalize_hospital_bed_state()
RETURNS TRIGGER AS $$
DECLARE
    v_available INTEGER;
    v_icu INTEGER;
    v_total INTEGER;
BEGIN
    v_available := GREATEST(0, COALESCE(NEW.available_beds, 0));
    v_icu := GREATEST(0, COALESCE(NEW.icu_beds_available, 0));
    IF v_icu > v_available THEN
        v_icu := v_available;
    END IF;

    v_total := GREATEST(COALESCE(NEW.total_beds, 0), v_available);

    NEW.available_beds := v_available;
    NEW.icu_beds_available := v_icu;
    NEW.total_beds := v_total;

    NEW.bed_availability := jsonb_strip_nulls(
        COALESCE(NEW.bed_availability, '{}'::jsonb)
        || jsonb_build_object(
            'available', v_available,
            'icu', v_icu,
            'standard', GREATEST(0, v_available - v_icu),
            'total', v_total
        )
    );

    IF TG_OP = 'INSERT' THEN
        NEW.last_availability_update := NOW();
    ELSIF NEW.available_beds IS DISTINCT FROM OLD.available_beds
       OR NEW.icu_beds_available IS DISTINCT FROM OLD.icu_beds_available
       OR NEW.total_beds IS DISTINCT FROM OLD.total_beds
       OR NEW.bed_availability IS DISTINCT FROM OLD.bed_availability THEN
        NEW.last_availability_update := NOW();
    END IF;

    IF NEW.available_beds <= 0 AND COALESCE(NEW.status, 'available') = 'available' THEN
        NEW.status := 'full';
    ELSIF NEW.available_beds > 0 AND COALESCE(NEW.status, '') = 'full' THEN
        NEW.status := 'available';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS normalize_hosp_bed_state ON public.hospitals;
CREATE TRIGGER normalize_hosp_bed_state
BEFORE INSERT OR UPDATE ON public.hospitals
FOR EACH ROW EXECUTE PROCEDURE public.normalize_hospital_bed_state();

-- 3. Doctors
CREATE TABLE IF NOT EXISTS public.doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    specialization TEXT NOT NULL,
    image TEXT,
    rating DOUBLE PRECISION DEFAULT 5.0,
    reviews_count INTEGER DEFAULT 0,
    experience INTEGER,
    about TEXT,
    consultation_fee TEXT,
    is_available BOOLEAN DEFAULT true,
    is_on_call BOOLEAN DEFAULT false,
    max_patients INTEGER DEFAULT 10,
    current_patients INTEGER DEFAULT 0,
    department TEXT,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'busy', 'off_duty', 'on_call', 'invited')),
    license_number TEXT,
    email TEXT,
    phone TEXT,
    display_id TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Doctor Schedules
CREATE TABLE IF NOT EXISTS public.doctor_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    shift_type TEXT NOT NULL CHECK (shift_type IN ('day', 'evening', 'night')),
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Emergency Doctor Assignments
CREATE TABLE IF NOT EXISTS public.emergency_doctor_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emergency_request_id UUID NOT NULL,  -- FK added after emergency_requests table exists (in 0003)
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'accepted', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 🛠️ AUTOMATION: ORG/HOSPITAL TRIGGERS
CREATE TRIGGER handle_org_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_hosp_updated_at BEFORE UPDATE ON public.hospitals FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_doc_updated_at BEFORE UPDATE ON public.doctors FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_eda_updated_at BEFORE UPDATE ON public.emergency_doctor_assignments FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER stamp_org_display_id BEFORE INSERT ON public.organizations FOR EACH ROW EXECUTE PROCEDURE public.stamp_entity_display_id();
CREATE TRIGGER stamp_hosp_display_id BEFORE INSERT ON public.hospitals FOR EACH ROW EXECUTE PROCEDURE public.stamp_entity_display_id();
CREATE TRIGGER stamp_doc_display_id BEFORE INSERT ON public.doctors FOR EACH ROW EXECUTE PROCEDURE public.stamp_entity_display_id();

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_doctors_hospital_specialty ON public.doctors(hospital_id, specialization);
CREATE INDEX IF NOT EXISTS idx_doctors_availability ON public.doctors(is_available, current_patients, max_patients);
CREATE INDEX IF NOT EXISTS idx_doctor_schedules_doctor_date ON public.doctor_schedules(doctor_id, date);
CREATE INDEX IF NOT EXISTS idx_eda_request ON public.emergency_doctor_assignments(emergency_request_id);
CREATE INDEX IF NOT EXISTS idx_eda_doctor ON public.emergency_doctor_assignments(doctor_id);

-- LINK ORG ADMIN
ALTER TABLE public.profiles ADD CONSTRAINT profiles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;

-- 6. Hospital Media Pipeline
-- PULLBACK NOTE: Absorbed from 20260412050000_hospital_media_pipeline.sql into pillar per CONTRIBUTING.md
-- Media metadata columns on hospitals + canonical hospital_media table for multi-source media management.
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
