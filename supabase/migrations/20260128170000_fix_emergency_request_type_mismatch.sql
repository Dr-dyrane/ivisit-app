-- Fix type mismatch error 42804 in emergency request triggers
-- Ensures hospital_id (text) can be safely compared with UUID columns

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 1: Column Type & RLS Policy Fix
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Temporarily drop the policy that depends on hospital_id
DROP POLICY IF EXISTS "Org Admins manage hospital emergencies" ON public.emergency_requests;

-- 2. Identify and drop any foreign key constraints on hospital_id
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT constraint_name 
        FROM information_schema.key_column_usage 
        WHERE table_name = 'emergency_requests' 
        AND column_name = 'hospital_id'
        AND table_schema = 'public'
    ) LOOP
        EXECUTE 'ALTER TABLE public.emergency_requests DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name) || ' CASCADE';
    END LOOP;
END $$;

-- 3. Convert the column to TEXT
-- This allows Google Place IDs (e.g., 'google_...') while keeping UUIDs valid as text
ALTER TABLE public.emergency_requests 
ALTER COLUMN hospital_id TYPE TEXT;

-- 4. Recreate the RLS policy for Org Admins
-- This policy uses get_current_user_org_id()::text which works perfectly with the new TEXT column
CREATE POLICY "Org Admins manage hospital emergencies" 
ON public.emergency_requests FOR ALL 
USING ( hospital_id = public.get_current_user_org_id()::text );

-- 5. Update comments for clarity
COMMENT ON COLUMN public.emergency_requests.hospital_id IS 'Stored as text to support both internal UUIDs and external Google Place IDs';

-- 6. Fix visits table hospital_id type (to support Google Place IDs in the data bridge)
-- Drop any foreign key constraints on visits.hospital_id
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT constraint_name 
        FROM information_schema.key_column_usage 
        WHERE table_name = 'visits' 
        AND column_name = 'hospital_id'
        AND table_schema = 'public'
    ) LOOP
        EXECUTE 'ALTER TABLE public.visits DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name) || ' CASCADE';
    END LOOP;
END $$;

-- Convert visits.hospital_id to TEXT
ALTER TABLE public.visits 
ALTER COLUMN hospital_id TYPE TEXT;

-- Update comment
COMMENT ON COLUMN public.visits.hospital_id IS 'Stored as text to support both internal UUIDs and external Google Place IDs';


-- ═══════════════════════════════════════════════════════════════════════════
-- PART 2: Trigger Functions Fix
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Update auto_assign_driver to handle text hospital_id
CREATE OR REPLACE FUNCTION public.auto_assign_driver()
RETURNS TRIGGER AS $$
BEGIN
  -- Only auto-assign for ambulance requests without assigned driver
  IF NEW.service_type = 'ambulance' AND NEW.ambulance_id IS NULL THEN
    -- Find available ambulance with assigned driver
    UPDATE public.emergency_requests 
    SET 
      ambulance_id = sub.ambulance_id,
      responder_id = sub.driver_id,
      responder_name = sub.driver_name,
      responder_phone = sub.driver_phone,
      responder_vehicle_type = sub.ambulance_type,
      responder_vehicle_plate = sub.vehicle_number
    FROM (
      SELECT 
        a.id as ambulance_id,
        a.profile_id as driver_id,
        p.full_name as driver_name,
        p.phone as driver_phone,
        a.type as ambulance_type,
        a.vehicle_number,
        a.hospital_id
      FROM public.ambulances a
      JOIN public.profiles p ON a.profile_id = p.id
      WHERE a.status = 'available' 
        AND a.hospital_id::text = NEW.hospital_id::text -- Safe comparison
        AND p.provider_type = 'ambulance'
      ORDER BY a.created_at ASC
      LIMIT 1
    ) sub
    WHERE public.emergency_requests.id = NEW.id;
    
    -- Update ambulance status to on_trip
    UPDATE public.ambulances 
    SET status = 'on_trip' 
    WHERE id::text = (SELECT ambulance_id FROM public.emergency_requests WHERE id = NEW.id LIMIT 1);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update update_bed_availability to handle text hospital_id
CREATE OR REPLACE FUNCTION public.update_bed_availability()
RETURNS TRIGGER AS $$
BEGIN
  -- Update hospital bed counts based on bed booking status
  IF OLD.status IS NULL OR OLD.status != NEW.status THEN
    CASE NEW.status
      WHEN 'in_progress' THEN
        -- Reserve bed
        UPDATE public.hospitals 
        SET available_beds = GREATEST(0, available_beds - 1)
        WHERE id::text = NEW.hospital_id::text; -- Safe comparison
      WHEN 'completed' THEN
        -- Free up bed
        UPDATE public.hospitals 
        SET available_beds = available_beds + 1
        WHERE id::text = NEW.hospital_id::text; -- Safe comparison
      WHEN 'cancelled' THEN
        -- Free up bed
        UPDATE public.hospitals 
        SET available_beds = available_beds + 1
        WHERE id::text = NEW.hospital_id::text; -- Safe comparison
    END CASE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update auto_assign_doctor to handle text hospital_id
