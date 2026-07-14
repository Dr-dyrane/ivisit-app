-- 🏯 Module 03: Organizational Structure
-- Organizations, Hospitals, and Providers (Doctors)

-- 1. Organizations
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    organization_type TEXT NOT NULL DEFAULT 'hospital' CHECK (organization_type IN ('hospital', 'clinic', 'ambulance_service')),
    registration_number TEXT,
    stripe_account_id TEXT UNIQUE,
    ivisit_fee_percentage NUMERIC DEFAULT 2.5,
    fee_tier TEXT DEFAULT 'standard',
    contact_email TEXT,
    contact_phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    display_id TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Keep the pillar deployable against existing environments whose original
-- organizations table predates legal identity and verification ownership.
-- BEGIN CONSOLE_ONBOARDING_ORGANIZATION_SCHEMA
ALTER TABLE public.organizations
    ADD COLUMN IF NOT EXISTS organization_type TEXT NOT NULL DEFAULT 'hospital',
    ADD COLUMN IF NOT EXISTS registration_number TEXT,
    ADD COLUMN IF NOT EXISTS contact_phone TEXT,
    ADD COLUMN IF NOT EXISTS address TEXT,
    ADD COLUMN IF NOT EXISTS city TEXT,
    ADD COLUMN IF NOT EXISTS state TEXT,
    ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Existing organizations predate this review lane and already back live
-- operational records. Preserve their current availability; new self-service
-- registrations carry created_by and always start pending.
UPDATE public.organizations
SET verification_status = 'verified',
    verified_at = COALESCE(verified_at, updated_at, created_at)
WHERE created_by IS NULL
  AND verification_status = 'pending';

ALTER TABLE public.organizations
    DROP CONSTRAINT IF EXISTS organizations_organization_type_check;
ALTER TABLE public.organizations
    ADD CONSTRAINT organizations_organization_type_check
    CHECK (organization_type IN ('hospital', 'clinic', 'ambulance_service'));

ALTER TABLE public.organizations
    DROP CONSTRAINT IF EXISTS organizations_verification_status_check;
ALTER TABLE public.organizations
    ADD CONSTRAINT organizations_verification_status_check
    CHECK (verification_status IN ('pending', 'verified', 'rejected'));

CREATE INDEX IF NOT EXISTS idx_organizations_registration_number
    ON public.organizations (LOWER(registration_number))
    WHERE registration_number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_created_by_unique
    ON public.organizations (created_by)
    WHERE created_by IS NOT NULL;
-- END CONSOLE_ONBOARDING_ORGANIZATION_SCHEMA

-- 2. Hospitals
CREATE TABLE IF NOT EXISTS public.hospitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    timezone_confirmed_at TIMESTAMPTZ,
    timezone_confirmation_source TEXT,
    timezone_confirmed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
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

