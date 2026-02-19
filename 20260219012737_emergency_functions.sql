-- ============================================================================ 
-- EMERGENCY SYSTEM FUNCTIONS
-- UUID-native emergency system with proper functions
-- Date: 2026-02-18
-- ============================================================================

-- Emergency Request Creation with Payment
CREATE OR REPLACE FUNCTION create_emergency_with_payment(
    p_hospital_id UUID,
    p_user_id UUID,
    p_patient_data JSONB,
    p_payment_method TEXT DEFAULT 'stripe',
    p_payment_details JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
    v_emergency_id UUID;
BEGIN
    -- Generate emergency request
    INSERT INTO emergency_requests (
        hospital_id, user_id, patient_data, payment_method, 
        payment_details, status, created_at, updated_at
    ) VALUES (
        p_hospital_id, p_user_id, p_patient_data, p_payment_method,
        p_payment_details, 'pending', NOW(), NOW()
    ) RETURNING id INTO v_emergency_id;
    
    -- Sync to visits
    INSERT INTO visits (
        user_id, hospital_id, request_id, status, 
        date, time, type, created_at, updated_at
    ) VALUES (
        p_user_id, p_hospital_id, v_emergency_id, 'pending',
        CURRENT_DATE::TEXT, CURRENT_TIME::TEXT, 'emergency',
        NOW(), NOW()
    );
    
    RETURN v_emergency_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Payment Approval Function
CREATE OR REPLACE FUNCTION approve_cash_payment(
    p_emergency_id UUID,
    p_approved_by UUID,
    p_notes TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE emergency_requests 
    SET status = 'approved', 
        approved_by = p_approved_by,
        approved_at = NOW(),
        notes = p_notes
    WHERE id = p_emergency_id;
    
    -- Sync to visits
    UPDATE visits 
    SET status = 'completed'
    WHERE request_id = p_emergency_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Payment Decline Function
CREATE OR REPLACE FUNCTION decline_cash_payment(
    p_emergency_id UUID,
    p_declined_by UUID,
    p_reason TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE emergency_requests 
    SET status = 'declined', 
        declined_by = p_declined_by,
        declined_at = NOW(),
        notes = p_reason
    WHERE id = p_emergency_id;
    
    -- Sync to visits
    UPDATE visits 
    SET status = 'cancelled'
    WHERE request_id = p_emergency_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Driver Assignment Function
CREATE OR REPLACE FUNCTION auto_assign_driver(
    p_emergency_id UUID
) RETURNS UUID AS $$
DECLARE
    v_ambulance_id UUID;
BEGIN
    -- Find available ambulance
    SELECT id INTO v_ambulance_id
    FROM ambulances 
    WHERE status = 'available' 
    ORDER BY random() 
    LIMIT 1;
    
    -- Assign to emergency
    UPDATE emergency_requests 
    SET ambulance_id = v_ambulance_id,
        status = 'assigned'
    WHERE id = p_emergency_id;
    
    -- Update ambulance status
    UPDATE ambulances 
    SET status = 'on_duty'
    WHERE id = v_ambulance_id;
    
    RETURN v_ambulance_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- System Statistics Function
CREATE OR REPLACE FUNCTION get_system_stats() 
RETURNS TABLE (
    total_emergencies BIGINT,
    active_emergencies BIGINT,
    total_users BIGINT,
    total_hospitals BIGINT,
    total_ambulances BIGINT,
    available_ambulances BIGINT,
    total_visits BIGINT,
    pending_visits BIGINT,
    completed_visits BIGINT,
    system_health TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::BIGINT FROM emergency_requests)::BIGINT,
        (SELECT COUNT(*)::BIGINT FROM emergency_requests WHERE status IN ('pending', 'assigned', 'in_progress'))::BIGINT,
        (SELECT COUNT(*)::BIGINT FROM profiles)::BIGINT,
        (SELECT COUNT(*)::BIGINT FROM hospitals)::BIGINT,
        (SELECT COUNT(*)::BIGINT FROM ambulances)::BIGINT,
        (SELECT COUNT(*)::BIGINT FROM ambulances WHERE status = 'available')::BIGINT,
        (SELECT COUNT(*)::BIGINT FROM visits)::BIGINT,
        (SELECT COUNT(*)::BIGINT FROM visits WHERE status = 'pending')::BIGINT,
        (SELECT COUNT(*)::BIGINT FROM visits WHERE status = 'completed')::BIGINT,
        'Healthy'::TEXT
    FROM (SELECT 1) d;
END;
$$;

-- User Statistics Function
CREATE OR REPLACE FUNCTION get_user_statistics(
    p_organization_id UUID DEFAULT NULL
) RETURNS TABLE (
    total_users BIGINT,
    total_profiles BIGINT,
    recent_signups BIGINT,
    email_verified_users BIGINT,
    phone_verified_users BIGINT,
    admin_count BIGINT,
    provider_count BIGINT,
    sponsor_count BIGINT,
    viewer_count BIGINT,
    patient_count BIGINT,
    org_admin_count BIGINT,
    dispatcher_count BIGINT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT,
        COUNT(*)::BIGINT,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days')::BIGINT,
        COUNT(*) FILTER (WHERE email IS NOT NULL)::BIGINT,
        COUNT(*) FILTER (WHERE phone IS NOT NULL)::BIGINT,
        COUNT(*) FILTER (WHERE role = 'admin')::BIGINT,
        COUNT(*) FILTER (WHERE role = 'provider')::BIGINT,
        COUNT(*) FILTER (WHERE role = 'sponsor')::BIGINT,
        COUNT(*) FILTER (WHERE role = 'viewer')::BIGINT,
        COUNT(*) FILTER (WHERE role IN ('patient', 'user'))::BIGINT,
        COUNT(*) FILTER (WHERE role = 'org_admin')::BIGINT,
        COUNT(*) FILTER (WHERE role = 'dispatcher')::BIGINT
    FROM public.profiles
    WHERE (p_organization_id IS NULL OR organization_id = p_organization_id);
END;
$$;

-- Recent Activity Function
CREATE OR REPLACE FUNCTION get_recent_activity(
    p_limit_count INTEGER DEFAULT 20,
    p_offset_count INTEGER DEFAULT 0
) RETURNS TABLE (
    id UUID,
    user_id UUID,
    user_email TEXT,
    user_name TEXT,
    action TEXT,
    entity_type TEXT,
    entity_id UUID,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ,
    time_ago TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ua.id,
        ua.user_id,
        p.email::TEXT,
        COALESCE(p.first_name || ' ' || p.last_name, p.email)::TEXT,
        ua.action,
        ua.entity_type,
        ua.entity_id,
        ua.description,
        ua.metadata,
        ua.created_at,
        CASE 
            WHEN ua.created_at > NOW() - INTERVAL '1 minute' THEN 'Just now'
            WHEN ua.created_at > NOW() - INTERVAL '1 hour' THEN EXTRACT(MINUTE FROM NOW() - ua.created_at)::TEXT || 'm ago'
            WHEN ua.created_at > NOW() - INTERVAL '1 day' THEN EXTRACT(HOUR FROM NOW() - ua.created_at)::TEXT || 'h ago'
            ELSE TO_CHAR(ua.created_at, 'Mon DD')
        END AS time_ago
    FROM public.user_activity ua
    LEFT JOIN public.profiles p ON ua.user_id = p.id
    ORDER BY ua.created_at DESC
    LIMIT p_limit_count
    OFFSET p_offset_count;
END;
$$;

-- Is Admin Function
CREATE OR REPLACE FUNCTION is_admin() 
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