CREATE OR REPLACE FUNCTION public.auto_assign_doctor()
RETURNS TRIGGER AS $$
DECLARE
  selected_doctor_id UUID;
  emergency_specialty VARCHAR(100);
BEGIN
  -- Only assign for emergency requests that are accepted/in_progress
  IF NEW.status IN ('accepted', 'in_progress') AND (OLD.status IS NULL OR OLD.status NOT IN ('accepted', 'in_progress')) THEN
    
    -- Determine required specialty based on service type
    CASE NEW.service_type
      WHEN 'ambulance' THEN emergency_specialty := 'Emergency Medicine';
      WHEN 'bed' THEN emergency_specialty := 'Internal Medicine';
      ELSE emergency_specialty := 'Emergency Medicine';
    END CASE;
    
    -- Find available doctor with matching specialty and hospital
    SELECT d.id INTO selected_doctor_id
    FROM public.doctors d
    LEFT JOIN public.emergency_doctor_assignments eda ON d.id = eda.doctor_id 
      AND eda.status NOT IN ('completed', 'cancelled')
    WHERE d.hospital_id::text = NEW.hospital_id::text -- Safe comparison
      AND d.specialty = emergency_specialty
      AND d.is_available = true
      AND d.current_patients < d.max_patients
      AND eda.id IS NULL
    ORDER BY d.current_patients ASC, d.created_at ASC
    LIMIT 1;
    
    -- If doctor found, create assignment
    IF selected_doctor_id IS NOT NULL THEN
      INSERT INTO public.emergency_doctor_assignments (
        emergency_request_id,
        doctor_id,
        status
      ) VALUES (
        NEW.id,
        selected_doctor_id,
        'assigned'
      ) ON CONFLICT DO NOTHING;
      
      -- Update doctor's current patient count
      UPDATE public.doctors 
      SET current_patients = current_patients + 1,
          updated_at = NOW()
      WHERE id = selected_doctor_id;
      
      -- Update emergency request with assigned doctor info
      UPDATE public.emergency_requests 
      SET 
        assigned_doctor_id = selected_doctor_id,
        doctor_assigned_at = NOW()
      WHERE id = NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update get_available_doctors to handle text hospital_id param
-- We'll create a new version that takes TEXT to handle Google Place IDs gracefully
CREATE OR REPLACE FUNCTION public.get_available_doctors_v2(hospital_id_text TEXT, specialty_param VARCHAR DEFAULT NULL)
RETURNS TABLE(
  doctor_id uuid,
  doctor_name text,
  specialty varchar,
  current_patients integer,
  max_patients integer,
  availability_status varchar
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    p.full_name,
    d.specialty,
    d.current_patients,
    d.max_patients,
    CASE 
      WHEN d.is_available AND d.current_patients < d.max_patients THEN 'Available'::varchar
      WHEN d.is_available THEN 'Full Capacity'::varchar
      ELSE 'Unavailable'::varchar
    END as availability_status
  FROM public.doctors d
  JOIN public.profiles p ON d.profile_id = p.id
  WHERE d.hospital_id::text = hospital_id_text -- Safe comparison
    AND (specialty_param IS NULL OR d.specialty = specialty_param)
  ORDER BY 
    CASE 
      WHEN d.is_available AND d.current_patients < d.max_patients THEN 1
      ELSE 2
    END,
    d.current_patients ASC,
    p.full_name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_available_doctors_v2(TEXT, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_doctors_v2(TEXT, VARCHAR) TO service_role;

-- Re-apply triggers just in case
DROP TRIGGER IF EXISTS on_emergency_request_auto_assign_driver ON public.emergency_requests;
CREATE TRIGGER on_emergency_request_auto_assign_driver
  AFTER INSERT ON public.emergency_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_driver();

DROP TRIGGER IF EXISTS on_emergency_request_update_bed_availability ON public.emergency_requests;
CREATE TRIGGER on_emergency_request_update_bed_availability
  AFTER UPDATE ON public.emergency_requests
  FOR EACH ROW
  WHEN (OLD.service_type = 'bed' OR NEW.service_type = 'bed')
  EXECUTE FUNCTION public.update_bed_availability();

DROP TRIGGER IF EXISTS on_emergency_request_auto_assign_doctor ON public.emergency_requests;
CREATE TRIGGER on_emergency_request_auto_assign_doctor
  AFTER UPDATE ON public.emergency_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_doctor();
