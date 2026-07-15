-- 🏯 Module 04: Logistics & Operations
-- Ambulances, Emergency Requests, and Visits

-- 1. Ambulances
CREATE TABLE IF NOT EXISTS public.ambulances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    profile_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE SET NULL, -- Current Driver Profile
    type TEXT,
    call_sign TEXT,
    -- Dispatch lifecycle statuses (matches automations + emergency_logic RPCs)
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN (
        'available', 'dispatched', 'on_trip', 'en_route', 'on_scene', 'returning',
        'maintenance', 'offline', 'pending_approval'
    )),
    location GEOMETRY(POINT, 4326),
    heading DOUBLE PRECISION,
    location_accuracy_meters DOUBLE PRECISION CHECK (
        location_accuracy_meters IS NULL OR location_accuracy_meters >= 0
    ),
    location_observed_at TIMESTAMPTZ,
    location_received_at TIMESTAMPTZ,
    telemetry_sequence BIGINT NOT NULL DEFAULT 0 CHECK (telemetry_sequence >= 0),
    telemetry_lease_expires_at TIMESTAMPTZ,
    vehicle_number TEXT,
    license_plate TEXT,
    base_price NUMERIC,
    crew JSONB DEFAULT '{}',
    -- Real-time dispatch fields
    eta TIMESTAMPTZ,                          -- ETA to patient/destination
    current_call UUID,                         -- Active emergency_request UUID
    display_id TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- BEGIN EMERGENCY_RESPONDER_TELEMETRY_SCHEMA
-- PULLBACK NOTE: responder readiness and telemetry generation contract.
-- OLD: ambulance.updated_at mixed operational edits with responder location freshness.
-- NEW: observed/received clocks, sequence, accuracy, and lease are explicit.
ALTER TABLE public.ambulances
    ADD COLUMN IF NOT EXISTS heading DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS location_accuracy_meters DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS location_observed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS location_received_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS telemetry_sequence BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS telemetry_lease_expires_at TIMESTAMPTZ;

ALTER TABLE public.ambulances
    DROP CONSTRAINT IF EXISTS ambulances_location_accuracy_nonnegative_chk,
    DROP CONSTRAINT IF EXISTS ambulances_telemetry_sequence_nonnegative_chk;
ALTER TABLE public.ambulances
    ADD CONSTRAINT ambulances_location_accuracy_nonnegative_chk CHECK (
        location_accuracy_meters IS NULL OR location_accuracy_meters >= 0
    ),
    ADD CONSTRAINT ambulances_telemetry_sequence_nonnegative_chk CHECK (
        telemetry_sequence >= 0
    );

ALTER TABLE public.ambulances
    DROP CONSTRAINT IF EXISTS ambulances_profile_id_fkey;
ALTER TABLE public.ambulances
    ADD CONSTRAINT ambulances_profile_id_fkey
    FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
-- END EMERGENCY_RESPONDER_TELEMETRY_SCHEMA

-- 2. Emergency Requests
CREATE TABLE IF NOT EXISTS public.emergency_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL,
    dispatch_organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    ambulance_id UUID REFERENCES public.ambulances(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'payment_declined', 'in_progress', 'accepted', 'arrived', 'completed', 'cancelled')),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'completed', 'failed', 'refunded', 'declined')),
    service_type TEXT NOT NULL CHECK (service_type IN ('ambulance', 'bed', 'booking')),
    
    -- Request snapshots
    hospital_name TEXT,
    specialty TEXT,
    ambulance_type TEXT,
    bed_number TEXT,
    bed_count TEXT,
    bed_type TEXT,
    patient_snapshot JSONB DEFAULT '{}',
    shared_data_snapshot JSONB,
    communication_room_id UUID,

    -- Payment
    payment_method_id TEXT,
    payment_id UUID,

    -- Real-time tracking
    pickup_location GEOMETRY(POINT, 4326),
    destination_location GEOMETRY(POINT, 4326),
    patient_location GEOMETRY(POINT, 4326),
    responder_location GEOMETRY(POINT, 4326),
    responder_heading DOUBLE PRECISION,
    responder_location_accuracy_meters DOUBLE PRECISION,
    responder_location_observed_at TIMESTAMPTZ,
    responder_location_received_at TIMESTAMPTZ,
    responder_telemetry_sequence BIGINT,
    responder_telemetry_lease_expires_at TIMESTAMPTZ,
    patient_acknowledged_arrival_at TIMESTAMPTZ,
    patient_heading DOUBLE PRECISION,
    estimated_arrival TEXT,
    
    -- Responder snapshot
    responder_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    responder_name TEXT,
    responder_phone TEXT,
    responder_vehicle_type TEXT,
    responder_vehicle_plate TEXT,
    
    -- Doctor Assignment (populated by trigger in 0009)
    assigned_doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
    doctor_assigned_at TIMESTAMPTZ,
    
    -- Costs
    total_cost NUMERIC DEFAULT 0,
    confirmed_cost NUMERIC,
    base_cost NUMERIC,
    distance_surcharge NUMERIC,
    urgency_surcharge NUMERIC,
    cost_breakdown JSONB,
    display_id TEXT UNIQUE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ
);

