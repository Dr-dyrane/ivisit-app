-- Permanent cash-notification authority boundary for emergency dispatch.
-- Source digest: 06e3c521db4636a9
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '180s';

-- Source: supabase/migrations/20260219010000_core_rpcs.sql (notify_cash_approval_org_admins_internal function)
-- END CONSOLE_PROFILE_ADMIN_RPC

-- Compatibility facade for older app builds. Caller-supplied display fields are
-- never notification truth; the request, linked payment, and hospital own them.
CREATE OR REPLACE FUNCTION public.notify_cash_approval_org_admins_internal(
    p_request_id UUID,
    p_payment_id UUID,
    p_total_amount NUMERIC DEFAULT 0,
    p_fee_amount NUMERIC DEFAULT 0,
    p_hospital_name TEXT DEFAULT 'Hospital',
    p_service_type TEXT DEFAULT 'ambulance',
    p_display_id TEXT DEFAULT NULL,
    p_organization_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_req RECORD;
    v_payment public.payments%ROWTYPE;
    v_org_id UUID;
    v_actor_id UUID := auth.uid();
    v_actor_org_id UUID;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_recipient RECORD;
    v_notification JSONB;
    v_recipient_count INTEGER := 0;
    v_inserted_count INTEGER := 0;
    v_service_label TEXT;
    v_hospital_name TEXT;
    v_display_id TEXT;
    v_total_amount NUMERIC;
    v_fee_amount NUMERIC;
    v_message TEXT;
    v_actor_role TEXT;
BEGIN
    IF p_request_id IS NULL OR p_payment_id IS NULL THEN
        RAISE EXCEPTION 'Cash approval notification requires request and payment ids';
    END IF;

    SELECT
        request.id,
        request.user_id,
        request.hospital_id,
        request.hospital_name,
        request.service_type,
        request.display_id,
        request.payment_id,
        hospital.organization_id AS hospital_organization_id,
        hospital.name AS canonical_hospital_name
    INTO v_req
    FROM public.emergency_requests AS request
    LEFT JOIN public.hospitals AS hospital ON hospital.id = request.hospital_id
    WHERE request.id = p_request_id
    FOR UPDATE OF request;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Emergency request not found';
    END IF;

    SELECT payment.*
    INTO v_payment
    FROM public.payments AS payment
    WHERE payment.id = p_payment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment not found';
    END IF;

    IF v_payment.emergency_request_id IS DISTINCT FROM p_request_id
       OR (v_req.payment_id IS NOT NULL AND v_req.payment_id IS DISTINCT FROM p_payment_id) THEN
        RAISE EXCEPTION 'Payment is not linked to this emergency request';
    END IF;

    IF v_payment.user_id IS DISTINCT FROM v_req.user_id THEN
        RAISE EXCEPTION 'Payment owner does not match the emergency request owner';
    END IF;

    IF COALESCE(v_payment.payment_method, '') <> 'cash'
       OR COALESCE(v_payment.status, '') <> 'pending' THEN
        RAISE EXCEPTION 'Cash approval notification requires a pending cash payment';
    END IF;

    IF v_payment.organization_id IS NOT NULL
       AND v_req.hospital_organization_id IS NOT NULL
       AND v_payment.organization_id IS DISTINCT FROM v_req.hospital_organization_id THEN
        RAISE EXCEPTION 'Payment and hospital organization scope do not match';
    END IF;

    v_org_id := COALESCE(v_payment.organization_id, v_req.hospital_organization_id);
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Organization not found for emergency request';
    END IF;

    IF NOT v_is_service_role THEN
        SELECT profile.role, profile.organization_id
        INTO v_actor_role, v_actor_org_id
        FROM public.profiles
        AS profile
        WHERE profile.id = v_actor_id;

        IF v_actor_id IS DISTINCT FROM v_req.user_id
           AND COALESCE(v_actor_role, '') <> 'admin'
           AND NOT (
               v_actor_role IN ('org_admin', 'dispatcher')
               AND v_actor_org_id = v_org_id
           ) THEN
            RAISE EXCEPTION 'Unauthorized cash approval notification scope';
        END IF;
    END IF;

    v_total_amount := GREATEST(ROUND(COALESCE(v_payment.amount, 0)::NUMERIC, 2), 0);
    v_fee_amount := GREATEST(ROUND(COALESCE(v_payment.ivisit_fee_amount, 0)::NUMERIC, 2), 0);
    v_hospital_name := COALESCE(
        NULLIF(BTRIM(v_req.hospital_name), ''),
        NULLIF(BTRIM(v_req.canonical_hospital_name), ''),
        'Hospital'
    );
    v_display_id := COALESCE(NULLIF(BTRIM(v_req.display_id), ''), p_request_id::TEXT);

    -- Preserve the old signature while rejecting meaningful identity/amount
    -- conflicts. Remaining legacy copy parameters are intentionally ignored.
    IF p_organization_id IS NOT NULL AND p_organization_id IS DISTINCT FROM v_org_id THEN
        RAISE EXCEPTION 'Caller organization does not match canonical payment scope';
    END IF;
    IF COALESCE(p_total_amount, 0) > 0
       AND ROUND(p_total_amount::NUMERIC, 2) IS DISTINCT FROM v_total_amount THEN
        RAISE EXCEPTION 'Caller amount does not match canonical payment amount';
    END IF;
    IF COALESCE(p_fee_amount, 0) > 0
       AND ROUND(p_fee_amount::NUMERIC, 2) IS DISTINCT FROM v_fee_amount THEN
        RAISE EXCEPTION 'Caller fee does not match canonical payment fee';
    END IF;

    v_service_label := CASE v_req.service_type
        WHEN 'bed' THEN 'Bed Booking'
        WHEN 'booking' THEN 'Visit Booking'
        ELSE 'Ambulance Ride'
    END;

    v_message := format(
        'A patient has requested a %s (%s) at %s with cash payment of $%s. Platform fee: $%s. Tap to approve or decline.',
        v_service_label,
        v_display_id,
        v_hospital_name,
        to_char(v_total_amount, 'FM999999990.00'),
        to_char(v_fee_amount, 'FM999999990.00')
    );

    FOR v_recipient IN
        SELECT profile.id
        FROM public.profiles AS profile
        WHERE profile.role = 'admin'
           OR (profile.role = 'org_admin' AND profile.organization_id = v_org_id)
    LOOP
        v_notification := public.emit_canonical_notification(
            p_event_key => 'emergency_request:' || p_request_id::TEXT
                || ':payment:' || p_payment_id::TEXT || ':cash_approval_required',
            p_recipient_user_id => v_recipient.id,
            p_type => 'emergency',
            p_title => 'Cash Payment Approval Required',
            p_message => v_message,
            p_priority => 'urgent',
            p_action_type => 'approve_cash_payment',
            p_target_id => p_request_id,
            p_action_data => jsonb_build_object(
                'id', p_request_id,
                'paymentId', p_payment_id,
                'requestId', p_request_id,
                'totalAmount', v_total_amount,
                'feeAmount', v_fee_amount,
                'hospitalName', v_hospital_name,
                'serviceType', v_req.service_type,
                'displayId', v_display_id,
                'organizationId', v_org_id
            ),
            p_metadata => jsonb_build_object(
                'eventName', 'emergency_payment.cash_approval_required',
                'requestId', p_request_id,
                'paymentId', p_payment_id,
                'organizationId', v_org_id,
                'targetName', v_hospital_name
            ),
            p_icon => 'cash-outline',
            p_color => 'warning'
        );

        v_recipient_count := v_recipient_count + 1;
        IF COALESCE((v_notification->>'inserted')::BOOLEAN, false) THEN
            v_inserted_count := v_inserted_count + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'recipient_count', v_recipient_count,
        'inserted_count', v_inserted_count,
        'notified_count', v_recipient_count,
        'organization_id', v_org_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- Source: supabase/migrations/20260219010000_core_rpcs.sql (notify_cash_approval_org_admins function)
-- Authenticated callers use the compatibility facade below. The notification
-- implementation stays backend-only so patients cannot directly invoke a
-- SECURITY DEFINER fan-out, while create_emergency_v4 can still emit the
-- canonical event atomically with the request and payment.
CREATE OR REPLACE FUNCTION public.notify_cash_approval_org_admins(
    p_request_id UUID,
    p_payment_id UUID,
    p_total_amount NUMERIC DEFAULT 0,
    p_fee_amount NUMERIC DEFAULT 0,
    p_hospital_name TEXT DEFAULT 'Hospital',
    p_service_type TEXT DEFAULT 'ambulance',
    p_display_id TEXT DEFAULT NULL,
    p_organization_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_request_org_id UUID;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
BEGIN
    IF NOT v_is_service_role THEN
        IF v_actor_id IS NULL THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;

        SELECT profile.role, profile.organization_id
        INTO v_actor_role, v_actor_org_id
        FROM public.profiles AS profile
        WHERE profile.id = v_actor_id;

        IF v_actor_role NOT IN ('admin', 'org_admin', 'dispatcher') THEN
            RAISE EXCEPTION 'Unauthorized: insufficient role for cash approval notification';
        END IF;

        SELECT COALESCE(payment.organization_id, hospital.organization_id)
        INTO v_request_org_id
        FROM public.emergency_requests AS request
        JOIN public.payments AS payment
          ON payment.id = p_payment_id
         AND payment.emergency_request_id = request.id
        LEFT JOIN public.hospitals AS hospital ON hospital.id = request.hospital_id
        WHERE request.id = p_request_id;

        IF v_actor_role IN ('org_admin', 'dispatcher')
           AND (v_actor_org_id IS NULL OR v_actor_org_id IS DISTINCT FROM v_request_org_id) THEN
            RAISE EXCEPTION 'Unauthorized: request outside actor organization';
        END IF;
    END IF;

    RETURN public.notify_cash_approval_org_admins_internal(
        p_request_id,
        p_payment_id,
        p_total_amount,
        p_fee_amount,
        p_hospital_name,
        p_service_type,
        p_display_id,
        p_organization_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- Source: supabase/migrations/20260219000800_emergency_logic.sql (create_emergency_v4 function)
-- 🛠️ ATOMIC: Create Emergency with Integrated Payment (Fluid v4)
CREATE OR REPLACE FUNCTION public.create_emergency_v4(
    p_user_id UUID,
    p_request_data JSONB,
    p_payment_data JSONB DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_request_id UUID;
    v_display_id TEXT;
    v_visit_id TEXT;
    v_payment_id UUID;
    v_fee_amount NUMERIC;
    v_total_amount NUMERIC;
    v_hospital_service_price NUMERIC;
    v_hospital_base_price NUMERIC;
    v_admin_service_price NUMERIC;
    v_default_base_price NUMERIC;
    v_distance_km NUMERIC := 0;
    v_fee_percentage NUMERIC := 2.5;
    v_requires_approval BOOLEAN := FALSE;
    v_awaits_payment_confirmation BOOLEAN := FALSE;
    v_requires_wallet_settlement BOOLEAN := FALSE;
    v_hospital_id UUID;
    v_organization_id UUID;
    v_patient_location GEOMETRY;
    v_transition_reason TEXT;
    v_service_type TEXT := LOWER(COALESCE(NULLIF(TRIM(COALESCE(p_request_data->>'service_type', '')), ''), ''));
    v_payment_method TEXT := LOWER(COALESCE(NULLIF(TRIM(COALESCE(p_payment_data->>'method', '')), ''), 'unknown'));
    v_payment_method_id TEXT := NULLIF(TRIM(COALESCE(p_payment_data->>'method_id', '')), '');
    v_defer_dispatch_until_payment BOOLEAN := FALSE;
    v_request_status TEXT := 'in_progress';
    v_request_payment_status TEXT := 'pending';
BEGIN
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'user id is required';
    END IF;

    IF v_service_type NOT IN ('ambulance', 'bed') THEN
        RAISE EXCEPTION 'Unsupported emergency service type';
    END IF;

    IF p_payment_data IS NULL OR v_payment_method NOT IN ('cash', 'card', 'wallet') THEN
        RAISE EXCEPTION 'A supported payment method is required';
    END IF;

    IF NOT v_is_service_role THEN
        IF v_actor_id IS NULL THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;

        IF v_actor_id IS DISTINCT FROM p_user_id THEN
            SELECT role INTO v_actor_role
            FROM public.profiles
            WHERE id = v_actor_id;

            IF v_actor_role NOT IN ('admin', 'org_admin', 'dispatcher') THEN
                RAISE EXCEPTION 'Unauthorized: cannot create emergency for another user';
            END IF;
        END IF;
    END IF;

    v_transition_reason := COALESCE(
        NULLIF(p_request_data->>'transition_reason', ''),
        NULLIF(p_request_data->>'reason', ''),
        'emergency_created'
    );

    PERFORM set_config('ivisit.transition_source', 'create_emergency_v4', true);
    PERFORM set_config('ivisit.transition_reason', v_transition_reason, true);
    PERFORM set_config('ivisit.transition_actor_id', COALESCE(v_actor_id, p_user_id)::TEXT, true);
    PERFORM set_config(
        'ivisit.transition_actor_role',
        COALESCE(
            CASE WHEN v_is_service_role THEN 'service_role' ELSE NULL END,
            NULLIF(v_actor_role, ''),
            'patient'
        ),
        true
    );
    PERFORM set_config(
        'ivisit.transition_metadata',
        jsonb_build_object(
            'service_type', v_service_type,
            'payment_method', v_payment_method
        )::TEXT,
        true
    );

    -- 1. Extract and Resolve IDs
    v_hospital_id := NULLIF(p_request_data->>'hospital_id', '')::UUID;
    IF v_hospital_id IS NULL THEN
        RAISE EXCEPTION 'hospital_id is required';
    END IF;

    SELECT organization_id INTO v_organization_id FROM public.hospitals WHERE id = v_hospital_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Hospital not found';
    END IF;

    -- Payment release is server-owned. A client cannot assert a completed
    -- card, wallet, or cash settlement while creating the request.
    v_defer_dispatch_until_payment := v_payment_method = 'card';

    v_distance_km := GREATEST(COALESCE(NULLIF(p_request_data->>'distance_km', '')::NUMERIC, 0), 0);
    v_default_base_price := CASE
        WHEN v_service_type = 'ambulance' THEN 150
        WHEN v_service_type = 'bed' THEN 200
        ELSE 100
    END;

    SELECT hospital.base_price
    INTO v_hospital_base_price
    FROM public.hospitals hospital
    WHERE hospital.id = v_hospital_id;

    SELECT pricing.base_price
    INTO v_hospital_service_price
    FROM public.service_pricing pricing
    WHERE pricing.hospital_id = v_hospital_id
      AND pricing.service_type = v_service_type
    ORDER BY pricing.updated_at DESC NULLS LAST, pricing.created_at DESC
    LIMIT 1;

    SELECT pricing.base_price
    INTO v_admin_service_price
    FROM public.service_pricing pricing
    WHERE pricing.hospital_id IS NULL
      AND pricing.service_type = v_service_type
    ORDER BY pricing.updated_at DESC NULLS LAST, pricing.created_at DESC
    LIMIT 1;

    v_total_amount := ROUND(
        COALESCE(
            NULLIF(v_hospital_service_price, 0),
            NULLIF(v_hospital_base_price, 0),
            NULLIF(v_admin_service_price, 0),
            v_default_base_price
        ) + CASE WHEN v_distance_km > 5 THEN (v_distance_km - 5) * 2 ELSE 0 END,
        2
    );

    SELECT COALESCE(NULLIF(organization.ivisit_fee_percentage, 0), 2.5)
    INTO v_fee_percentage
    FROM public.organizations organization
    WHERE organization.id = v_organization_id;

    v_fee_amount := ROUND(v_total_amount * (COALESCE(v_fee_percentage, 2.5) / 100.0), 2);

    IF v_payment_method = 'cash' THEN
        v_requires_approval := TRUE;
        v_request_status := 'pending_approval';
        v_request_payment_status := 'pending';
    ELSIF v_payment_method = 'card' THEN
        v_awaits_payment_confirmation := TRUE;
        v_request_status := 'pending_approval';
        v_request_payment_status := 'pending';
    ELSIF v_payment_method = 'wallet' THEN
        v_requires_wallet_settlement := TRUE;
        v_request_status := 'pending_approval';
        v_request_payment_status := 'pending';
    END IF;
    
    -- 2. Physical Location Parse
    v_patient_location := ST_SetSRID(ST_MakePoint(
        (p_request_data->'patient_location'->>'lng')::DOUBLE PRECISION,
        (p_request_data->'patient_location'->>'lat')::DOUBLE PRECISION
    ), 4326);
    
    -- 3. Create the Emergency Request
    INSERT INTO public.emergency_requests (
        user_id, hospital_id, service_type, hospital_name, specialty,
        ambulance_type, bed_number, patient_location, patient_snapshot, status, total_cost, payment_status
    ) VALUES (
        p_user_id, v_hospital_id, v_service_type,
        p_request_data->>'hospital_name', p_request_data->>'specialty',
        p_request_data->>'ambulance_type', p_request_data->>'bed_number', v_patient_location,
        p_request_data->'patient_snapshot',
        v_request_status,
        COALESCE(v_total_amount, 0),
        v_request_payment_status
    ) RETURNING id, display_id INTO v_request_id, v_display_id;

    -- 4. Create the request-derived visit in the same transaction. A request
    -- cannot report success without its canonical history row.
    INSERT INTO public.visits (
        user_id, hospital_id, request_id, status,
        date, time, type
    ) VALUES (
        p_user_id, v_hospital_id, v_request_id, 'pending',
        TO_CHAR(NOW(), 'YYYY-MM-DD'),
        TO_CHAR(NOW(), 'HH24:MI:SS'),
        'emergency'
    ) RETURNING display_id INTO v_visit_id;

    -- 5. Process Payment Information
    INSERT INTO public.payments (
        user_id, emergency_request_id, organization_id, amount, currency,
        payment_method, status, ivisit_fee_amount, metadata
    ) VALUES (
        p_user_id, v_request_id, v_organization_id, v_total_amount,
        'USD', v_payment_method, 'pending', v_fee_amount,
        jsonb_build_object(
            'source', 'create_emergency_v4',
            'payment_kind', 'service',
            'fee_percentage', v_fee_percentage,
            'fee_amount', v_fee_amount,
            'fee', v_fee_amount,
            'method_id', v_payment_method_id,
            'client_quoted_total', NULLIF(p_payment_data->>'total_amount', '')::NUMERIC,
            'canonical_total', v_total_amount,
            'defer_dispatch_until_payment', v_defer_dispatch_until_payment
        )
    ) RETURNING id INTO v_payment_id;

    UPDATE public.emergency_requests
    SET payment_id = v_payment_id,
        payment_method_id = v_payment_method_id,
        total_cost = v_total_amount,
        updated_at = NOW()
    WHERE id = v_request_id;

    IF v_payment_method = 'cash' THEN
        PERFORM public.notify_cash_approval_org_admins_internal(
            v_request_id,
            v_payment_id,
            v_total_amount,
            v_fee_amount,
            NULL,
            NULL,
            NULL,
            v_organization_id
        );
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'request_id', v_request_id,
        'display_id', v_display_id,
        'visit_id', v_visit_id,
        'payment_id', v_payment_id,
        'requires_approval', v_requires_approval,
        'awaits_payment_confirmation', v_awaits_payment_confirmation,
        'requires_wallet_settlement', v_requires_wallet_settlement,
        'payment_status', v_request_payment_status,
        'emergency_status', v_request_status,
        'canonical_total', v_total_amount,
        'currency', 'USD'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.notify_cash_approval_org_admins_internal(UUID, UUID, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_cash_approval_org_admins_internal(UUID, UUID, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, UUID) TO service_role;
REVOKE ALL ON FUNCTION public.notify_cash_approval_org_admins(UUID, UUID, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notify_cash_approval_org_admins(UUID, UUID, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, UUID) TO authenticated, service_role;
COMMIT;