-- Private evidence submitted during organization registration. Storage object
-- paths stay separate from the public.documents data-room boundary.
-- BEGIN CONSOLE_ONBOARDING_EVIDENCE_SCHEMA
CREATE TABLE IF NOT EXISTS public.organization_verification_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    facility_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL,
    uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    document_type TEXT NOT NULL CHECK (document_type IN ('registration', 'license', 'identity', 'other')),
    storage_path TEXT NOT NULL UNIQUE,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 10485760),
    review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'accepted', 'rejected')),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_verification_documents_org
    ON public.organization_verification_documents (organization_id, review_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_org_verification_documents_uploader
    ON public.organization_verification_documents (uploaded_by, created_at DESC);
-- END CONSOLE_ONBOARDING_EVIDENCE_SCHEMA

-- PULLBACK NOTE: FIX-DUPLICATE-LOCATIONS — Location-based unique constraint
-- Prevents duplicate hospitals at the same physical location (exact coordinates)
-- This fixes the issue where Google Places returns multiple entries for the same location
-- with different place_ids (e.g., "Christina Wargin" and "Walgreens" at same address)
-- GPS precision is sufficient for this dataset - exact coordinates = same physical location
ALTER TABLE public.hospitals
ADD CONSTRAINT location_unique UNIQUE (latitude, longitude);

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

-- 2c. Providers Table (EXPLORE-CARE-PERMANENT-FIX — Phase 5)
-- PULLBACK NOTE: EXPLORE-CARE-PERMANENT-FIX — Provider data enrichment
-- OLD: Provider-specific data mixed in hospitals table (schema pollution, hospital-specific fields irrelevant for non-hospitals)
-- NEW: Separate providers table for provider-specific data (services, insurance, hours, etc.) with clean separation of concerns
CREATE TABLE IF NOT EXISTS public.providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  provider_type TEXT NOT NULL CHECK (provider_type IN (
    'hospital', 'pharmacy', 'lab', 'radiology', 'urgent_care',
    'clinic', 'mental_health', 'womens_care', 'pediatrics'
  )),
  provider_services JSONB DEFAULT '{}'::jsonb,
  provider_specialties JSONB DEFAULT '{}'::jsonb,
  insurance_accepted TEXT[] DEFAULT ARRAY[]::text[],
  structured_hours JSONB DEFAULT '{}'::jsonb,
  appointment_required BOOLEAN DEFAULT false,
  report_turnaround TEXT,
  age_range TEXT,
  crisis_line TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hospital_id, provider_type)
);

CREATE INDEX IF NOT EXISTS idx_providers_hospital_id ON public.providers(hospital_id);
CREATE INDEX IF NOT EXISTS idx_providers_provider_type ON public.providers(provider_type);
CREATE INDEX IF NOT EXISTS idx_providers_hospital_type ON public.providers(hospital_id, provider_type);

-- 2d. Providers Table RLS and Triggers
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;

-- Public read access for verified/demo providers
DROP POLICY IF EXISTS "Public read active providers" ON public.providers;
CREATE POLICY "Public read active providers"
ON public.providers
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.hospitals h
    WHERE h.id = providers.hospital_id
      AND (
        h.verified = true
        OR h.verification_status IN ('verified', 'partner')
        OR h.place_id LIKE 'demo:%'
        OR h.verification_status LIKE 'demo%'
      )
  )
);

-- Service role full access (for edge functions)
DROP POLICY IF EXISTS "Service full access providers" ON public.providers;
CREATE POLICY "Service full access providers"
ON public.providers
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Org admin access (providers for their hospitals)
DROP POLICY IF EXISTS "Org admins manage providers" ON public.providers;
CREATE POLICY "Org admins manage providers"
ON public.providers
FOR ALL
TO authenticated
USING (
  public.p_is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.hospitals h
    WHERE h.id = providers.hospital_id
      AND h.organization_id = public.p_get_current_org_id()
  )
)
WITH CHECK (
  public.p_is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.hospitals h
    WHERE h.id = providers.hospital_id
      AND h.organization_id = public.p_get_current_org_id()
  )
);