-- 2b. Emergency Status Transition Audit (append-only)
CREATE TABLE IF NOT EXISTS public.emergency_status_transitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emergency_request_id UUID NOT NULL REFERENCES public.emergency_requests(id) ON DELETE CASCADE,
    from_status TEXT CHECK (from_status IS NULL OR from_status IN ('pending_approval', 'payment_declined', 'in_progress', 'accepted', 'arrived', 'completed', 'cancelled')),
    to_status TEXT NOT NULL CHECK (to_status IN ('pending_approval', 'payment_declined', 'in_progress', 'accepted', 'arrived', 'completed', 'cancelled')),
    actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_role TEXT,
    source TEXT NOT NULL DEFAULT 'unknown',
    reason TEXT NOT NULL DEFAULT 'status_transition',
    transition_metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    request_snapshot JSONB NOT NULL DEFAULT '{}'::JSONB,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT emergency_status_transitions_status_change_chk CHECK (from_status IS NULL OR from_status <> to_status)
);

-- BEGIN EMERGENCY_RESPONDER_ASSIGNMENT_SCHEMA
-- PULLBACK NOTE: assignment is no longer equivalent to responder acceptance.
-- Each row is one immutable responder/ambulance offer generation. Lifecycle and
-- telemetry fields advance only through the narrow RPCs in core_rpcs.
CREATE TABLE IF NOT EXISTS public.emergency_responder_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emergency_request_id UUID NOT NULL REFERENCES public.emergency_requests(id) ON DELETE RESTRICT,
    ambulance_id UUID NOT NULL REFERENCES public.ambulances(id) ON DELETE RESTRICT,
    responder_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'offered' CHECK (
        status IN ('offered', 'accepted', 'arrived', 'declined', 'released', 'completed', 'cancelled')
    ),
    offered_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    offer_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 seconds'),
    decline_reason TEXT,
    telemetry_sequence BIGINT NOT NULL DEFAULT 0 CHECK (telemetry_sequence >= 0),
    responder_location GEOMETRY(POINT, 4326),
    responder_heading DOUBLE PRECISION,
    location_accuracy_meters DOUBLE PRECISION CHECK (
        location_accuracy_meters IS NULL OR location_accuracy_meters >= 0
    ),
    location_observed_at TIMESTAMPTZ,
    location_received_at TIMESTAMPTZ,
    telemetry_lease_expires_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    arrived_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    offered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.emergency_requests
    ADD COLUMN IF NOT EXISTS current_responder_assignment_id UUID,
    ADD COLUMN IF NOT EXISTS dispatch_organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS responder_location_accuracy_meters DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS responder_location_observed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS responder_location_received_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS responder_telemetry_sequence BIGINT,
    ADD COLUMN IF NOT EXISTS responder_telemetry_lease_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS patient_acknowledged_arrival_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_emergency_requests_unassigned_dispatch_queue
ON public.emergency_requests(created_at)
WHERE service_type = 'ambulance'
  AND status = 'in_progress'
  AND payment_status IN ('paid', 'completed')
  AND current_responder_assignment_id IS NULL
  AND ambulance_id IS NULL
  AND responder_id IS NULL;

ALTER TABLE public.emergency_responder_assignments
    ADD COLUMN IF NOT EXISTS offer_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 seconds');

UPDATE public.emergency_responder_assignments assignment
SET organization_id = COALESCE(
    ambulance.organization_id,
    ambulance_hospital.organization_id,
    request.dispatch_organization_id,
    request_hospital.organization_id
)
FROM public.ambulances ambulance
LEFT JOIN public.hospitals ambulance_hospital
  ON ambulance_hospital.id = ambulance.hospital_id
,
public.emergency_requests request
LEFT JOIN public.hospitals request_hospital
  ON request_hospital.id = request.hospital_id
WHERE ambulance.id = assignment.ambulance_id
  AND request.id = assignment.emergency_request_id
  AND assignment.organization_id IS NULL;

ALTER TABLE public.emergency_responder_assignments
    ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.emergency_responder_assignments
    DROP CONSTRAINT IF EXISTS emergency_responder_assignments_emergency_request_id_fkey;
ALTER TABLE public.emergency_responder_assignments
    ADD CONSTRAINT emergency_responder_assignments_emergency_request_id_fkey
    FOREIGN KEY (emergency_request_id)
    REFERENCES public.emergency_requests(id)
    ON DELETE RESTRICT;

ALTER TABLE public.emergency_requests
    DROP CONSTRAINT IF EXISTS emergency_requests_responder_location_accuracy_nonnegative_chk,
    DROP CONSTRAINT IF EXISTS emergency_requests_responder_telemetry_sequence_nonnegative_chk;
