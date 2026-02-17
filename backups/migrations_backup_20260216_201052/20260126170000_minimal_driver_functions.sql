-- Minimal Driver Functions

-- Simple function to complete trip
CREATE OR REPLACE FUNCTION complete_trip(request_uuid TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE emergency_requests 
  SET status = 'completed'
  WHERE id = request_uuid AND service_type = 'ambulance';
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Simple function to cancel trip
CREATE OR REPLACE FUNCTION cancel_trip(request_uuid TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE emergency_requests 
  SET status = 'cancelled'
  WHERE id = request_uuid AND service_type = 'ambulance';
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION complete_trip(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_trip(TEXT) TO authenticated;
