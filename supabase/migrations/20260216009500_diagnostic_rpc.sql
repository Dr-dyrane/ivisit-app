-- 20260216009500_diagnostic_rpc.sql
-- Tool for systematically verifying admin access and ecosystem health.

BEGIN;

CREATE OR REPLACE FUNCTION public.debug_admin_ecosystem()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id UUID;
    v_role TEXT;
    v_display_id TEXT;
    v_profiles_count INT;
    v_visits_count INT;
    v_wallets_count INT;
    v_report JSONB;
BEGIN
    -- 1. Identify current user
    v_user_id := auth.uid();
    
    -- 2. Get profile facts
    SELECT role, display_id INTO v_role, v_display_id 
    FROM public.profiles 
    WHERE id = v_user_id;
    
    -- 3. Run visibility checks (bypassing RLS because of SECURITY DEFINER, 
    -- but we can compare with what the user WOULD see)
    SELECT COUNT(*) INTO v_profiles_count FROM public.profiles;
    SELECT COUNT(*) INTO v_visits_count FROM public.visits;
    SELECT COUNT(*) INTO v_wallets_count FROM public.organization_wallets;
    
    -- 4. Construct report
    v_report := jsonb_build_object(
        'user_id', v_user_id,
        'assigned_role', v_role,
        'is_admin', (v_role = 'admin'),
        'display_id', v_display_id,
        'ecosystem_stats', jsonb_build_object(
            'total_profiles', v_profiles_count,
            'total_visits', v_visits_count,
            'total_wallets', v_wallets_count
        ),
        'timestamp', now()
    );
    
    RETURN v_report;
END;
$$;

COMMIT;
NOTIFY pgrst, 'reload schema';
