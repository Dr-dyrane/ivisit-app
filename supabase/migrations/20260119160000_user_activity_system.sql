-- User Activity System Migration
-- Creates comprehensive activity tracking for dashboard and analytics

-- 1. Create user_activity table
CREATE TABLE IF NOT EXISTS public.user_activity (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    action text NOT NULL CHECK (action IN (
        'emergency_created',
        'emergency_updated', 
        'emergency_completed',
        'provider_verified',
        'provider_registered',
        'user_registered',
        'ambulance_dispatched',
        'ambulance_returned',
        'hospital_added',
        'visit_scheduled',
        'visit_completed',
        'support_ticket_created',
        'support_ticket_resolved',
        'subscription_created',
        'subscription_cancelled',
        'system_backup',
        'user_login',
        'user_logout',
        'search_performed',
        'profile_updated',
        'admin_action'
    )),
    entity_type text CHECK (entity_type IN (
        'emergency_request',
        'profile', 
        'doctor',
        'ambulance',
        'hospital',
        'visit',
        'support_ticket',
        'subscription',
        'search',
        'system'
    )),
    entity_id uuid,
    description text NOT NULL,
    metadata jsonb DEFAULT '{}',
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 2. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON public.user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON public.user_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_action ON public.user_activity(action);
CREATE INDEX IF NOT EXISTS idx_user_activity_entity ON public.user_activity(entity_type, entity_id);

-- 3. Add RLS policies
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own activity
CREATE POLICY "Users can view own activity" ON public.user_activity
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Admins can see all activity
CREATE POLICY "Admins can view all activity" ON public.user_activity
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Policy: System can insert activity (for automated logging)
CREATE POLICY "System can insert activity" ON public.user_activity
    FOR INSERT WITH CHECK (true);

-- Policy: Users can update their own activity metadata
CREATE POLICY "Users can update own activity" ON public.user_activity
    FOR UPDATE USING (auth.uid() = user_id);

-- 4. Create helper function to log activity
CREATE OR REPLACE FUNCTION log_user_activity(
    p_action text,
    p_entity_type text DEFAULT NULL,
    p_entity_id uuid DEFAULT NULL,
    p_description text,
    p_metadata jsonb DEFAULT '{}'::jsonb,
    p_user_id uuid DEFAULT auth.uid()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    activity_id uuid;
BEGIN
    -- Validate action
    IF p_action NOT IN (
        'emergency_created', 'emergency_updated', 'emergency_completed',
        'provider_verified', 'provider_registered', 'user_registered',
        'ambulance_dispatched', 'ambulance_returned', 'hospital_added',
        'visit_scheduled', 'visit_completed', 'support_ticket_created',
        'support_ticket_resolved', 'subscription_created', 'subscription_cancelled',
        'system_backup', 'user_login', 'user_logout', 'search_performed',
        'profile_updated', 'admin_action'
    ) THEN
        RAISE EXCEPTION 'Invalid action: %', p_action;
    END IF;

    -- Insert activity record
    INSERT INTO public.user_activity (
        user_id,
        action,
        entity_type,
        entity_id,
        description,
        metadata,
        ip_address,
        user_agent
    ) VALUES (
        p_user_id,
        p_action,
        p_entity_type,
        p_entity_id,
        p_description,
        p_metadata,
        inet_client_addr(),
        current_setting('request.headers', true)::json->>'user-agent'
    ) RETURNING id INTO activity_id;

    RETURN activity_id;
END;
$$;

-- 5. Grant execute permissions
GRANT EXECUTE ON FUNCTION log_user_activity TO authenticated;
GRANT EXECUTE ON FUNCTION log_user_activity TO service_role;

-- 6. Create function to get recent activity with user details
CREATE OR REPLACE FUNCTION get_recent_activity(
    limit_count integer DEFAULT 20,
    offset_count integer DEFAULT 0
)
RETURNS TABLE(
    id uuid,
    user_id uuid,
    user_email text,
    user_name text,
    action text,
    entity_type text,
    entity_id uuid,
    description text,
    metadata jsonb,
    created_at timestamp with time zone,
    time_ago text
)
LANGUAGE sql
STABLE
AS $$
    SELECT 
        ua.id,
        ua.user_id,
        p.email as user_email,
        COALESCE(p.first_name || ' ' || p.last_name, p.email) as user_name,
        ua.action,
        ua.entity_type,
        ua.entity_id,
        ua.description,
        ua.metadata,
        ua.created_at,
        CASE 
            WHEN ua.created_at > NOW() - INTERVAL '1 minute' THEN 'Just now'
            WHEN ua.created_at > NOW() - INTERVAL '1 hour' THEN EXTRACT(MINUTE FROM NOW() - ua.created_at)::text || 'm ago'
            WHEN ua.created_at > NOW() - INTERVAL '1 day' THEN EXTRACT(HOUR FROM NOW() - ua.created_at)::text || 'h ago'
            WHEN ua.created_at > NOW() - INTERVAL '1 week' THEN EXTRACT(DAY FROM NOW() - ua.created_at)::text || 'd ago'
            ELSE TO_CHAR(ua.created_at, 'Mon DD')
        END as time_ago
    FROM public.user_activity ua
    LEFT JOIN public.profiles p ON ua.user_id = p.id
    ORDER BY ua.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_recent_activity TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_activity TO anon;

-- 7. Create function to get activity statistics
CREATE OR REPLACE FUNCTION get_activity_stats(
    days_back integer DEFAULT 7
)
RETURNS TABLE(
    action text,
    count bigint,
    percentage numeric
)
LANGUAGE sql
STABLE
AS $$
    WITH total_activities AS (
        SELECT COUNT(*)::numeric as total
        FROM public.user_activity 
        WHERE created_at > NOW() - INTERVAL '1 day' * days_back
    )
    SELECT 
        ua.action,
        COUNT(*)::bigint as count,
        ROUND((COUNT(*)::numeric / ta.total) * 100, 2) as percentage
    FROM public.user_activity ua, total_activities ta
    WHERE ua.created_at > NOW() - INTERVAL '1 day' * days_back
    GROUP BY ua.action
    ORDER BY count DESC;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_activity_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_activity_stats TO anon;

-- 8. Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_user_activity_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_user_activity_updated_at
    BEFORE UPDATE ON public.user_activity
    FOR EACH ROW
    EXECUTE FUNCTION update_user_activity_updated_at();

-- 9. Insert some sample activity for testing
INSERT INTO public.user_activity (action, entity_type, entity_id, description, metadata) VALUES
('emergency_created', 'emergency_request', gen_random_uuid(), 'New emergency request from Victoria Island', '{"location": "Victoria Island", "priority": "critical"}'),
('emergency_completed', 'emergency_request', gen_random_uuid(), 'Emergency response completed - Lekki', '{"location": "Lekki", "response_time": "4.2 minutes"}'),
('provider_verified', 'profile', gen_random_uuid(), 'New provider verified - Dr. Adebayo', '{"specialization": "Emergency Medicine"}'),
('ambulance_dispatched', 'ambulance', gen_random_uuid(), 'Ambulance dispatched to Ikeja', '{"ambulance_id": "AMB-001", "destination": "Ikeja"}'),
('system_backup', 'system', NULL, 'System backup completed successfully', '{"backup_size": "2.3GB", "duration": "45 minutes"}');

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';
