-- 🏯 Module 06: Operations & Content
-- Notifications, Support, and CMS

-- 1. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_key TEXT,
    type TEXT, -- 'emergency', 'system', 'visit'
    title TEXT,
    message TEXT,
    icon TEXT,
    color TEXT,
    read BOOLEAN NOT NULL DEFAULT false,
    dismissed_at TIMESTAMPTZ,
    priority TEXT DEFAULT 'normal',
    action_type TEXT,
    target_id UUID,
    action_data JSONB,
    metadata JSONB DEFAULT '{}',
    display_id TEXT UNIQUE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Canonical notification events are additive. Legacy/client-created rows keep a
-- NULL event_key, while backend-owned events are unique per recipient and event.
ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS event_key TEXT;

ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS dismissed_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS notifications_recipient_event_key_uidx
    ON public.notifications(user_id, event_key)
    WHERE event_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS notifications_recipient_active_created_idx
    ON public.notifications(user_id, created_at DESC)
    WHERE dismissed_at IS NULL;

COMMENT ON COLUMN public.notifications.event_key IS
    'Stable backend event identity. Unique per notification recipient when present.';

COMMENT ON COLUMN public.notifications.dismissed_at IS
    'Recipient-owned inbox dismissal receipt. The canonical event row remains retained.';

-- Internal callers must derive the recipient and payload from canonical server
-- rows before calling this helper. Client roles have no execute privilege.
CREATE OR REPLACE FUNCTION public.emit_canonical_notification(
    p_event_key TEXT,
    p_recipient_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_priority TEXT DEFAULT 'normal',
    p_action_type TEXT DEFAULT NULL,
    p_target_id UUID DEFAULT NULL,
    p_action_data JSONB DEFAULT '{}'::JSONB,
    p_metadata JSONB DEFAULT '{}'::JSONB,
    p_icon TEXT DEFAULT NULL,
    p_color TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_event_key TEXT := NULLIF(BTRIM(p_event_key), '');
    v_recipient_user_id UUID;
    v_type TEXT := NULLIF(BTRIM(p_type), '');
    v_title TEXT := NULLIF(BTRIM(p_title), '');
    v_message TEXT := NULLIF(BTRIM(p_message), '');
    v_priority TEXT := COALESCE(NULLIF(BTRIM(p_priority), ''), 'normal');
    v_action_type TEXT := NULLIF(BTRIM(p_action_type), '');
    v_action_data JSONB := COALESCE(p_action_data, '{}'::JSONB);
    v_metadata JSONB := COALESCE(p_metadata, '{}'::JSONB);
    v_icon TEXT := NULLIF(BTRIM(p_icon), '');
    v_color TEXT := NULLIF(BTRIM(p_color), '');
    v_notification_id UUID;
    v_existing public.notifications%ROWTYPE;
    v_inserted BOOLEAN := false;
BEGIN
    IF v_event_key IS NULL OR CHAR_LENGTH(v_event_key) > 512 THEN
        RAISE EXCEPTION USING
            ERRCODE = '22023',
            MESSAGE = 'Canonical notification event_key is required and must not exceed 512 characters';
    END IF;

    IF p_recipient_user_id IS NULL THEN
        RAISE EXCEPTION USING
            ERRCODE = '22023',
            MESSAGE = 'Canonical notification recipient is required';
    END IF;

    SELECT profile.id
    INTO v_recipient_user_id
    FROM public.profiles AS profile
    WHERE profile.id = p_recipient_user_id;

    IF v_recipient_user_id IS NULL THEN
        RAISE EXCEPTION USING
            ERRCODE = '23503',
            MESSAGE = 'Canonical notification recipient does not exist';
    END IF;

    IF v_type IS NULL OR v_title IS NULL OR v_message IS NULL THEN
        RAISE EXCEPTION USING
            ERRCODE = '22023',
            MESSAGE = 'Canonical notification type, title, and message are required';
    END IF;

    IF v_priority NOT IN ('low', 'normal', 'high', 'urgent') THEN
        RAISE EXCEPTION USING
            ERRCODE = '22023',
            MESSAGE = 'Canonical notification priority is invalid';
    END IF;

    IF JSONB_TYPEOF(v_action_data) <> 'object' OR JSONB_TYPEOF(v_metadata) <> 'object' THEN
        RAISE EXCEPTION USING
            ERRCODE = '22023',
            MESSAGE = 'Canonical notification action_data and metadata must be JSON objects';
    END IF;

    INSERT INTO public.notifications (
        user_id,
        event_key,
        type,
        title,
        message,
        icon,
        color,
        priority,
        action_type,
        target_id,
        action_data,
        metadata
    )
    VALUES (
        v_recipient_user_id,
        v_event_key,
        v_type,
        v_title,
        v_message,
        v_icon,
        v_color,
        v_priority,
        v_action_type,
        p_target_id,
        v_action_data,
        v_metadata
    )
    ON CONFLICT (user_id, event_key) WHERE event_key IS NOT NULL DO NOTHING
    RETURNING id INTO v_notification_id;

    v_inserted := v_notification_id IS NOT NULL;

    IF NOT v_inserted THEN
        SELECT notification.*
        INTO v_existing
        FROM public.notifications AS notification
        WHERE notification.user_id = v_recipient_user_id
          AND notification.event_key = v_event_key;

        IF NOT FOUND THEN
            RAISE EXCEPTION USING
                ERRCODE = '40001',
                MESSAGE = 'Canonical notification replay could not resolve the existing row';
        END IF;

        IF v_existing.type IS DISTINCT FROM v_type
           OR v_existing.title IS DISTINCT FROM v_title
           OR v_existing.message IS DISTINCT FROM v_message
           OR v_existing.icon IS DISTINCT FROM v_icon
           OR v_existing.color IS DISTINCT FROM v_color
           OR v_existing.priority IS DISTINCT FROM v_priority
           OR v_existing.action_type IS DISTINCT FROM v_action_type
           OR v_existing.target_id IS DISTINCT FROM p_target_id
           OR v_existing.action_data IS DISTINCT FROM v_action_data
           OR v_existing.metadata IS DISTINCT FROM v_metadata THEN
            RAISE EXCEPTION USING
                ERRCODE = '23505',
                MESSAGE = 'Canonical notification event replay payload does not match the existing row';
        END IF;

        v_notification_id := v_existing.id;
    END IF;

    RETURN JSONB_BUILD_OBJECT(
        'success', true,
        'notification_id', v_notification_id,
        'recipient_user_id', v_recipient_user_id,
        'event_key', v_event_key,
        'inserted', v_inserted,
        'replayed', NOT v_inserted
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

REVOKE ALL ON FUNCTION public.emit_canonical_notification(
    TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, JSONB, JSONB, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.emit_canonical_notification(
    TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, JSONB, JSONB, TEXT, TEXT
) TO service_role;

CREATE OR REPLACE FUNCTION public.notify_canonical_payment_status_change()
RETURNS TRIGGER AS $$
DECLARE
    v_title TEXT;
    v_message TEXT;
    v_priority TEXT;
    v_color TEXT;
BEGIN
    IF NEW.status IS NOT DISTINCT FROM OLD.status
       OR NEW.user_id IS NULL
       OR NEW.status NOT IN ('completed', 'failed', 'declined', 'refunded') THEN
        RETURN NEW;
    END IF;

    v_title := CASE NEW.status
        WHEN 'completed' THEN 'Payment completed'
        WHEN 'refunded' THEN 'Payment refunded'
        WHEN 'declined' THEN 'Payment declined'
        ELSE 'Payment failed'
    END;
    v_message := CASE NEW.status
        WHEN 'completed' THEN 'Your payment was confirmed.'
        WHEN 'refunded' THEN 'Your payment was refunded.'
        WHEN 'declined' THEN 'Your payment was declined. Open the payment to review your options.'
        ELSE 'Your payment could not be completed. Open the payment to review your options.'
    END;
    v_priority := CASE
        WHEN NEW.status IN ('failed', 'declined') THEN 'high'
        ELSE 'normal'
    END;
    v_color := CASE
        WHEN NEW.status = 'completed' THEN 'success'
        WHEN NEW.status = 'refunded' THEN 'info'
        ELSE 'danger'
    END;

    PERFORM public.emit_canonical_notification(
        p_event_key => 'payment:' || NEW.id::TEXT || ':status:' || NEW.status,
        p_recipient_user_id => NEW.user_id,
        p_type => 'payment',
        p_title => v_title,
        p_message => v_message,
        p_priority => v_priority,
        p_action_type => 'view_payment',
        p_target_id => NEW.id,
        p_action_data => JSONB_BUILD_OBJECT(
            'id', NEW.id,
            'paymentId', NEW.id,
            'requestId', NEW.emergency_request_id
        ),
        p_metadata => JSONB_BUILD_OBJECT(
            'eventName', 'payment.status.' || NEW.status,
            'paymentId', NEW.id,
            'requestId', NEW.emergency_request_id,
            'method', NEW.payment_method,
            'status', NEW.status
        ),
        p_icon => CASE WHEN NEW.status = 'completed' THEN 'checkmark-circle-outline' ELSE 'card-outline' END,
        p_color => v_color
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

REVOKE ALL ON FUNCTION public.notify_canonical_payment_status_change()
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_canonical_payment_status_change()
    TO service_role;

DROP TRIGGER IF EXISTS notify_payment_status_change ON public.payments;
CREATE TRIGGER notify_payment_status_change
    AFTER UPDATE OF status ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_canonical_payment_status_change();

-- 2. Support System
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES public.organizations(id),
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    category TEXT DEFAULT 'general' CHECK (category IN (
        'general', 'technical', 'billing', 'account', 'feature_request', 'bug_report', 'medical'
    )),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    assigned_to UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- BEGIN CONSOLE_SUPPORT_TICKET_CONSTRAINTS
-- Converge already-created databases with the canonical Console/App vocabulary.
ALTER TABLE public.support_tickets
    DROP CONSTRAINT IF EXISTS support_tickets_category_check,
    DROP CONSTRAINT IF EXISTS support_tickets_status_check,
    DROP CONSTRAINT IF EXISTS support_tickets_priority_check;

ALTER TABLE public.support_tickets
    ADD CONSTRAINT support_tickets_category_check CHECK (category IN (
        'general', 'technical', 'billing', 'account', 'feature_request', 'bug_report', 'medical'
    )),
    ADD CONSTRAINT support_tickets_status_check CHECK (
        status IN ('open', 'in_progress', 'resolved', 'closed')
    ),
    ADD CONSTRAINT support_tickets_priority_check CHECK (
        priority IN ('low', 'normal', 'high', 'urgent')
    );
-- END CONSOLE_SUPPORT_TICKET_CONSTRAINTS

CREATE TABLE IF NOT EXISTS public.support_faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    rank INTEGER DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed baseline FAQ catalog to match app Help & Support UI fallback copy.
-- Idempotent: updates existing rows by normalized question, inserts missing rows.
WITH faq_defaults AS (
    SELECT *
    FROM (VALUES
        (
            'How do I update my medical profile?',
            'Go to the ''More'' tab and select ''Medical Profile''. You can update your blood type, allergies, and chronic conditions there. Changes are saved immediately and synced with emergency responders.',
            'Account',
            1
        ),
        (
            'What happens when I press SOS?',
            'When you activate SOS, we immediately alert nearby ambulances and your emergency contacts. Your location and medical profile are shared securely with responders to ensure the fastest possible care.',
            'Emergency',
            2
        ),
        (
            'Who can see my medical data?',
            'Your data is private by default. We only share your critical medical info (blood type, allergies) with verified emergency responders during an active SOS request. You can manage these permissions in Settings > Privacy.',
            'Privacy',
            3
        ),
        (
            'Do you accept my insurance?',
            'iVisit partners with major insurance providers. You can add your insurance details in the ''Insurance'' section under the ''More'' tab. We''ll automatically check eligibility for ambulance rides and hospital visits.',
            'Billing',
            4
        ),
        (
            'How do I reset my password?',
            'If you''re logged out, tap ''Forgot Password'' on the login screen. If you''re logged in, go to Settings > Account Security to change your password.',
            'Account',
            5
        )
    ) AS t(question, answer, category, rank)
),
updated_rows AS (
    UPDATE public.support_faqs f
    SET
        answer = d.answer,
        category = d.category,
        rank = d.rank
    FROM faq_defaults d
    WHERE lower(trim(f.question)) = lower(trim(d.question))
    RETURNING f.id
)
INSERT INTO public.support_faqs (question, answer, category, rank)
SELECT
    d.question,
    d.answer,
    d.category,
    d.rank
FROM faq_defaults d
WHERE NOT EXISTS (
    SELECT 1
    FROM public.support_faqs f
    WHERE lower(trim(f.question)) = lower(trim(d.question))
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
    file_path TEXT NOT NULL,
    tier TEXT DEFAULT 'confidential' CHECK (tier IN ('public', 'confidential', 'restricted')),
    icon TEXT DEFAULT 'file-text',
    visibility TEXT[] DEFAULT '{admin}',
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BEGIN DATA_ROOM_ACCESS_CONTRACT
CREATE TABLE IF NOT EXISTS public.access_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'revoked')),
    nda_signed_at TIMESTAMPTZ,
    signer_name TEXT,
    signer_entity TEXT,
    signer_title TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, document_id)
);

CREATE TABLE IF NOT EXISTS public.document_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    claimed BOOLEAN DEFAULT false,
    claimed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

CREATE INDEX IF NOT EXISTS idx_access_requests_user ON public.access_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_document ON public.access_requests(document_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_status ON public.access_requests(status);
CREATE INDEX IF NOT EXISTS idx_document_invites_token ON public.document_invites(token);
CREATE INDEX IF NOT EXISTS idx_document_invites_email ON public.document_invites(LOWER(email));

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'access_requests'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.access_requests;
    END IF;
END;
$$;
-- END DATA_ROOM_ACCESS_CONTRACT

-- 🛠️ AUTOMATION: OPS HOOKS
-- Notify organization administrators when a canonical emergency request is created.
-- Lifecycle and payment notifications belong to their owning RPCs and must call
-- emit_canonical_notification with an immutable event key.
CREATE OR REPLACE FUNCTION public.notify_emergency_events()
RETURNS TRIGGER AS $$
DECLARE
    v_recipient RECORD;
    v_previous_organization_ids UUID[] := ARRAY[]::UUID[];
    v_service_label TEXT := CASE NEW.service_type
        WHEN 'ambulance' THEN 'ambulance'
        WHEN 'bed' THEN 'bed'
        ELSE 'emergency'
    END;
BEGIN
    IF NEW.id IS NULL THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF OLD.hospital_id IS NOT DISTINCT FROM NEW.hospital_id
           AND OLD.dispatch_organization_id IS NOT DISTINCT FROM NEW.dispatch_organization_id THEN
            RETURN NEW;
        END IF;

        SELECT COALESCE(ARRAY_AGG(previous_target.organization_id), ARRAY[]::UUID[])
        INTO v_previous_organization_ids
        FROM (
            SELECT hospital.organization_id
            FROM public.hospitals AS hospital
            WHERE hospital.id = OLD.hospital_id
              AND hospital.organization_id IS NOT NULL
            UNION
            SELECT OLD.dispatch_organization_id
            WHERE OLD.dispatch_organization_id IS NOT NULL
        ) AS previous_target;
    END IF;

    FOR v_recipient IN
        WITH target_organizations AS (
            SELECT hospital.organization_id, TRUE AS facility_scope
            FROM public.hospitals AS hospital
            WHERE hospital.id = NEW.hospital_id
              AND hospital.organization_id IS NOT NULL
            UNION ALL
            SELECT NEW.dispatch_organization_id, FALSE AS facility_scope
            WHERE NEW.dispatch_organization_id IS NOT NULL
        )
        SELECT
            profile.id AS user_id,
            target.organization_id,
            BOOL_OR(target.facility_scope) AS facility_scope
        FROM target_organizations AS target
        JOIN public.profiles AS profile
          ON profile.organization_id = target.organization_id
        WHERE profile.role IN ('org_admin', 'dispatcher', 'admin')
          AND NOT (target.organization_id = ANY(v_previous_organization_ids))
        GROUP BY profile.id, target.organization_id
    LOOP
        PERFORM public.emit_canonical_notification(
            p_event_key => 'emergency_request:' || NEW.id::TEXT || ':created',
            p_recipient_user_id => v_recipient.user_id,
            p_type => 'emergency',
            p_title => 'New Emergency',
            p_message => CASE
                WHEN v_recipient.facility_scope
                    THEN 'A new ' || v_service_label || ' request was created at your facility.'
                ELSE 'A new ' || v_service_label || ' request is ready for dispatch.'
            END,
            p_priority => 'high',
            p_action_type => 'view_emergency',
            p_target_id => NEW.id,
            p_action_data => JSONB_BUILD_OBJECT(
                'id', NEW.id,
                'requestId', NEW.id
            ),
            p_metadata => JSONB_BUILD_OBJECT(
                'eventName', 'emergency_request.created',
                'requestId', NEW.id,
                'hospitalId', NEW.hospital_id,
                'dispatchOrganizationId', NEW.dispatch_organization_id,
                'recipientOrganizationId', v_recipient.organization_id
            )
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

REVOKE ALL ON FUNCTION public.notify_emergency_events() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_emergency_notification ON public.emergency_requests;
CREATE TRIGGER on_emergency_notification
AFTER INSERT OR UPDATE OF hospital_id, dispatch_organization_id ON public.emergency_requests
FOR EACH ROW EXECUTE PROCEDURE public.notify_emergency_events();

CREATE TRIGGER stamp_ntf_display_id BEFORE INSERT ON public.notifications FOR EACH ROW EXECUTE PROCEDURE public.stamp_entity_display_id();

-- Standard Updates
CREATE TRIGGER handle_note_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_ticket_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_doc_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_access_request_updated_at BEFORE UPDATE ON public.access_requests FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

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
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_policy_id UUID;
    v_coverage_amount NUMERIC;
    v_claim_amount NUMERIC;
    v_claim_id UUID;
BEGIN
    IF NOT v_is_service_role THEN
        RAISE EXCEPTION 'Insurance claim processing is restricted to service_role';
    END IF;

    IF p_emergency_request_id IS NULL OR p_user_id IS NULL OR p_hospital_id IS NULL
       OR p_actual_cost IS NULL OR p_actual_cost <= 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Claim input is invalid',
            'code', 'INVALID_CLAIM_INPUT'
        );
    END IF;

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
    v_claim_amount := LEAST(p_actual_cost, COALESCE(v_coverage_amount, 0));
    
    -- Create insurance claim record
    INSERT INTO public.insurance_billing (
        emergency_request_id,
        user_id,
        hospital_id,
        insurance_policy_id,
        total_amount,
        insurance_amount,
        user_amount,
        coverage_percentage,
        status,
        created_at
    ) VALUES (
        p_emergency_request_id,
        p_user_id,
        p_hospital_id,
        v_policy_id,
        p_actual_cost,
        v_claim_amount,
        p_actual_cost - v_claim_amount,
        CASE WHEN p_actual_cost > 0 THEN (v_claim_amount / p_actual_cost) * 100 ELSE 0 END,
        'pending',
        NOW()
    )
    ON CONFLICT (emergency_request_id) WHERE emergency_request_id IS NOT NULL
    DO UPDATE SET
        insurance_policy_id = EXCLUDED.insurance_policy_id,
        total_amount = EXCLUDED.total_amount,
        insurance_amount = EXCLUDED.insurance_amount,
        user_amount = EXCLUDED.user_amount,
        coverage_percentage = EXCLUDED.coverage_percentage,
        updated_at = NOW()
    RETURNING id INTO v_claim_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'claim_id', v_claim_id,
        'billed_amount', p_actual_cost,
        'covered_amount', v_claim_amount,
        'patient_responsibility', p_actual_cost - v_claim_amount,
        'processed_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.process_insurance_claim(UUID, UUID, UUID, NUMERIC)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_insurance_claim(UUID, UUID, UUID, NUMERIC)
    TO service_role;

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
