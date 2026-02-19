-- ============================================================================ 
-- DISPLAY ID GENERATION TRIGGERS
-- UUID-native tables with display ID mapping
-- Date: 2026-02-18
-- ============================================================================

-- Display ID Generation Trigger
CREATE OR REPLACE FUNCTION stamp_entity_display_id()
RETURNS TRIGGER AS $$
DECLARE
    v_display_id TEXT;
    v_prefix TEXT;
BEGIN
    -- Determine prefix based on table name
    IF TG_TABLE_NAME = 'profiles' THEN
        v_prefix := 'USR-';
    ELSIF TG_TABLE_NAME = 'organizations' THEN
        v_prefix := 'ORG-';
    ELSIF TG_TABLE_NAME = 'hospitals' THEN
        v_prefix := 'HSP-';
    ELSIF TG_TABLE_NAME = 'doctors' THEN
        v_prefix := 'DOC-';
    ELSIF TG_TABLE_NAME = 'ambulances' THEN
        v_prefix := 'AMB-';
    ELSIF TG_TABLE_NAME = 'emergency_requests' THEN
        v_prefix := 'REQ-';
    ELSIF TG_TABLE_NAME = 'visits' THEN
        v_prefix := 'VST-';
    ELSIF TG_TABLE_NAME = 'payments' THEN
        v_prefix := 'PAY-';
    ELSIF TG_TABLE_NAME = 'notifications' THEN
        v_prefix := 'NTF-';
    ELSE
        RETURN NULL;
    END IF;
    
    -- Generate 6-digit display ID
    v_display_id := v_prefix || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    
    -- Insert into mappings table
    INSERT INTO id_mappings (entity_id, display_id, entity_type, created_at)
    VALUES (NEW.id, v_display_id, TG_TABLE_NAME, NOW());
    
    -- Set display_id on record
    NEW.display_id := v_display_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply triggers to all tables
CREATE TRIGGER tr_profiles_display_id
BEFORE INSERT ON profiles
FOR EACH ROW EXECUTE FUNCTION stamp_entity_display_id();

CREATE TRIGGER tr_organizations_display_id
BEFORE INSERT ON organizations
FOR EACH ROW EXECUTE FUNCTION stamp_entity_display_id();

CREATE TRIGGER tr_hospitals_display_id
BEFORE INSERT ON hospitals
FOR EACH ROW EXECUTE FUNCTION stamp_entity_display_id();

CREATE TRIGGER tr_doctors_display_id
BEFORE INSERT ON doctors
FOR EACH ROW EXECUTE FUNCTION stamp_entity_display_id();

CREATE TRIGGER tr_ambulances_display_id
BEFORE INSERT ON ambulances
FOR EACH ROW EXECUTE FUNCTION stamp_entity_display_id();

CREATE TRIGGER tr_emergency_requests_display_id
BEFORE INSERT ON emergency_requests
FOR EACH ROW EXECUTE FUNCTION stamp_entity_display_id();

CREATE TRIGGER tr_visits_display_id
BEFORE INSERT ON visits
FOR EACH ROW EXECUTE FUNCTION stamp_entity_display_id();

CREATE TRIGGER tr_payments_display_id
BEFORE INSERT ON payments
FOR EACH ROW EXECUTE FUNCTION stamp_entity_display_id();

CREATE TRIGGER tr_notifications_display_id
BEFORE INSERT ON notifications
FOR EACH ROW EXECUTE FUNCTION stamp_entity_display_id();
