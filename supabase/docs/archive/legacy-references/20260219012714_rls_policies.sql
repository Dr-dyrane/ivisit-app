-- ============================================================================ 
-- RLS POLICIES (Clean Implementation)
-- UUID-native tables with proper RLS policies
-- Date: 2026-02-18
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE ambulances ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE preferences ENABLE ROW LEVEL SECURITY;

-- Profiles RLS (Clean, no recursion)
CREATE POLICY "Users can view own profiles" ON profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profiles" ON profiles
FOR UPDATE USING (auth.uid() = id);

-- Organizations RLS (Admin only)
CREATE POLICY "Admins can manage organizations" ON organizations
FOR ALL USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
));

-- Hospitals RLS (Public read, admin write)
CREATE POLICY "Public can read hospitals" ON hospitals
FOR SELECT USING (true);

CREATE POLICY "Admins can manage hospitals" ON hospitals
FOR ALL USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
));

-- Doctors RLS (Public read, admin write)
CREATE POLICY "Public can read doctors" ON doctors
FOR SELECT USING (true);

CREATE POLICY "Admins can manage doctors" ON doctors
FOR ALL USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
));

-- Ambulances RLS (Public read, admin write)
CREATE POLICY "Public can read ambulances" ON ambulances
FOR SELECT USING (true);

CREATE POLICY "Admins can manage ambulances" ON ambulances
FOR ALL USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
));

-- Emergency Requests RLS
CREATE POLICY "Users can view own emergency requests" ON emergency_requests
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own emergency requests" ON emergency_requests
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own emergency requests" ON emergency_requests
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage emergency requests" ON emergency_requests
FOR ALL USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
));

-- Visits RLS
CREATE POLICY "Users can view own visits" ON visits
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own visits" ON visits
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own visits" ON visits
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage visits" ON visits
FOR ALL USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
));

-- Payments RLS
CREATE POLICY "Users can view own payments" ON payments
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payments" ON payments
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage payments" ON payments
FOR ALL USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
));

-- Payment Methods RLS
CREATE POLICY "Users can manage own payment methods" ON payment_methods
FOR ALL USING (auth.uid() = user_id);

-- Insurance Policies RLS
CREATE POLICY "Users can manage own insurance policies" ON insurance_policies
FOR ALL USING (auth.uid() = user_id);

-- User Activity RLS
CREATE POLICY "Users can view own activity" ON user_activity
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage user activity" ON user_activity
FOR ALL USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
));

-- Notifications RLS
CREATE POLICY "Users can manage own notifications" ON notifications
FOR ALL USING (auth.uid() = user_id);

-- Medical Profiles RLS
CREATE POLICY "Users can manage own medical profiles" ON medical_profiles
FOR ALL USING (auth.uid() = user_id);

-- Preferences RLS
CREATE POLICY "Users can manage own preferences" ON preferences
FOR ALL USING (auth.uid() = user_id);