-- Updated_at trigger for providers table
DROP TRIGGER IF EXISTS handle_providers_updated_at ON public.providers;
CREATE TRIGGER handle_providers_updated_at
BEFORE UPDATE ON public.providers
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

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

    IF COALESCE(NEW.provider_type, 'hospital') = 'hospital' THEN
        NEW.bed_availability := jsonb_strip_nulls(
            COALESCE(NEW.bed_availability, '{}'::jsonb)
            || jsonb_build_object(
                'available', v_available,
                'icu', v_icu,
                'standard', GREATEST(0, v_available - v_icu),
                'total', v_total
            )
        );
    ELSE
        NEW.bed_availability := COALESCE(NEW.bed_availability, '{}'::jsonb);
    END IF;

    IF TG_OP = 'INSERT' THEN
        NEW.last_availability_update := NOW();
    ELSIF NEW.available_beds IS DISTINCT FROM OLD.available_beds
       OR NEW.icu_beds_available IS DISTINCT FROM OLD.icu_beds_available
       OR NEW.total_beds IS DISTINCT FROM OLD.total_beds
       OR NEW.bed_availability IS DISTINCT FROM OLD.bed_availability THEN
        NEW.last_availability_update := NOW();
    END IF;

    IF COALESCE(NEW.provider_type, 'hospital') = 'hospital' THEN
        IF NEW.available_beds <= 0 AND COALESCE(NEW.status, 'available') = 'available' THEN
            NEW.status := 'full';
        ELSIF NEW.available_beds > 0 AND COALESCE(NEW.status, '') = 'full' THEN
            NEW.status := 'available';
        END IF;
    ELSIF COALESCE(NEW.status, '') = 'full' THEN
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- BEGIN SCHEDULED_VISITS_PROVIDER_TIME_SCHEMA
-- PULLBACK NOTE: Scheduled visits data pass.
-- OLD: provider schedules had no canonical timezone or shift integrity.
-- NEW: facilities own confirmed IANA timezone truth and shifts are unique and ordered.
ALTER TABLE public.hospitals
    ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC',
    ADD COLUMN IF NOT EXISTS timezone_confirmed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS timezone_confirmation_source TEXT,
    ADD COLUMN IF NOT EXISTS timezone_confirmed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.hospitals
    DROP CONSTRAINT IF EXISTS hospitals_timezone_length_check;
ALTER TABLE public.hospitals
    ADD CONSTRAINT hospitals_timezone_length_check
    CHECK (char_length(timezone) BETWEEN 1 AND 64);

ALTER TABLE public.hospitals
    DROP CONSTRAINT IF EXISTS hospitals_timezone_confirmation_source_check;
ALTER TABLE public.hospitals
    ADD CONSTRAINT hospitals_timezone_confirmation_source_check
    CHECK (
        timezone_confirmation_source IS NULL
        OR timezone_confirmation_source IN ('manual', 'google', 'timeapi')
    );

ALTER TABLE public.hospitals
    DROP CONSTRAINT IF EXISTS hospitals_timezone_confirmation_coherence_check;
ALTER TABLE public.hospitals
    ADD CONSTRAINT hospitals_timezone_confirmation_coherence_check
    CHECK (
        (
            timezone_confirmed_at IS NULL
            AND timezone_confirmation_source IS NULL
            AND timezone_confirmed_by IS NULL
        )
        OR (
            timezone_confirmed_at IS NOT NULL
            AND timezone_confirmation_source IS NOT NULL
        )
    );

CREATE OR REPLACE FUNCTION public.validate_hospital_timezone()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
    IF NEW.timezone IS NULL OR NOT EXISTS (
        SELECT 1
        FROM pg_timezone_names timezone_row
        WHERE timezone_row.name = NEW.timezone
    ) THEN
        RAISE EXCEPTION 'Invalid IANA timezone: %', COALESCE(NEW.timezone, '<null>');
    END IF;

    IF TG_OP = 'UPDATE'
       AND NEW.timezone IS DISTINCT FROM OLD.timezone
       AND NEW.timezone_confirmed_at IS NOT DISTINCT FROM OLD.timezone_confirmed_at
       AND NEW.timezone_confirmation_source IS NOT DISTINCT FROM OLD.timezone_confirmation_source
       AND NEW.timezone_confirmed_by IS NOT DISTINCT FROM OLD.timezone_confirmed_by THEN
        NEW.timezone_confirmed_at := NULL;
        NEW.timezone_confirmation_source := NULL;
        NEW.timezone_confirmed_by := NULL;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_hospital_timezone_value ON public.hospitals;
CREATE TRIGGER validate_hospital_timezone_value
BEFORE INSERT OR UPDATE OF timezone ON public.hospitals
FOR EACH ROW EXECUTE FUNCTION public.validate_hospital_timezone();