ALTER TABLE public.emergency_requests
    ADD CONSTRAINT emergency_requests_responder_location_accuracy_nonnegative_chk CHECK (
        responder_location_accuracy_meters IS NULL OR responder_location_accuracy_meters >= 0
    ),
    ADD CONSTRAINT emergency_requests_responder_telemetry_sequence_nonnegative_chk CHECK (
        responder_telemetry_sequence IS NULL OR responder_telemetry_sequence >= 0
    );

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'emergency_requests'
          AND constraint_name = 'emergency_requests_current_responder_assignment_fkey'
    ) THEN
        ALTER TABLE public.emergency_requests
            ADD CONSTRAINT emergency_requests_current_responder_assignment_fkey
            FOREIGN KEY (current_responder_assignment_id)
            REFERENCES public.emergency_responder_assignments(id)
            ON DELETE SET NULL;
    END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_emergency_responder_assignment_active_request
    ON public.emergency_responder_assignments(emergency_request_id)
    WHERE status IN ('offered', 'accepted', 'arrived');
CREATE UNIQUE INDEX IF NOT EXISTS idx_emergency_responder_assignment_active_ambulance
    ON public.emergency_responder_assignments(ambulance_id)
    WHERE status IN ('offered', 'accepted', 'arrived');
CREATE UNIQUE INDEX IF NOT EXISTS idx_emergency_responder_assignment_active_responder
    ON public.emergency_responder_assignments(responder_id)
    WHERE status IN ('offered', 'accepted', 'arrived');
CREATE INDEX IF NOT EXISTS idx_emergency_responder_assignment_request_time
    ON public.emergency_responder_assignments(emergency_request_id, offered_at DESC);
CREATE INDEX IF NOT EXISTS idx_emergency_responder_assignment_offer_expiry
    ON public.emergency_responder_assignments(offer_expires_at)
    WHERE status = 'offered';

