-- 🏯 Module 06: Operations & Content
-- Notifications, Support, and CMS

-- 1. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT, -- 'emergency', 'system', 'visit'
    title TEXT,
    message TEXT,
    icon TEXT,
    color TEXT,
    read BOOLEAN NOT NULL DEFAULT false,
    priority TEXT DEFAULT 'normal',
    action_type TEXT,
    action_data JSONB,
    metadata JSONB DEFAULT '{}',
    display_id TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Support System
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES public.organizations(id),
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    status TEXT DEFAULT 'open',
    priority TEXT DEFAULT 'normal',
    assigned_to UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.support_faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    rank INTEGER DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Content (CMS)
CREATE TABLE IF NOT EXISTS public.health_news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    source TEXT NOT NULL,
    url TEXT,
    image_url TEXT,
    category TEXT DEFAULT 'general',
    published BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    file_path TEXT,
    tier TEXT DEFAULT 'confidential', -- 'public', 'confidential', 'restricted'
    visibility TEXT[] DEFAULT '{admin}',
    content TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 🛠️ AUTOMATION: OPS HOOKS
-- A. Notify on Emergency Status Change
CREATE OR REPLACE FUNCTION public.notify_emergency_events()
RETURNS TRIGGER AS $$
BEGIN
    -- Notify Org Admins on New Request
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.notifications (user_id, type, title, message, priority, action_type, action_data)
        SELECT 
            p.id, 'emergency', '🚨 New Emergency', 
            'A new ' || NEW.service_type || ' request was created at your facility.', 
            'high', 'view_emergency', jsonb_build_object('id', NEW.id)
        FROM public.profiles p
        WHERE p.organization_id = (SELECT organization_id FROM public.hospitals WHERE id = NEW.hospital_id)
        AND p.role IN ('org_admin', 'admin');
    END IF;

    -- Notify Patient on Approval/Dispatch
    IF (TG_OP = 'UPDATE' AND NEW.status != OLD.status) THEN
        INSERT INTO public.notifications (user_id, type, title, message, priority)
        VALUES (
            NEW.user_id, 'emergency', 'Status Updated', 
            'Your emergency request is now: ' || NEW.status, 
            'normal'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_emergency_notification
AFTER INSERT OR UPDATE ON public.emergency_requests
FOR EACH ROW EXECUTE PROCEDURE public.notify_emergency_events();

CREATE TRIGGER stamp_ntf_display_id BEFORE INSERT ON public.notifications FOR EACH ROW EXECUTE PROCEDURE public.stamp_entity_display_id();

-- Standard Updates
CREATE TRIGGER handle_note_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_ticket_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_doc_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 🛡️ Insurance Validation RPC Functions
-- Part of Master System Improvement Plan - Phase 2 Important System Enhancements

-- 1. Validate Insurance Coverage
CREATE OR REPLACE FUNCTION public.validate_insurance_coverage(
    p_user_id UUID,
    p_hospital_id UUID,
    p_estimated_cost NUMERIC
)
RETURNS JSONB AS $$
DECLARE
    v_active_policy BOOLEAN;
    v_coverage_amount NUMERIC;
    v_policy_type TEXT;
    v_result JSONB;
BEGIN
    -- Get user's active insurance policy
    SELECT 
        is_active,
        coverage_amount,
        policy_type
    INTO v_active_policy, v_coverage_amount, v_policy_type
    FROM public.insurance_policies 
    WHERE user_id = p_user_id 
    AND is_active = true
    ORDER BY is_default DESC, created_at DESC
    LIMIT 1;
    
    IF NOT v_active_policy THEN
        RETURN jsonb_build_object(
            'covered', false,
            'error', 'No active insurance policy found',
            'code', 'NO_ACTIVE_POLICY'
        );
    END IF;
    
    -- Check if hospital is in network
    IF NOT EXISTS (
        SELECT 1 FROM public.insurance_network 
        WHERE policy_id = (
            SELECT id FROM public.insurance_policies 
            WHERE user_id = p_user_id AND is_active = true
            ORDER BY is_default DESC, created_at DESC LIMIT 1
        ) AND hospital_id = p_hospital_id
    ) THEN
        RETURN jsonb_build_object(
            'covered', false,
            'error', 'Hospital not in insurance network',
            'code', 'OUT_OF_NETWORK'
        );
    END IF;
    
    -- Check coverage amount
    IF v_coverage_amount < p_estimated_cost THEN
        RETURN jsonb_build_object(
            'covered', false,
            'error', 'Estimated cost exceeds coverage amount',
            'coverage_amount', v_coverage_amount,
            'estimated_cost', p_estimated_cost,
            'code', 'INSUFFICIENT_COVERAGE'
        );
    END IF;
    
    v_result := jsonb_build_object(
        'covered', true,
        'policy_type', v_policy_type,
        'coverage_amount', v_coverage_amount,
        'estimated_cost', p_estimated_cost,
        'remaining_coverage', v_coverage_amount - p_estimated_cost,
        'validated_at', NOW()
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Process Insurance Claim
CREATE OR REPLACE FUNCTION public.process_insurance_claim(
    p_emergency_request_id UUID,
    p_user_id UUID,
    p_hospital_id UUID,
    p_actual_cost NUMERIC
)
RETURNS JSONB AS $$
DECLARE
    v_policy_id UUID;
    v_coverage_amount NUMERIC;
    v_claim_amount NUMERIC;
    v_result JSONB;
BEGIN
    -- Get user's active policy
    SELECT id, coverage_amount INTO v_policy_id, v_coverage_amount
    FROM public.insurance_policies 
    WHERE user_id = p_user_id 
    AND is_active = true
    ORDER BY is_default DESC, created_at DESC
    LIMIT 1;
    
    IF v_policy_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No active insurance policy found',
            'code', 'NO_ACTIVE_POLICY'
        );
    END IF;
    
    -- Calculate claim amount (minimum of actual cost and coverage)
    v_claim_amount := LEAST(p_actual_cost, v_coverage_amount);
    
    -- Create insurance claim record
    INSERT INTO public.insurance_billing (
        emergency_request_id,
        user_id,
        hospital_id,
        policy_id,
        billed_amount,
        covered_amount,
        status,
        created_at
    ) VALUES (
        p_emergency_request_id,
        p_user_id,
        p_hospital_id,
        v_policy_id,
        p_actual_cost,
        v_claim_amount,
        'pending',
        NOW()
    ) RETURNING id INTO v_result;
    
    RETURN jsonb_build_object(
        'success', true,
        'claim_id', v_result,
        'billed_amount', p_actual_cost,
        'covered_amount', v_claim_amount,
        'patient_responsibility', p_actual_cost - v_claim_amount,
        'processed_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Get Insurance Policies
CREATE OR REPLACE FUNCTION public.get_insurance_policies(
    p_user_id UUID,
    p_include_inactive BOOLEAN DEFAULT false
)
RETURNS JSONB AS $$
DECLARE
    v_policies JSONB;
    v_result JSONB;
BEGIN
    -- Get user's insurance policies
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', id,
            'provider', provider,
            'policy_number', policy_number,
            'policy_type', policy_type,
            'coverage_amount', coverage_amount,
            'is_active', is_active,
            'is_default', is_default,
            'created_at', created_at,
            'updated_at', updated_at
        )
    ) INTO v_policies
    FROM public.insurance_policies 
    WHERE user_id = p_user_id 
    AND (p_include_inactive OR is_active = true)
    ORDER BY is_default DESC, created_at DESC;
    
    v_result := jsonb_build_object(
        'success', true,
        'policies', v_policies,
        'user_id', p_user_id,
        'retrieved_at', NOW()
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
