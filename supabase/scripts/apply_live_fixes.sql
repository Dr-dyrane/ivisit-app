-- 🏯 ID BEAUTIFICATION & RESOLUTION REFINEMENTS
-- This script applies the latest refinements for Role-Based ID Beautification 
-- to the live database, ensuring parity with the source migrations.

BEGIN;

-- 1. Update the Stamping Function (Role-Aware)
CREATE OR REPLACE FUNCTION public.stamp_entity_display_id()
RETURNS TRIGGER AS $$
DECLARE
    v_prefix TEXT;
    v_role TEXT;
    v_type TEXT;
BEGIN
    -- Determine Prefix Based on Table and Role
    CASE TG_TABLE_NAME
        WHEN 'profiles' THEN 
            -- Granular User Beautification
            v_role := NEW.role;
            v_type := NEW.provider_type;
            
            IF v_role = 'admin' THEN v_prefix := 'ADM';
            ELSIF v_role = 'patient' THEN v_prefix := 'PAT';
            ELSIF v_role = 'dispatcher' THEN v_prefix := 'DPC';
            ELSIF v_role = 'org_admin' THEN v_prefix := 'OAD';
            ELSIF v_role = 'provider' THEN
                CASE v_type
                    WHEN 'doctor' THEN v_prefix := 'DOC';
                    WHEN 'driver' THEN v_prefix := 'DRV';
                    WHEN 'paramedic' THEN v_prefix := 'PMD';
                    WHEN 'ambulance_service' THEN v_prefix := 'AMS';
                    WHEN 'pharmacy' THEN v_prefix := 'PHR';
                    WHEN 'clinic' THEN v_prefix := 'CLN';
                    ELSE v_prefix := 'PRO';
                END CASE;
            ELSE v_prefix := 'USR';
            END IF;
            
        WHEN 'organizations' THEN v_prefix := 'ORG';
        WHEN 'hospitals' THEN v_prefix := 'HSP';
        WHEN 'doctors' THEN v_prefix := 'DOC';
        WHEN 'ambulances' THEN v_prefix := 'AMB';
        WHEN 'emergency_requests' THEN v_prefix := 'REQ';
        WHEN 'visits' THEN v_prefix := 'VIST';
        WHEN 'payments' THEN v_prefix := 'PAY';
        WHEN 'notifications' THEN v_prefix := 'NTF';
        WHEN 'patient_wallets' THEN v_prefix := 'WLT';
        WHEN 'organization_wallets' THEN v_prefix := 'OWL';
        ELSE v_prefix := 'ID';
    END CASE;

    -- Generate and set Display ID on current record
    IF TG_OP = 'INSERT' AND NEW.display_id IS NULL THEN
        NEW.display_id := public.generate_display_id(v_prefix);
    ELSIF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'profiles' THEN
        -- Keep profile display IDs aligned with role/type prefix as account role evolves.
        IF NEW.display_id IS NULL OR LEFT(NEW.display_id, 3) != v_prefix THEN
            NEW.display_id := public.generate_display_id(v_prefix);
        END IF;
    END IF;

    -- Sync to Central Registry
    IF TG_OP = 'INSERT' THEN
        -- Map plural table names to canonical id_mappings entity_type values.
        v_type := CASE
            WHEN TG_TABLE_NAME = 'profiles' THEN COALESCE(v_role, 'patient')
            WHEN TG_TABLE_NAME = 'organizations' THEN 'organization'
            WHEN TG_TABLE_NAME = 'hospitals' THEN 'hospital'
            WHEN TG_TABLE_NAME = 'doctors' THEN 'doctor'
            WHEN TG_TABLE_NAME = 'ambulances' THEN 'ambulance'
            WHEN TG_TABLE_NAME = 'emergency_requests' THEN 'emergency_request'
            WHEN TG_TABLE_NAME = 'visits' THEN 'visit'
            WHEN TG_TABLE_NAME = 'payments' THEN 'payment'
            WHEN TG_TABLE_NAME = 'notifications' THEN 'notification'
            WHEN TG_TABLE_NAME IN ('patient_wallets', 'organization_wallets') THEN 'wallet'
            ELSE 'patient'
        END;

        INSERT INTO public.id_mappings (entity_id, display_id, entity_type)
        VALUES (NEW.id, NEW.display_id, v_type)
        ON CONFLICT (display_id) DO NOTHING;
    ELSIF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'profiles' AND NEW.display_id IS DISTINCT FROM OLD.display_id THEN
        v_type := COALESCE(NEW.role, 'patient');
        UPDATE public.id_mappings
        SET display_id = NEW.display_id,
            entity_type = v_type
        WHERE entity_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update the Resolver (Universal)
