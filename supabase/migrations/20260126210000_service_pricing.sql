-- Service Pricing System for Uber-style Hospital Platform
-- Simple pricing structure for emergency services and room types

-- Service pricing table
CREATE TABLE IF NOT EXISTS service_pricing (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_type VARCHAR(50) NOT NULL, -- 'ambulance', 'bed', 'consultation', 'procedure'
  service_name VARCHAR(100) NOT NULL,
  base_price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  hospital_id UUID REFERENCES hospitals(id), -- NULL for global pricing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Room type pricing table
CREATE TABLE IF NOT EXISTS room_pricing (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_type VARCHAR(50) NOT NULL, -- 'general', 'private', 'icu', 'emergency', 'maternity'
  room_name VARCHAR(100) NOT NULL,
  price_per_night DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  hospital_id UUID REFERENCES hospitals(id), -- NULL for global pricing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment transactions table (Gumroad integration)
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id VARCHAR(100) UNIQUE NOT NULL, -- Gumroad transaction ID
  emergency_request_id UUID REFERENCES emergency_requests(id),
  user_id UUID REFERENCES auth.users(id),
  hospital_id UUID REFERENCES hospitals(id),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
  payment_method VARCHAR(50) DEFAULT 'gumroad',
  gumroad_product_id VARCHAR(100),
  gumroad_customer_id VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default service pricing
INSERT INTO service_pricing (service_type, service_name, base_price, description) VALUES
('ambulance', 'Basic Ambulance Service', 50.00, 'Standard ambulance dispatch and transport'),
('ambulance', 'Advanced Life Support', 150.00, 'ALS ambulance with medical equipment'),
('ambulance', 'Emergency Response', 100.00, 'Priority emergency response'),
('bed', 'Emergency Bed Reservation', 25.00, 'Emergency room bed reservation'),
('consultation', 'Emergency Consultation', 75.00, 'Emergency doctor consultation'),
('procedure', 'Basic Emergency Procedure', 200.00, 'Basic emergency medical procedure');

-- Insert default room pricing
INSERT INTO room_pricing (room_type, room_name, price_per_night, description) VALUES
('general', 'General Ward', 50.00, 'Standard general ward bed'),
('private', 'Private Room', 150.00, 'Private room with amenities'),
('icu', 'ICU Bed', 500.00, 'Intensive Care Unit bed'),
('emergency', 'Emergency Room', 100.00, 'Emergency room bed'),
('maternity', 'Maternity Ward', 120.00, 'Maternity ward bed');

-- Indexes for performance
CREATE INDEX idx_service_pricing_type ON service_pricing(service_type);
CREATE INDEX idx_service_pricing_hospital ON service_pricing(hospital_id);
CREATE INDEX idx_room_pricing_type ON room_pricing(room_type);
CREATE INDEX idx_room_pricing_hospital ON room_pricing(hospital_id);
CREATE INDEX idx_payment_transactions_request ON payment_transactions(emergency_request_id);
CREATE INDEX idx_payment_transactions_user ON payment_transactions(user_id);

-- RLS Policies
ALTER TABLE service_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Service pricing policies
CREATE POLICY "Public view active service pricing" ON service_pricing
  FOR SELECT USING (is_active = true);

CREATE POLICY "Org admins manage hospital pricing" ON service_pricing
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM profiles 
      WHERE role = 'org_admin' AND organization_id = hospital_id
    )
  );

CREATE POLICY "Admins manage all pricing" ON service_pricing
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM profiles WHERE role = 'admin'
    )
  );

-- Room pricing policies
CREATE POLICY "Public view active room pricing" ON room_pricing
  FOR SELECT USING (is_active = true);

CREATE POLICY "Org admins manage hospital room pricing" ON room_pricing
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM profiles 
      WHERE role = 'org_admin' AND organization_id = hospital_id
    )
  );

CREATE POLICY "Admins manage all room pricing" ON room_pricing
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM profiles WHERE role = 'admin'
    )
  );

-- Payment transaction policies
CREATE POLICY "Users view own transactions" ON payment_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Org admins view hospital transactions" ON payment_transactions
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM profiles 
      WHERE role = 'org_admin' AND organization_id = hospital_id
    )
  );

CREATE POLICY "Admins view all transactions" ON payment_transactions
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM profiles WHERE role = 'admin'
    )
  );

-- Functions for pricing
CREATE OR REPLACE FUNCTION get_service_price(service_type_param TEXT, hospital_id_param UUID DEFAULT NULL)
RETURNS TABLE(service_name TEXT, price DECIMAL, currency VARCHAR) AS $$
BEGIN
  RETURN QUERY
  SELECT sp.service_name, sp.base_price, sp.currency
  FROM service_pricing sp
  WHERE sp.service_type = service_type_param 
    AND sp.is_active = true
    AND (sp.hospital_id = hospital_id_param OR sp.hospital_id IS NULL)
  ORDER BY sp.hospital_id DESC NULLS LAST
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_room_price(room_type_param TEXT, hospital_id_param UUID DEFAULT NULL)
RETURNS TABLE(room_name TEXT, price DECIMAL, currency VARCHAR) AS $$
BEGIN
  RETURN QUERY
  SELECT rp.room_name, rp.price_per_night, rp.currency
  FROM room_pricing rp
  WHERE rp.room_type = room_type_param 
    AND rp.is_active = true
    AND (rp.hospital_id = hospital_id_param OR rp.hospital_id IS NULL)
  ORDER BY rp.hospital_id DESC NULLS LAST
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_service_price TO authenticated;
GRANT EXECUTE ON FUNCTION get_room_price TO authenticated;