ALTER TABLE public.doctor_schedules
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.doctor_schedules
    DROP CONSTRAINT IF EXISTS doctor_schedules_time_order_check;
ALTER TABLE public.doctor_schedules
    ADD CONSTRAINT doctor_schedules_time_order_check
    CHECK (end_time > start_time);

ALTER TABLE public.doctor_schedules
    DROP CONSTRAINT IF EXISTS doctor_schedules_exact_shift_key;
ALTER TABLE public.doctor_schedules
    ADD CONSTRAINT doctor_schedules_exact_shift_key
    UNIQUE (doctor_id, date, start_time, end_time);
-- END SCHEDULED_VISITS_PROVIDER_TIME_SCHEMA

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

-- AUTOMATION: ORG/HOSPITAL TRIGGERS
CREATE TRIGGER handle_org_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_hosp_updated_at BEFORE UPDATE ON public.hospitals FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_doc_updated_at BEFORE UPDATE ON public.doctors FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
DROP TRIGGER IF EXISTS handle_doctor_schedule_updated_at ON public.doctor_schedules;
CREATE TRIGGER handle_doctor_schedule_updated_at BEFORE UPDATE ON public.doctor_schedules FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_eda_updated_at BEFORE UPDATE ON public.emergency_doctor_assignments FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER stamp_org_display_id BEFORE INSERT ON public.organizations FOR EACH ROW EXECUTE PROCEDURE public.stamp_entity_display_id();
CREATE TRIGGER stamp_hosp_display_id BEFORE INSERT ON public.hospitals FOR EACH ROW EXECUTE PROCEDURE public.stamp_entity_display_id();
CREATE TRIGGER stamp_doc_display_id BEFORE INSERT ON public.doctors FOR EACH ROW EXECUTE PROCEDURE public.stamp_entity_display_id();

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_doctors_hospital_specialty ON public.doctors(hospital_id, specialization);
CREATE INDEX IF NOT EXISTS idx_doctors_availability ON public.doctors(is_available, current_patients, max_patients);
CREATE INDEX IF NOT EXISTS idx_doctor_schedules_doctor_date ON public.doctor_schedules(doctor_id, date);
CREATE INDEX IF NOT EXISTS idx_doctor_schedules_available_window
    ON public.doctor_schedules(doctor_id, date, start_time, end_time)
    WHERE is_available = true;
CREATE INDEX IF NOT EXISTS idx_doctors_hospital_profile
    ON public.doctors(hospital_id, profile_id)
    WHERE profile_id IS NOT NULL;
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

-- 7. Provider Taxonomy (EXP-3 — Explore Care Refactor)
-- PULLBACK NOTE: Absorbed from 20260601000000_provider_taxonomy.sql into pillar per CONTRIBUTING.md
-- Adds discriminator columns to hospitals for multi-category provider support.
-- nearby_hospitals RPC update lives in 0100_core_rpcs (its canonical owner).

ALTER TABLE public.hospitals
  ADD COLUMN IF NOT EXISTS provider_type TEXT NOT NULL DEFAULT 'hospital',
  ADD COLUMN IF NOT EXISTS emergency_eligible BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS dispatch_eligible BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS booking_eligible BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS category_confidence NUMERIC(4,3) DEFAULT 0.99,
  ADD COLUMN IF NOT EXISTS provider_source TEXT DEFAULT 'manual_seed';

-- Backfill existing rows — all current rows are hospitals.
-- provider_source derived from place_id prefix conventions and verification_status.
UPDATE public.hospitals
SET
  provider_type       = 'hospital',
  emergency_eligible  = true,
  dispatch_eligible   = (verified = true OR verification_status IN ('verified', 'demo', 'partner')),
  booking_eligible    = true,
  category_confidence = CASE
    WHEN verified = true THEN 0.990
    WHEN verification_status LIKE 'demo%' THEN 0.990
    WHEN place_id LIKE 'demo:%' THEN 0.990
    WHEN place_id LIKE 'ChI%' THEN 0.750
    ELSE 0.990
  END,
  provider_source = CASE
    WHEN place_id LIKE 'demo:%' THEN 'demo_bootstrap'
    WHEN verification_status LIKE 'demo%' THEN 'demo_bootstrap'
    WHEN place_id LIKE 'ChI%' THEN 'google_places'
    WHEN verified = true THEN 'verified_provider'
    ELSE 'manual_seed'
  END