CREATE OR REPLACE FUNCTION public.get_entity_id(p_display_id TEXT)
RETURNS UUID AS $$
DECLARE
    v_prefix TEXT;
    v_id UUID;
BEGIN
    v_prefix := SPLIT_PART(p_display_id, '-', 1);
    
    CASE v_prefix
        WHEN 'PAT', 'ADM', 'DPC', 'OAD', 'PRO', 'DOC', 'DRV', 'PMD', 'AMS', 'PHR', 'CLN', 'USR' THEN 
            SELECT id INTO v_id FROM public.profiles WHERE display_id = p_display_id;
        WHEN 'HSP' THEN SELECT id INTO v_id FROM public.hospitals WHERE display_id = p_display_id;
        WHEN 'ORG' THEN SELECT id INTO v_id FROM public.organizations WHERE display_id = p_display_id;
        WHEN 'AMB' THEN SELECT id INTO v_id FROM public.ambulances WHERE display_id = p_display_id;
        WHEN 'REQ' THEN SELECT id INTO v_id FROM public.emergency_requests WHERE display_id = p_display_id;
        WHEN 'VIST' THEN SELECT id INTO v_id FROM public.visits WHERE display_id = p_display_id;
        WHEN 'PAY' THEN SELECT id INTO v_id FROM public.payments WHERE display_id = p_display_id;
        WHEN 'NTF' THEN SELECT id INTO v_id FROM public.notifications WHERE display_id = p_display_id;
        WHEN 'WLT' THEN SELECT id INTO v_id FROM public.patient_wallets WHERE display_id = p_display_id;
        WHEN 'OWL' THEN SELECT id INTO v_id FROM public.organization_wallets WHERE display_id = p_display_id;
        ELSE 
            SELECT entity_id INTO v_id FROM public.id_mappings WHERE display_id = p_display_id;
    END CASE;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 3. Ensure Triggers are Active on Missing Modules
DO $$
BEGIN
    -- Finance Triggers
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'stamp_pay_display_id') THEN
        CREATE TRIGGER stamp_pay_display_id BEFORE INSERT ON public.payments FOR EACH ROW EXECUTE PROCEDURE public.stamp_entity_display_id();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'stamp_pat_wallet_display_id') THEN
        CREATE TRIGGER stamp_pat_wallet_display_id BEFORE INSERT ON public.patient_wallets FOR EACH ROW EXECUTE PROCEDURE public.stamp_entity_display_id();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'stamp_org_wallet_display_id') THEN
        CREATE TRIGGER stamp_org_wallet_display_id BEFORE INSERT ON public.organization_wallets FOR EACH ROW EXECUTE PROCEDURE public.stamp_entity_display_id();
    END IF;

    -- Ops Triggers
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'stamp_ntf_display_id') THEN
        CREATE TRIGGER stamp_ntf_display_id BEFORE INSERT ON public.notifications FOR EACH ROW EXECUTE PROCEDURE public.stamp_entity_display_id();
    END IF;
END $$;

COMMIT;

-- 5. Hospitals RLS visibility fix (admin parity + imported hospitals visibility for admins)
BEGIN;

DROP POLICY IF EXISTS "Public read for verified hospitals" ON public.hospitals;
CREATE POLICY "Public read for verified hospitals"
ON public.hospitals FOR SELECT
USING (
    verified = true
    OR organization_id = public.p_get_current_org_id()
    OR public.p_is_admin()
);

COMMIT;

-- 6. Nearby hospital geospatial fix (meters-safe geography distance)
BEGIN;

