-- Doctor Assignment System for Uber-style Hospital Platform
-- Automatic doctor assignment when emergencies are accepted

-- Doctors table (extend existing profiles)
CREATE TABLE IF NOT EXISTS doctors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) UNIQUE,
  hospital_id UUID REFERENCES hospitals(id),
  specialty VARCHAR(100) NOT NULL,
  license_number VARCHAR(100) UNIQUE,
  is_available BOOLEAN DEFAULT true,
  is_on_call BOOLEAN DEFAULT false,
  max_patients INTEGER DEFAULT 10,
  current_patients INTEGER DEFAULT 0,
  department VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Doctor schedules table
CREATE TABLE IF NOT EXISTS doctor_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID REFERENCES doctors(id),
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  shift_type VARCHAR(20) NOT NULL, -- 'day', 'evening', 'night'
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Emergency doctor assignments table
CREATE TABLE IF NOT EXISTS emergency_doctor_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  emergency_request_id UUID REFERENCES emergency_requests(id),
  doctor_id UUID REFERENCES doctors(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'assigned', -- 'assigned', 'accepted', 'completed', 'cancelled'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample doctors (for demo)
INSERT INTO doctors (profile_id, hospital_id, specialty, license_number, department) VALUES
-- These would be real profile IDs from your users table
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Emergency Medicine', 'EM001', 'Emergency'),
('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Emergency Medicine', 'EM002', 'Emergency'),
('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'General Surgery', 'GS001', 'Emergency'),
('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Internal Medicine', 'IM001', 'Emergency')
ON CONFLICT (license_number) DO NOTHING;

-- Function to automatically assign doctor to emergency
CREATE OR REPLACE FUNCTION auto_assign_doctor()
RETURNS TRIGGER AS $$
DECLARE
  selected_doctor_id UUID;
  emergency_specialty VARCHAR(100);
BEGIN
  -- Only assign for emergency requests that are accepted/in_progress
  IF NEW.status IN ('accepted', 'in_progress') AND OLD.status NOT IN ('accepted', 'in_progress') THEN
    
    -- Determine required specialty based on service type
    CASE NEW.service_type
      WHEN 'ambulance' THEN emergency_specialty := 'Emergency Medicine';
      WHEN 'bed' THEN emergency_specialty := 'Internal Medicine';
      ELSE emergency_specialty := 'Emergency Medicine';
    END CASE;
    
    -- Find available doctor with matching specialty and hospital
    SELECT d.id INTO selected_doctor_id
    FROM doctors d
    LEFT JOIN emergency_doctor_assignments eda ON d.id = eda.doctor_id 
      AND eda.status NOT IN ('completed', 'cancelled')
    WHERE d.hospital_id = NEW.hospital_id
      AND d.specialty = emergency_specialty
      AND d.is_available = true
      AND d.current_patients < d.max_patients
      AND eda.id IS NULL
    ORDER BY d.current_patients ASC, d.created_at ASC
    LIMIT 1;
    
    -- If doctor found, create assignment
    IF selected_doctor_id IS NOT NULL THEN
      INSERT INTO emergency_doctor_assignments (
        emergency_request_id,
        doctor_id,
        status
      ) VALUES (
        NEW.id,
        selected_doctor_id,
        'assigned'
      );
      
      -- Update doctor's current patient count
      UPDATE doctors 
      SET current_patients = current_patients + 1,
          updated_at = NOW()
      WHERE id = selected_doctor_id;
      
      -- Update emergency request with assigned doctor info
      UPDATE emergency_requests 
      SET 
        assigned_doctor_id = selected_doctor_id,
        doctor_assigned_at = NOW()
      WHERE id = NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to release doctor when emergency is completed
CREATE OR REPLACE FUNCTION release_doctor_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Release doctor when emergency is completed or cancelled
  IF OLD.status NOT IN ('completed', 'cancelled') AND NEW.status IN ('completed', 'cancelled') THEN
    -- Update doctor assignment status
    UPDATE emergency_doctor_assignments 
    SET 
      status = CASE WHEN NEW.status = 'completed' THEN 'completed' ELSE 'cancelled' END,
      updated_at = NOW()
    WHERE emergency_request_id = NEW.id AND status = 'assigned';
    
    -- Decrease doctor's current patient count
    UPDATE doctors 
    SET current_patients = GREATEST(0, current_patients - 1),
        updated_at = NOW()
    WHERE id = (
      SELECT doctor_id FROM emergency_doctor_assignments 
      WHERE emergency_request_id = NEW.id AND status IN ('completed', 'cancelled')
      LIMIT 1
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic doctor assignment
DROP TRIGGER IF EXISTS on_emergency_request_auto_assign_doctor ON emergency_requests;
CREATE TRIGGER on_emergency_request_auto_assign_doctor
  AFTER UPDATE ON emergency_requests
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_doctor();

DROP TRIGGER IF EXISTS on_emergency_request_release_doctor ON emergency_requests;
CREATE TRIGGER on_emergency_request_release_doctor
  AFTER UPDATE ON emergency_requests
  FOR EACH ROW
  EXECUTE FUNCTION release_doctor_assignment();

-- Function to get available doctors for a hospital
CREATE OR REPLACE FUNCTION get_available_doctors(hospital_id_param UUID, specialty_param VARCHAR DEFAULT NULL)
RETURNS TABLE(
  doctor_id UUID,
  doctor_name TEXT,
  specialty VARCHAR,
  current_patients INTEGER,
  max_patients INTEGER,
  availability_status VARCHAR
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
      WHEN d.is_available AND d.current_patients < d.max_patients THEN 'Available'
      WHEN d.is_available THEN 'Full Capacity'
      ELSE 'Unavailable'
    END as availability_status
  FROM doctors d
  JOIN profiles p ON d.profile_id = p.id
  WHERE d.hospital_id = hospital_id_param
    AND (specialty_param IS NULL OR d.specialty = specialty_param)
  ORDER BY 
    CASE 
      WHEN d.is_available AND d.current_patients < d.max_patients THEN 1
      ELSE 2
    END,
    d.current_patients ASC,
    p.full_name ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to manually assign doctor to emergency
CREATE OR REPLACE FUNCTION assign_doctor_to_emergency(
  emergency_request_id_param UUID,
  doctor_id_param UUID,
  notes_param TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  doctor_available BOOLEAN;
BEGIN
  -- Check if doctor is available
  SELECT (d.is_available AND d.current_patients < d.max_patients) INTO doctor_available
  FROM doctors d
  WHERE d.id = doctor_id_param;
  
  IF NOT doctor_available THEN
    RETURN FALSE;
  END IF;
  
  -- Create assignment
  INSERT INTO emergency_doctor_assignments (
    emergency_request_id,
    doctor_id,
    status,
    notes
  ) VALUES (
    emergency_request_id_param,
    doctor_id_param,
    'assigned',
    notes_param
  );
  
  -- Update doctor's current patient count
  UPDATE doctors 
  SET current_patients = current_patients + 1,
      updated_at = NOW()
  WHERE id = doctor_id_param;
  
  -- Update emergency request
  UPDATE emergency_requests 
  SET 
    assigned_doctor_id = doctor_id_param,
    doctor_assigned_at = NOW()
  WHERE id = emergency_request_id_param;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Indexes for performance
CREATE INDEX idx_doctors_hospital_specialty ON doctors(hospital_id, specialty);
CREATE INDEX idx_doctors_availability ON doctors(is_available, current_patients, max_patients);
CREATE INDEX idx_doctor_schedules_doctor_date ON doctor_schedules(doctor_id, date);
CREATE INDEX idx_emergency_doctor_assignments_request ON emergency_doctor_assignments(emergency_request_id);
CREATE INDEX idx_emergency_doctor_assignments_doctor ON emergency_doctor_assignments(doctor_id);

-- RLS Policies
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_doctor_assignments ENABLE ROW LEVEL SECURITY;

-- Doctors policies
CREATE POLICY "Org admins view hospital doctors" ON doctors
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM profiles 
      WHERE role = 'org_admin' AND organization_id = hospital_id
    )
  );

CREATE POLICY "Admins manage all doctors" ON doctors
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM profiles WHERE role = 'admin'
    )
  );

-- Doctor schedules policies
CREATE POLICY "Org admins view hospital doctor schedules" ON doctor_schedules
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM profiles 
      WHERE role = 'org_admin' AND organization_id = (
        SELECT hospital_id FROM doctors WHERE id = doctor_schedules.doctor_id
      )
    )
  );

-- Emergency doctor assignments policies
CREATE POLICY "Org admins view hospital assignments" ON emergency_doctor_assignments
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM profiles 
      WHERE role = 'org_admin' AND organization_id = (
        SELECT hospital_id FROM emergency_requests WHERE id = emergency_doctor_assignments.emergency_request_id
      )
    )
  );

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_available_doctors TO authenticated;
GRANT EXECUTE ON FUNCTION assign_doctor_to_emergency TO authenticated;