WHERE provider_type = 'hospital';

ALTER TABLE public.hospitals
  DROP CONSTRAINT IF EXISTS hospitals_provider_type_check;
ALTER TABLE public.hospitals
  ADD CONSTRAINT hospitals_provider_type_check
  CHECK (provider_type IN (
    'hospital', 'pharmacy', 'lab', 'radiology',
    'urgent_care', 'clinic', 'mental_health', 'womens_care', 'pediatrics'
  ));

ALTER TABLE public.hospitals
  DROP CONSTRAINT IF EXISTS hospitals_provider_source_check;
ALTER TABLE public.hospitals
  ADD CONSTRAINT hospitals_provider_source_check
  CHECK (provider_source IN (
    'google_places', 'mapbox_places', 'manual_seed',
    'verified_provider', 'demo_bootstrap'
  ));

CREATE INDEX IF NOT EXISTS idx_hospitals_provider_type
  ON public.hospitals(provider_type);

CREATE INDEX IF NOT EXISTS idx_hospitals_emergency_eligible
  ON public.hospitals(emergency_eligible)
  WHERE emergency_eligible = true;

CREATE INDEX IF NOT EXISTS idx_hospitals_dispatch_eligible
  ON public.hospitals(dispatch_eligible)
  WHERE dispatch_eligible = true;

CREATE INDEX IF NOT EXISTS idx_hospitals_provider_type_status
  ON public.hospitals(provider_type, status);

-- Trigger: keep dispatch_eligible in sync with emergency_eligible + verified
-- BEGIN CONSOLE_PROVIDER_ELIGIBILITY_FUNCTION
CREATE OR REPLACE FUNCTION public.sync_dispatch_eligibility()
RETURNS TRIGGER AS $$
BEGIN
  NEW.dispatch_eligible := (
    COALESCE(NEW.emergency_eligible, false) = true
    AND NEW.status = 'available'
    AND (
      COALESCE(NEW.verified, false) = true
      OR COALESCE(NEW.verification_status IN ('verified', 'partner'), false)
      OR COALESCE(NEW.place_id LIKE 'demo:%', false)
      OR COALESCE(NEW.verification_status LIKE 'demo%', false)
    )
  );
  NEW.booking_eligible := (NEW.status = 'available');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- END CONSOLE_PROVIDER_ELIGIBILITY_FUNCTION

DROP TRIGGER IF EXISTS trg_sync_dispatch_eligibility ON public.hospitals;
CREATE TRIGGER trg_sync_dispatch_eligibility
  BEFORE INSERT OR UPDATE OF emergency_eligible, verified, verification_status, status
  ON public.hospitals
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_dispatch_eligibility();

-- nearby_providers RPC — explore mode (no emergency filter, category-aware)
-- PULLBACK NOTE: EXPLORE-CARE-PERMANENT-FIX — Phase 3: Join with providers table
-- RLS: explore providers readable by authenticated users; verified/demo providers publicly readable
DROP POLICY IF EXISTS "Explore providers are publicly readable" ON public.hospitals;
CREATE POLICY "Explore providers are publicly readable"
ON public.hospitals
FOR SELECT
USING (
  verified = true
  OR verification_status IN ('verified', 'partner')
  OR place_id LIKE 'demo:%'
  OR verification_status LIKE 'demo%'
  OR (auth.uid() IS NOT NULL AND provider_type != 'hospital')
);