CREATE OR REPLACE FUNCTION public.nearby_hospitals(user_lat DOUBLE PRECISION, user_lng DOUBLE PRECISION, radius_km INTEGER DEFAULT 15)
RETURNS TABLE (
    id UUID,
    name TEXT,
    address TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    distance DOUBLE PRECISION,
    verified BOOLEAN,
    status TEXT,
    display_id TEXT
) AS $$
DECLARE
    v_user_location GEOGRAPHY;
BEGIN
    v_user_location := ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::GEOGRAPHY;
    
    RETURN QUERY
    SELECT 
        h.id, h.name, h.address, h.latitude, h.longitude,
        ST_Distance(
            COALESCE(
                h.coordinates,
                ST_SetSRID(ST_MakePoint(h.longitude, h.latitude), 4326)
            )::GEOGRAPHY,
            v_user_location
        ) / 1000 AS distance,
        h.verified, h.status, h.display_id
    FROM public.hospitals h
    WHERE ST_DWithin(
        COALESCE(
            h.coordinates,
            ST_SetSRID(ST_MakePoint(h.longitude, h.latitude), 4326)
        )::GEOGRAPHY,
        v_user_location,
        radius_km * 1000
    )
    ORDER BY distance ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMIT;

-- 4. Emergency doctor auto-assignment resilience patch (non-destructive)
BEGIN;

CREATE OR REPLACE FUNCTION public.auto_assign_doctor()
RETURNS TRIGGER AS $$
DECLARE
    v_doctor_id UUID;
    v_specialty TEXT;
    v_should_attempt BOOLEAN := FALSE;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        v_should_attempt := NEW.status IN ('accepted', 'in_progress')
            AND (
                OLD.status IS DISTINCT FROM NEW.status
                OR OLD.ambulance_id IS DISTINCT FROM NEW.ambulance_id
                OR OLD.responder_id IS DISTINCT FROM NEW.responder_id
                OR OLD.hospital_id IS DISTINCT FROM NEW.hospital_id
            );
    END IF;

    IF NOT v_should_attempt OR NEW.hospital_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.assigned_doctor_id IS NOT NULL OR EXISTS (
        SELECT 1
        FROM public.emergency_doctor_assignments eda
        WHERE eda.emergency_request_id = NEW.id
          AND eda.status = 'assigned'
    ) THEN
        RETURN NEW;
    END IF;

    v_specialty := CASE NEW.service_type
        WHEN 'ambulance' THEN 'Emergency Medicine'
        WHEN 'bed' THEN 'Internal Medicine'
        ELSE 'Emergency Medicine'
    END;

    SELECT d.id INTO v_doctor_id
    FROM public.doctors d
    WHERE d.hospital_id = NEW.hospital_id
      AND d.is_available = true
      AND COALESCE(d.current_patients, 0) < COALESCE(NULLIF(d.max_patients, 0), 1)
      AND (
            d.specialization = v_specialty
            OR NOT EXISTS (
                SELECT 1
                FROM public.doctors ds
                WHERE ds.hospital_id = NEW.hospital_id
                  AND ds.is_available = true
                  AND COALESCE(ds.current_patients, 0) < COALESCE(NULLIF(ds.max_patients, 0), 1)
                  AND ds.specialization = v_specialty
            )
      )
    ORDER BY
      CASE WHEN d.specialization = v_specialty THEN 0 ELSE 1 END,
      COALESCE(d.current_patients, 0) ASC,
      d.created_at ASC
    LIMIT 1;

    IF v_doctor_id IS NOT NULL THEN
        INSERT INTO public.emergency_doctor_assignments (emergency_request_id, doctor_id, status)
        VALUES (NEW.id, v_doctor_id, 'assigned');

        UPDATE public.doctors
        SET current_patients = COALESCE(current_patients, 0) + 1,
            updated_at = NOW()
        WHERE id = v_doctor_id;

        UPDATE public.emergency_requests
        SET assigned_doctor_id = v_doctor_id,
            doctor_assigned_at = NOW()
        WHERE id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_emergency_auto_assign_doctor ON public.emergency_requests;
CREATE TRIGGER on_emergency_auto_assign_doctor
AFTER UPDATE ON public.emergency_requests
FOR EACH ROW EXECUTE PROCEDURE public.auto_assign_doctor();

COMMIT;
