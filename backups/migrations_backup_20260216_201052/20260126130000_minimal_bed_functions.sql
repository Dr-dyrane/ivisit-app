-- Minimal bed management functions

-- Simple function to discharge patient
CREATE OR REPLACE FUNCTION discharge_patient(request_uuid TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE emergency_requests 
  SET status = 'completed'
  WHERE id = request_uuid AND service_type = 'bed';
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Simple function to cancel reservation
CREATE OR REPLACE FUNCTION cancel_bed_reservation(request_uuid TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE emergency_requests 
  SET status = 'cancelled'
  WHERE id = request_uuid AND service_type = 'bed';
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION discharge_patient(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_bed_reservation(TEXT) TO authenticated;