-- Staffing history is separate from the current ambulance.profile_id cache.
-- Readiness requires one active, in-window assignment; Console writes it only
-- through the scoped staffing command.
CREATE TABLE IF NOT EXISTS public.ambulance_staff_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ambulance_id UUID NOT NULL REFERENCES public.ambulances(id) ON DELETE RESTRICT,
    responder_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    duty_role TEXT NOT NULL DEFAULT 'driver' CHECK (duty_role = 'driver'),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'cancelled')),
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ends_at TIMESTAMPTZ,
    assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ended_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    end_reason TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (ends_at IS NULL OR ends_at > starts_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ambulance_staff_one_active_unit
    ON public.ambulance_staff_assignments(ambulance_id)
    WHERE status = 'active';
CREATE UNIQUE INDEX IF NOT EXISTS idx_ambulance_staff_one_active_responder
    ON public.ambulance_staff_assignments(responder_id)
    WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_ambulance_staff_org_window
    ON public.ambulance_staff_assignments(organization_id, starts_at, ends_at);

DROP TRIGGER IF EXISTS handle_ambulance_staff_assignment_updated_at
    ON public.ambulance_staff_assignments;
CREATE TRIGGER handle_ambulance_staff_assignment_updated_at
BEFORE UPDATE ON public.ambulance_staff_assignments
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE OR REPLACE FUNCTION public.protect_emergency_responder_assignment_history()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'emergency_responder_assignments history cannot be deleted';
    END IF;

    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.emergency_request_id IS DISTINCT FROM OLD.emergency_request_id
       OR NEW.ambulance_id IS DISTINCT FROM OLD.ambulance_id
       OR NEW.responder_id IS DISTINCT FROM OLD.responder_id
       OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
       OR NEW.offered_by IS DISTINCT FROM OLD.offered_by
       OR NEW.offer_expires_at IS DISTINCT FROM OLD.offer_expires_at
       OR NEW.offered_at IS DISTINCT FROM OLD.offered_at
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        RAISE EXCEPTION 'responder assignment identity is immutable';
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
        IF NOT (
            (OLD.status = 'offered' AND NEW.status IN ('accepted', 'declined', 'released', 'cancelled'))
            OR (OLD.status = 'accepted' AND NEW.status IN ('arrived', 'released', 'cancelled'))
            OR (OLD.status = 'arrived' AND NEW.status IN ('completed', 'released', 'cancelled'))
        ) THEN
            RAISE EXCEPTION 'Illegal responder assignment transition: % -> %', OLD.status, NEW.status
                USING ERRCODE = '23514';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_emergency_responder_assignment_history
    ON public.emergency_responder_assignments;
CREATE TRIGGER trg_protect_emergency_responder_assignment_history
BEFORE UPDATE OR DELETE ON public.emergency_responder_assignments
FOR EACH ROW EXECUTE FUNCTION public.protect_emergency_responder_assignment_history();

DROP TRIGGER IF EXISTS handle_emergency_responder_assignment_updated_at
    ON public.emergency_responder_assignments;
CREATE TRIGGER handle_emergency_responder_assignment_updated_at
BEFORE UPDATE ON public.emergency_responder_assignments
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
-- END EMERGENCY_RESPONDER_ASSIGNMENT_SCHEMA

CREATE INDEX IF NOT EXISTS idx_emergency_status_transitions_request_time
ON public.emergency_status_transitions (emergency_request_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_emergency_status_transitions_actor_time
ON public.emergency_status_transitions (actor_user_id, occurred_at DESC);

ALTER TABLE public.emergency_status_transitions
ALTER COLUMN reason SET DEFAULT 'status_transition';

UPDATE public.emergency_status_transitions
SET reason = 'status_transition'
WHERE reason IS NULL;

ALTER TABLE public.emergency_status_transitions
ALTER COLUMN reason SET NOT NULL;

CREATE OR REPLACE FUNCTION public.prevent_emergency_status_transition_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'emergency_status_transitions is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_emergency_status_transitions_append_only ON public.emergency_status_transitions;
CREATE TRIGGER trg_emergency_status_transitions_append_only
BEFORE UPDATE OR DELETE ON public.emergency_status_transitions
FOR EACH ROW
EXECUTE FUNCTION public.prevent_emergency_status_transition_mutation();

-- Add FK on emergency_doctor_assignments now that emergency_requests exists
ALTER TABLE public.emergency_doctor_assignments
ADD CONSTRAINT eda_emergency_request_fk
FOREIGN KEY (emergency_request_id) REFERENCES public.emergency_requests(id) ON DELETE CASCADE;

-- 3. Visits (Medical Record / History)
CREATE TABLE IF NOT EXISTS public.visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL,
    request_id UUID REFERENCES public.emergency_requests(id) ON DELETE SET NULL,
    doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
    -- Hospital snapshot (denormalised from hospitals join for offline/history display)
    hospital_name TEXT,
    hospital TEXT,                             -- legacy alias for hospital_name (mapFromDb reads both)
    hospital_image TEXT,
    address TEXT,
    phone TEXT,
    image TEXT,                                -- alias for hospital_image used by legacy triggers
    -- Clinician snapshot
    doctor_name TEXT,
    doctor TEXT,                               -- legacy alias for doctor_name (mapFromDb reads both)
    doctor_image TEXT,
    -- Visit metadata
    specialty TEXT,
    date TEXT,
    time TEXT,
    type TEXT,
    status TEXT DEFAULT 'upcoming',
    notes TEXT,
    cost TEXT,
    summary TEXT,
    preparation TEXT[],
    prescriptions TEXT[],
    -- Booking details
    room_number TEXT,
    estimated_duration TEXT,
    meeting_link TEXT,
    care_mode TEXT,
    scheduled_start_at TIMESTAMPTZ,
    scheduled_end_at TIMESTAMPTZ,
    scheduled_timezone TEXT,
    booking_idempotency_key UUID,
    insurance_covered BOOLEAN DEFAULT TRUE,
    next_visit TEXT,
    -- Patient location at time of booking
    latitude NUMERIC,
    longitude NUMERIC,
    -- Financial
    tip_amount NUMERIC DEFAULT 0,
    tip_currency TEXT DEFAULT 'USD',
    tipped_at TIMESTAMPTZ,
    tip_payment_id UUID,
    -- Lifecycle & Rating
    lifecycle_state TEXT,
    lifecycle_updated_at TIMESTAMPTZ DEFAULT NOW(),
    rating SMALLINT,
    rating_comment TEXT,
    rated_at TIMESTAMPTZ,
    display_id TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT visits_tip_amount_nonnegative_chk CHECK (tip_amount IS NULL OR tip_amount >= 0),
    CONSTRAINT visits_rating_range_chk CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_visits_one_per_emergency_request
ON public.visits(request_id)
WHERE request_id IS NOT NULL;

-- BEGIN SCHEDULED_VISITS_LOGISTICS_SCHEMA
-- PULLBACK NOTE: Scheduled visits data pass.
-- OLD: Book Visit rows had only display date/time and clinician snapshots.
-- NEW: scheduled care has canonical clinician identity, instants, timezone, and retry identity.
ALTER TABLE public.visits
    ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS care_mode TEXT,
    ADD COLUMN IF NOT EXISTS scheduled_start_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS scheduled_end_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS scheduled_timezone TEXT,
    ADD COLUMN IF NOT EXISTS booking_idempotency_key UUID;

ALTER TABLE public.visits
    DROP CONSTRAINT IF EXISTS visits_care_mode_check;
ALTER TABLE public.visits
    ADD CONSTRAINT visits_care_mode_check
    CHECK (care_mode IS NULL OR care_mode IN ('in_person', 'telemedicine_async'));

ALTER TABLE public.visits
    DROP CONSTRAINT IF EXISTS visits_scheduled_contract_check;
ALTER TABLE public.visits
    ADD CONSTRAINT visits_scheduled_contract_check
    CHECK (
        (
            care_mode IS NULL
            AND scheduled_start_at IS NULL
            AND scheduled_end_at IS NULL
            AND scheduled_timezone IS NULL
            AND booking_idempotency_key IS NULL
        )
        OR (
            care_mode IS NOT NULL
            AND request_id IS NULL
            AND user_id IS NOT NULL
            AND status IS NOT NULL
            AND status IN ('upcoming', 'in_progress', 'completed', 'cancelled')
            AND (
                status IN ('completed', 'cancelled')
                OR (hospital_id IS NOT NULL AND doctor_id IS NOT NULL)
            )
            AND scheduled_start_at IS NOT NULL
            AND scheduled_end_at IS NOT NULL
            AND scheduled_end_at > scheduled_start_at
            AND scheduled_timezone IS NOT NULL
            AND char_length(scheduled_timezone) BETWEEN 1 AND 64
            AND booking_idempotency_key IS NOT NULL
        )
    );

CREATE UNIQUE INDEX IF NOT EXISTS idx_visits_booking_idempotency
    ON public.visits(user_id, booking_idempotency_key)
    WHERE booking_idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_visits_doctor_scheduled_window
    ON public.visits(doctor_id, scheduled_start_at, scheduled_end_at, status)
    WHERE care_mode IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_visits_patient_scheduled_window
    ON public.visits(user_id, scheduled_start_at, scheduled_end_at, status)
    WHERE care_mode IS NOT NULL;
-- END SCHEDULED_VISITS_LOGISTICS_SCHEMA

-- 3b. Emergency Communication Rooms (Contact Dispatch)
-- Flow-owned operational chat for active emergency requests. This stays in the
-- logistics pillar because the room lifecycle follows emergency request runtime.
CREATE TABLE IF NOT EXISTS public.emergency_chat_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emergency_request_id UUID UNIQUE REFERENCES public.emergency_requests(id) ON DELETE CASCADE,
    visit_id UUID REFERENCES public.visits(id) ON DELETE SET NULL,
    channel_type TEXT NOT NULL DEFAULT 'emergency',
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_message_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_emergency_chat_rooms_status_updated
ON public.emergency_chat_rooms (status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_emergency_chat_rooms_last_message
ON public.emergency_chat_rooms (last_message_at DESC);

CREATE TABLE IF NOT EXISTS public.emergency_chat_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.emergency_chat_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('patient', 'driver', 'crew', 'provider', 'hospital_admin', 'dispatcher', 'support')),
    display_name_snapshot TEXT,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    last_read_message_id UUID,
    last_read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT emergency_chat_participants_room_user_key UNIQUE (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_emergency_chat_participants_room_user
ON public.emergency_chat_participants (room_id, user_id);

CREATE INDEX IF NOT EXISTS idx_emergency_chat_participants_user_updated
ON public.emergency_chat_participants (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_emergency_chat_participants_room_role
ON public.emergency_chat_participants (room_id, role);

CREATE TABLE IF NOT EXISTS public.emergency_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.emergency_chat_rooms(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    sender_role TEXT NOT NULL CHECK (sender_role IN ('patient', 'driver', 'crew', 'provider', 'hospital_admin', 'dispatcher', 'support', 'system')),
    kind TEXT NOT NULL DEFAULT 'text' CHECK (kind IN ('text', 'quick_action', 'status_event', 'system', 'image', 'video')),
    body TEXT NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 1000),
    client_message_id TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    attachment_storage_path TEXT,
    attachment_mime_type TEXT,
    attachment_size_bytes BIGINT,
    attachment_duration_ms INTEGER,
    ai_assisted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    edited_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

-- BEGIN ASYNC_CONSULT_COMMUNICATION_SCHEMA
-- Emergency rooms may retain both request and visit links. Async consult rooms
-- are visit-only and reuse the same participant and message engine.
ALTER TABLE public.emergency_chat_rooms
    ALTER COLUMN emergency_request_id DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS channel_type TEXT NOT NULL DEFAULT 'emergency';

ALTER TABLE public.emergency_chat_rooms
    DROP CONSTRAINT IF EXISTS emergency_chat_rooms_channel_type_check;
ALTER TABLE public.emergency_chat_rooms
    ADD CONSTRAINT emergency_chat_rooms_channel_type_check
    CHECK (channel_type IN ('emergency', 'telemedicine_async'));

ALTER TABLE public.emergency_chat_rooms
    DROP CONSTRAINT IF EXISTS emergency_chat_rooms_owner_check;
ALTER TABLE public.emergency_chat_rooms
    ADD CONSTRAINT emergency_chat_rooms_owner_check
    CHECK (
        (channel_type = 'emergency' AND emergency_request_id IS NOT NULL)
        OR (
            channel_type = 'telemedicine_async'
            AND emergency_request_id IS NULL
            AND visit_id IS NOT NULL
        )
    );

ALTER TABLE public.emergency_chat_rooms
    DROP CONSTRAINT IF EXISTS emergency_chat_rooms_visit_id_fkey;
ALTER TABLE public.emergency_chat_rooms
    ADD CONSTRAINT emergency_chat_rooms_visit_id_fkey
    FOREIGN KEY (visit_id)
    REFERENCES public.visits(id)
    ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.prevent_async_consult_visit_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.emergency_chat_rooms room
        WHERE room.channel_type = 'telemedicine_async'
          AND room.visit_id = OLD.id
    ) THEN
        RAISE EXCEPTION 'A visit with an asynchronous consult room cannot be deleted';
    END IF;

    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS protect_async_consult_visit_owner ON public.visits;
CREATE TRIGGER protect_async_consult_visit_owner
BEFORE DELETE ON public.visits
FOR EACH ROW EXECUTE FUNCTION public.prevent_async_consult_visit_delete();

CREATE UNIQUE INDEX IF NOT EXISTS idx_async_consult_room_visit
    ON public.emergency_chat_rooms(visit_id)
    WHERE channel_type = 'telemedicine_async';

ALTER TABLE public.emergency_chat_messages
    ADD COLUMN IF NOT EXISTS attachment_storage_path TEXT,
    ADD COLUMN IF NOT EXISTS attachment_mime_type TEXT,
    ADD COLUMN IF NOT EXISTS attachment_size_bytes BIGINT,
    ADD COLUMN IF NOT EXISTS attachment_duration_ms INTEGER,
    ADD COLUMN IF NOT EXISTS ai_assisted BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.emergency_chat_messages
    DROP CONSTRAINT IF EXISTS emergency_chat_messages_kind_check;
ALTER TABLE public.emergency_chat_messages
    ADD CONSTRAINT emergency_chat_messages_kind_check
    CHECK (kind IN ('text', 'quick_action', 'status_event', 'system', 'image', 'video'));

ALTER TABLE public.emergency_chat_messages
    DROP CONSTRAINT IF EXISTS emergency_chat_messages_attachment_check;
ALTER TABLE public.emergency_chat_messages
    ADD CONSTRAINT emergency_chat_messages_attachment_check
    CHECK (
        (
            kind NOT IN ('image', 'video')
            AND attachment_storage_path IS NULL
            AND attachment_mime_type IS NULL
            AND attachment_size_bytes IS NULL
            AND attachment_duration_ms IS NULL
        )
        OR (
            kind = 'image'
            AND attachment_storage_path IS NOT NULL
            AND attachment_mime_type IS NOT NULL
            AND attachment_mime_type IN ('image/jpeg', 'image/png', 'image/webp')
            AND attachment_size_bytes IS NOT NULL
            AND attachment_size_bytes BETWEEN 1 AND 10485760
            AND attachment_duration_ms IS NULL
        )
        OR (
            kind = 'video'
            AND attachment_storage_path IS NOT NULL
            AND attachment_mime_type IS NOT NULL
            AND attachment_mime_type IN ('video/mp4', 'video/webm', 'video/quicktime')
            AND attachment_size_bytes IS NOT NULL
            AND attachment_size_bytes BETWEEN 1 AND 26214400
            AND attachment_duration_ms IS NOT NULL
            AND attachment_duration_ms BETWEEN 1 AND 30000
        )
    );

ALTER TABLE public.emergency_chat_participants
    DROP CONSTRAINT IF EXISTS emergency_chat_participants_last_read_message_id_fkey;
ALTER TABLE public.emergency_chat_messages
    DROP CONSTRAINT IF EXISTS emergency_chat_messages_room_id_id_key;
ALTER TABLE public.emergency_chat_messages
    ADD CONSTRAINT emergency_chat_messages_room_id_id_key UNIQUE (room_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_emergency_chat_messages_attachment_path
    ON public.emergency_chat_messages(attachment_storage_path)
    WHERE attachment_storage_path IS NOT NULL;
-- END ASYNC_CONSULT_COMMUNICATION_SCHEMA

CREATE INDEX IF NOT EXISTS idx_emergency_chat_messages_room_created
ON public.emergency_chat_messages (room_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_emergency_chat_messages_sender_created
ON public.emergency_chat_messages (sender_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_emergency_chat_messages_room_kind_created
ON public.emergency_chat_messages (room_id, kind, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_emergency_chat_messages_client_id
ON public.emergency_chat_messages (room_id, sender_id, client_message_id)
WHERE client_message_id IS NOT NULL;

ALTER TABLE public.emergency_requests
ADD COLUMN IF NOT EXISTS communication_room_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'emergency_requests_communication_room_id_fkey'
    ) THEN
        ALTER TABLE public.emergency_requests
        ADD CONSTRAINT emergency_requests_communication_room_id_fkey
        FOREIGN KEY (communication_room_id)
        REFERENCES public.emergency_chat_rooms(id)
        ON DELETE SET NULL;
    END IF;
END $$;

ALTER TABLE public.emergency_chat_participants
    ADD CONSTRAINT emergency_chat_participants_last_read_message_id_fkey
    FOREIGN KEY (room_id, last_read_message_id)
    REFERENCES public.emergency_chat_messages(room_id, id)
    ON DELETE SET NULL (last_read_message_id)
    NOT VALID;
ALTER TABLE public.emergency_chat_participants
    VALIDATE CONSTRAINT emergency_chat_participants_last_read_message_id_fkey;

-- C. Standard Timestamps & Display IDs
CREATE TRIGGER handle_amb_updated_at BEFORE UPDATE ON public.ambulances FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_req_updated_at BEFORE UPDATE ON public.emergency_requests FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_visit_updated_at BEFORE UPDATE ON public.visits FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_chat_room_updated_at ON public.emergency_chat_rooms;
CREATE TRIGGER handle_chat_room_updated_at BEFORE UPDATE ON public.emergency_chat_rooms FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_chat_participant_updated_at ON public.emergency_chat_participants;
CREATE TRIGGER handle_chat_participant_updated_at BEFORE UPDATE ON public.emergency_chat_participants FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_chat_message_updated_at ON public.emergency_chat_messages;
CREATE TRIGGER handle_chat_message_updated_at BEFORE UPDATE ON public.emergency_chat_messages FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER stamp_amb_display_id BEFORE INSERT ON public.ambulances FOR EACH ROW EXECUTE PROCEDURE public.stamp_entity_display_id();
CREATE TRIGGER stamp_req_display_id BEFORE INSERT ON public.emergency_requests FOR EACH ROW EXECUTE PROCEDURE public.stamp_entity_display_id();
CREATE TRIGGER stamp_visit_display_id BEFORE INSERT ON public.visits FOR EACH ROW EXECUTE PROCEDURE public.stamp_entity_display_id();

-- Concurrency Guards: max 1 active request per service type per user
-- PULLBACK NOTE: Absorbed 20260423000100_active_request_concurrency_guard.sql into pillar per CONTRIBUTING.md
-- OLD: covered only in_progress/accepted/arrived
-- NEW: also covers pending_approval (request is active as soon as user submits)
DO $$
DECLARE
    v_duplicate RECORD;
BEGIN
    SELECT user_id, service_type, COUNT(*) AS active_count
    INTO v_duplicate
    FROM public.emergency_requests
    WHERE user_id IS NOT NULL
      AND service_type IN ('ambulance', 'bed')
      AND status IN ('pending_approval', 'in_progress', 'accepted', 'arrived')
    GROUP BY user_id, service_type
    HAVING COUNT(*) > 1
    LIMIT 1;

    IF FOUND THEN
        RAISE EXCEPTION
            'Cannot install active request guard: user % has % active % requests. Resolve duplicates first.',
            v_duplicate.user_id,
            v_duplicate.active_count,
            v_duplicate.service_type;
    END IF;
END $$;

DROP INDEX IF EXISTS public.emergency_requests_one_active_ambulance_per_user_idx;
CREATE UNIQUE INDEX emergency_requests_one_active_ambulance_per_user_idx
ON public.emergency_requests (user_id)
WHERE service_type = 'ambulance'
  AND status IN ('pending_approval', 'in_progress', 'accepted', 'arrived');

DROP INDEX IF EXISTS public.emergency_requests_one_active_bed_per_user_idx;
CREATE UNIQUE INDEX emergency_requests_one_active_bed_per_user_idx
ON public.emergency_requests (user_id)
WHERE service_type = 'bed'
  AND status IN ('pending_approval', 'in_progress', 'accepted', 'arrived');

-- 📍 Real-time Tracking RPC Functions
-- Part of Master System Improvement Plan - Phase 2 Important System Enhancements

-- 1. Update Ambulance Location
CREATE OR REPLACE FUNCTION public.update_ambulance_location(
    p_ambulance_id UUID,
    p_latitude NUMERIC,
    p_longitude NUMERIC,
    p_accuracy NUMERIC DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_request_id UUID;
    v_assignment_id UUID;
    v_sequence BIGINT;
BEGIN
    IF p_latitude IS NULL OR p_longitude IS NULL
       OR p_latitude < -90 OR p_latitude > 90
       OR p_longitude < -180 OR p_longitude > 180 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid ambulance location',
            'code', 'INVALID_LOCATION'
        );
    END IF;

    SELECT ambulance.current_call,
           request.current_responder_assignment_id,
           COALESCE(ambulance.telemetry_sequence, 0) + 1
    INTO v_request_id, v_assignment_id, v_sequence
    FROM public.ambulances ambulance
    LEFT JOIN public.emergency_requests request ON request.id = ambulance.current_call
    WHERE ambulance.id = p_ambulance_id
    FOR UPDATE OF ambulance;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Ambulance not found',
            'code', 'AMBULANCE_NOT_FOUND'
        );
    END IF;

    RETURN public.report_responder_telemetry(
        jsonb_strip_nulls(jsonb_build_object(
            'ambulance_id', p_ambulance_id,
            'request_id', v_request_id,
            'assignment_id', v_assignment_id,
            'sequence', v_sequence,
            'observed_at', NOW(),
            'location', jsonb_build_object(
                'lat', p_latitude,
                'lng', p_longitude
            ),
            'accuracy_meters', p_accuracy
        ))
    ) || jsonb_build_object('compatibility_command', 'update_ambulance_location');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.update_ambulance_location(UUID, NUMERIC, NUMERIC, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_ambulance_location(UUID, NUMERIC, NUMERIC, NUMERIC) TO authenticated, service_role;

-- 2. Get Ambulance Status
CREATE OR REPLACE FUNCTION public.get_ambulance_status(
    p_ambulance_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_ambulance_data JSONB;
    v_result JSONB;
BEGIN
    -- Get ambulance status and location
    SELECT jsonb_build_object(
        'id', id,
        'call_sign', call_sign,
        'status', status,
        'location', location,
        'hospital_id', hospital_id,
        'crew', crew,
        'vehicle_number', vehicle_number,
        'current_call', current_call,
        'eta', eta,
        'updated_at', updated_at
    ) INTO v_ambulance_data
    FROM public.ambulances 
    WHERE id = p_ambulance_id;
    
    IF v_ambulance_data IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Ambulance not found',
            'code', 'AMBULANCE_NOT_FOUND'
        );
    END IF;
    
    v_result := jsonb_build_object(
        'success', true,
        'ambulance', v_ambulance_data,
        'retrieved_at', NOW()
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 3. Track Emergency Progress
CREATE OR REPLACE FUNCTION public.track_emergency_progress(
    p_emergency_request_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_emergency_data JSONB;
    v_ambulance_data JSONB;
    v_hospital_data JSONB;
    v_result JSONB;
BEGIN
    -- Get emergency request data
    SELECT jsonb_build_object(
        'id', id,
        'status', status,
        'created_at', created_at,
        'ambulance_id', ambulance_id,
        'hospital_id', hospital_id,
        'patient_location', patient_location
    ) INTO v_emergency_data
    FROM public.emergency_requests 
    WHERE id = p_emergency_request_id;
    
    -- Get ambulance data if assigned
    SELECT jsonb_build_object(
        'id', id,
        'call_sign', call_sign,
        'status', status,
        'location', location,
        'eta', eta
    ) INTO v_ambulance_data
    FROM public.ambulances 
    WHERE id = (SELECT ambulance_id FROM public.emergency_requests WHERE id = p_emergency_request_id);
    
    -- Get hospital data
    SELECT jsonb_build_object(
        'id', id,
        'name', name,
        'coordinates', coordinates,
        'available_beds', available_beds
    ) INTO v_hospital_data
    FROM public.hospitals 
    WHERE id = (SELECT hospital_id FROM public.emergency_requests WHERE id = p_emergency_request_id);
    
    v_result := jsonb_build_object(
        'success', true,
        'emergency', v_emergency_data,
        'ambulance', v_ambulance_data,
        'hospital', v_hospital_data,
        'tracked_at', NOW()
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 4. Calculate Ambulance ETA
CREATE OR REPLACE FUNCTION public.calculate_ambulance_eta(
    p_ambulance_id UUID,
    p_destination_lat NUMERIC,
    p_destination_lng NUMERIC
)
RETURNS JSONB AS $$
DECLARE
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_ambulance_location GEOMETRY;
    v_destination GEOMETRY;
    v_distance_km NUMERIC;
    v_avg_speed_kmh NUMERIC := 50; -- Average city speed
    v_prep_time_minutes NUMERIC := 5; -- Preparation time
    v_eta TIMESTAMPTZ;
    v_result JSONB;
BEGIN
    IF NOT v_is_service_role THEN
        RAISE EXCEPTION 'Ambulance ETA calculation is restricted to service_role';
    END IF;

    IF p_destination_lat IS NULL OR p_destination_lng IS NULL
       OR p_destination_lat < -90 OR p_destination_lat > 90
       OR p_destination_lng < -180 OR p_destination_lng > 180 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Destination coordinates are invalid',
            'code', 'INVALID_DESTINATION'
        );
    END IF;

    -- Get ambulance current location
    SELECT location INTO v_ambulance_location
    FROM public.ambulances 
    WHERE id = p_ambulance_id;
    
    IF v_ambulance_location IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Ambulance location not available',
            'code', 'LOCATION_NOT_AVAILABLE'
        );
    END IF;
    
    v_destination := ST_SetSRID(
        ST_MakePoint(p_destination_lng::DOUBLE PRECISION, p_destination_lat::DOUBLE PRECISION),
        4326
    );
    v_distance_km := ST_Distance(
        v_ambulance_location::GEOGRAPHY,
        v_destination::GEOGRAPHY
    ) / 1000;
    
    -- Calculate ETA
    v_eta := NOW() + make_interval(
        secs => ((v_distance_km / v_avg_speed_kmh) * 3600 + v_prep_time_minutes * 60)::DOUBLE PRECISION
    );
    
    -- Update ambulance ETA
    UPDATE public.ambulances 
    SET eta = v_eta 
    WHERE id = p_ambulance_id;
    
    v_result := jsonb_build_object(
        'success', true,
        'ambulance_id', p_ambulance_id,
        'distance_km', v_distance_km,
        'eta', v_eta,
        'estimated_minutes', EXTRACT(EPOCH FROM (v_eta - NOW())) / 60,
        'calculated_at', NOW()
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.calculate_ambulance_eta(UUID, NUMERIC, NUMERIC)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_ambulance_eta(UUID, NUMERIC, NUMERIC)
    TO service_role;
