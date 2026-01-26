-- Insurance Billing System
-- For hospital-to-insurance billing (B2B)
-- Users get free service via insurance coverage

-- Insurance billing table
CREATE TABLE IF NOT EXISTS insurance_billing (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  emergency_request_id UUID REFERENCES emergency_requests(id),
  hospital_id UUID REFERENCES hospitals(id),
  user_id UUID REFERENCES auth.users(id),
  insurance_policy_id UUID REFERENCES insurance_policies(id),
  
  -- Cost breakdown
  total_amount DECIMAL(10,2) NOT NULL,
  insurance_amount DECIMAL(10,2) NOT NULL,
  user_amount DECIMAL(10,2) NOT NULL,
  
  -- Billing status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'paid', 'rejected'
  billing_date DATE,
  paid_date DATE,
  
  -- Insurance details
  coverage_percentage INTEGER,
  claim_number VARCHAR(100),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add coverage percentage to insurance policies if not exists
ALTER TABLE insurance_policies 
ADD COLUMN IF NOT EXISTS coverage_percentage INTEGER DEFAULT 80,
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS linked_payment_method TEXT;

-- Indexes for performance
CREATE INDEX idx_insurance_billing_request ON insurance_billing(emergency_request_id);
CREATE INDEX idx_insurance_billing_hospital ON insurance_billing(hospital_id);
CREATE INDEX idx_insurance_billing_user ON insurance_billing(user_id);
CREATE INDEX idx_insurance_billing_status ON insurance_billing(status);
CREATE INDEX idx_insurance_billing_date ON insurance_billing(billing_date);

-- RLS Policies
ALTER TABLE insurance_billing ENABLE ROW LEVEL SECURITY;

-- Billing policies
CREATE POLICY "Users view own billing records" ON insurance_billing
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Hospitals view their billing" ON insurance_billing
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM profiles 
      WHERE role = 'org_admin' AND organization_id = hospital_id
    )
  );

CREATE POLICY "Admins manage all billing" ON insurance_billing
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM profiles WHERE role = 'admin'
    )
  );

-- Function to auto-create billing record when emergency is completed
CREATE OR REPLACE FUNCTION create_insurance_billing_on_completion()
RETURNS TRIGGER AS $$
DECLARE
  emergency_record RECORD;
  insurance_policy RECORD;
  total_cost DECIMAL;
  insurance_coverage DECIMAL;
  user_cost DECIMAL;
BEGIN
  -- Only create billing when emergency is completed
  IF OLD.status NOT IN ('completed') AND NEW.status = 'completed' THEN
    
    -- Get emergency details
    SELECT * INTO emergency_record FROM emergency_requests WHERE id = NEW.id;
    
    -- Get user's default insurance policy
    SELECT * INTO insurance_policy 
    FROM insurance_policies 
    WHERE user_id = emergency_record.user_id 
      AND is_default = true
    LIMIT 1;
    
    -- Calculate costs (simplified for now)
    total_cost := CASE 
      WHEN emergency_record.service_type = 'ambulance' THEN 150.00
      WHEN emergency_record.service_type = 'bed' THEN 200.00
      ELSE 100.00
    END;
    
    -- Calculate insurance coverage
    IF insurance_policy.id IS NOT NULL THEN
      insurance_coverage := (total_cost * insurance_policy.coverage_percentage) / 100;
      user_cost := total_cost - insurance_coverage;
    ELSE
      insurance_coverage := 0;
      user_cost := total_cost;
    END IF;
    
    -- Create billing record
    INSERT INTO insurance_billing (
      emergency_request_id,
      hospital_id,
      user_id,
      insurance_policy_id,
      total_amount,
      insurance_amount,
      user_amount,
      coverage_percentage,
      billing_date,
      status
    ) VALUES (
      NEW.id,
      emergency_record.hospital_id,
      emergency_record.user_id,
      insurance_policy.id,
      total_cost,
      insurance_coverage,
      user_cost,
      COALESCE(insurance_policy.coverage_percentage, 0),
      CURRENT_DATE,
      'pending'
    );
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic billing
DROP TRIGGER IF EXISTS on_emergency_completed_create_billing ON emergency_requests;
CREATE TRIGGER on_emergency_completed_create_billing
  AFTER UPDATE ON emergency_requests
  FOR EACH ROW
  EXECUTE FUNCTION create_insurance_billing_on_completion();

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_insurance_billing_on_completion TO authenticated;
