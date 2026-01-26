-- Enhanced Driver Automation System
-- Automatic driver assignment, ambulance status updates, and bed count management

-- 1. Automatic Driver Assignment Function
CREATE OR REPLACE FUNCTION auto_assign_driver()
RETURNS TRIGGER AS $$
BEGIN
  -- Only auto-assign for ambulance requests without assigned driver
  IF NEW.service_type = 'ambulance' AND NEW.ambulance_id IS NULL THEN
    -- Find available ambulance with assigned driver
    UPDATE emergency_requests 
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
      FROM ambulances a
      JOIN profiles p ON a.profile_id = p.id
      WHERE a.status = 'available' 
        AND a.hospital_id = NEW.hospital_id
        AND p.provider_type = 'ambulance'
      ORDER BY a.created_at ASC
      LIMIT 1
    ) sub
    WHERE emergency_requests.id = NEW.id;
    
    -- Update ambulance status to on_trip
    UPDATE ambulances 
    SET status = 'on_trip' 
    WHERE id = (SELECT ambulance_id FROM emergency_requests WHERE id = NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create trigger for automatic driver assignment
DROP TRIGGER IF EXISTS on_emergency_request_auto_assign_driver ON emergency_requests;
CREATE TRIGGER on_emergency_request_auto_assign_driver
  AFTER INSERT ON emergency_requests
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_driver();

-- 3. Ambulance Status Update Function
CREATE OR REPLACE FUNCTION update_ambulance_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update ambulance status based on request status
  IF OLD.status != NEW.status THEN
    CASE NEW.status
      WHEN 'completed' THEN
        UPDATE ambulances SET status = 'available' WHERE id = NEW.ambulance_id;
      WHEN 'cancelled' THEN
        UPDATE ambulances SET status = 'available' WHERE id = NEW.ambulance_id;
      WHEN 'in_progress' THEN
        UPDATE ambulances SET status = 'on_trip' WHERE id = NEW.ambulance_id;
      WHEN 'accepted' THEN
        UPDATE ambulances SET status = 'on_trip' WHERE id = NEW.ambulance_id;
    END CASE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger for ambulance status updates
DROP TRIGGER IF EXISTS on_emergency_request_update_ambulance_status ON emergency_requests;
CREATE TRIGGER on_emergency_request_update_ambulance_status
  AFTER UPDATE ON emergency_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_ambulance_status();

-- 5. Bed Count Management Function
CREATE OR REPLACE FUNCTION update_bed_availability()
RETURNS TRIGGER AS $$
BEGIN
  -- Update hospital bed counts based on bed booking status
  IF OLD.status != NEW.status THEN
    CASE NEW.status
      WHEN 'in_progress' THEN
        -- Reserve bed
        UPDATE hospitals 
        SET available_beds = GREATEST(0, available_beds - 1)
        WHERE id = NEW.hospital_id;
      WHEN 'completed' THEN
        -- Free up bed
        UPDATE hospitals 
        SET available_beds = available_beds + 1
        WHERE id = NEW.hospital_id;
      WHEN 'cancelled' THEN
        -- Free up bed
        UPDATE hospitals 
        SET available_beds = available_beds + 1
        WHERE id = NEW.hospital_id;
    END CASE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger for bed count updates
DROP TRIGGER IF EXISTS on_emergency_request_update_bed_availability ON emergency_requests;
CREATE TRIGGER on_emergency_request_update_bed_availability
  AFTER UPDATE ON emergency_requests
  FOR EACH ROW
  WHEN (OLD.service_type = 'bed' OR NEW.service_type = 'bed')
  EXECUTE FUNCTION update_bed_availability();

-- 7. Enhanced complete_trip function with ambulance status update
CREATE OR REPLACE FUNCTION complete_trip(request_uuid TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE emergency_requests 
  SET status = 'completed'
  WHERE id = request_uuid AND service_type = 'ambulance';
  
  -- The trigger will automatically update ambulance status
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 8. Enhanced cancel_trip function with ambulance status update
CREATE OR REPLACE FUNCTION cancel_trip(request_uuid TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE emergency_requests 
  SET status = 'cancelled'
  WHERE id = request_uuid AND service_type = 'ambulance';
  
  -- The trigger will automatically update ambulance status
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 9. Enhanced discharge_patient function with bed count update
CREATE OR REPLACE FUNCTION discharge_patient(request_uuid TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE emergency_requests 
  SET status = 'completed'
  WHERE id = request_uuid AND service_type = 'bed';
  
  -- The trigger will automatically update bed count
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 10. Enhanced cancel_bed_reservation function with bed count update
CREATE OR REPLACE FUNCTION cancel_bed_reservation(request_uuid TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE emergency_requests 
  SET status = 'cancelled'
  WHERE id = request_uuid AND service_type = 'bed';
  
  -- The trigger will automatically update bed count
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION auto_assign_driver() TO authenticated;
GRANT EXECUTE ON FUNCTION update_ambulance_status() TO authenticated;
GRANT EXECUTE ON FUNCTION update_bed_availability() TO authenticated;
GRANT EXECUTE ON FUNCTION complete_trip(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_trip(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION discharge_patient(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_bed_reservation(TEXT) TO authenticated;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
