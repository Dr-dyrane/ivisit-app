# 📸 Schema Snapshot

Generated on 5/18/2026

## 📄 20260219000100_identity.sql

### Table: `id_mappings`

```sql
CREATE TABLE IF NOT EXISTS public.id_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL,
    display_id TEXT NOT NULL UNIQUE,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('patient', 'provider', 'hospital', 'admin', 'dispatcher', 'doctor', 'ambulance', 'driver', 'emergency_request', 'visit', 'organization', 'payment', 'notification', 'wallet', 'org_admin', 'viewer', 'sponsor')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Table: `profiles`

```sql
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    phone TEXT,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    full_name TEXT,
    image_uri TEXT,
    avatar_url TEXT,
    address TEXT,
    gender TEXT,
    date_of_birth TEXT,
    role TEXT DEFAULT 'patient' CHECK (role IN ('patient', 'provider', 'admin', 'org_admin', 'dispatcher', 'viewer', 'sponsor')),
    provider_type TEXT CHECK (provider_type IN ('hospital', 'ambulance_service', 'ambulance', 'doctor', 'driver', 'paramedic', 'pharmacy', 'clinic')),
    bvn_verified BOOLEAN DEFAULT false,
    onboarding_status TEXT CHECK (onboarding_status IN ('pending', 'complete', 'skipped')),
    stripe_customer_id TEXT,
    stripe_account_id TEXT,
    organization_name TEXT,
    payout_method_id TEXT,
    payout_method_last4 TEXT,
    payout_method_brand TEXT,
    ivisit_fee_percentage NUMERIC DEFAULT 2.5,
    organization_id UUID,
    assigned_ambulance_id TEXT,
    display_id TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Table: `preferences`

```sql
CREATE TABLE IF NOT EXISTS public.preferences (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    demo_mode_enabled BOOLEAN NOT NULL DEFAULT true,
    notifications_enabled BOOLEAN NOT NULL DEFAULT true,
    appointment_reminders BOOLEAN NOT NULL DEFAULT true,
    emergency_updates BOOLEAN NOT NULL DEFAULT true,
    privacy_share_medical_profile BOOLEAN NOT NULL DEFAULT false,
    privacy_share_emergency_contacts BOOLEAN NOT NULL DEFAULT false,
    notification_sounds_enabled BOOLEAN NOT NULL DEFAULT true,
    billing_country_code TEXT,
    billing_currency_code TEXT,
    view_preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Table: `medical_profiles`

```sql
CREATE TABLE IF NOT EXISTS public.medical_profiles (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    blood_type TEXT,
    allergies TEXT[],
    conditions TEXT[],
    medications TEXT[],
    organ_donor BOOLEAN DEFAULT false,
    insurance_provider TEXT,
    insurance_policy_number TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    emergency_contact_relationship TEXT,
    emergency_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Table: `emergency_contacts`

```sql
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    relationship TEXT,
    phone TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    display_id TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Table: `subscribers`

```sql
CREATE TABLE IF NOT EXISTS public.subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    type TEXT DEFAULT 'free' CHECK (type IN ('free', 'paid')),
    status TEXT DEFAULT 'active',
    new_user BOOLEAN DEFAULT true,
    welcome_email_sent BOOLEAN DEFAULT false,
    subscription_date TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Table: `user_roles`

```sql
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Table: `user_sessions`

```sql
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    last_active TIMESTAMPTZ DEFAULT NOW(),
    session_data JSONB DEFAULT '{}'
);
```

## 📄 20260219000200_org_structure.sql

### Table: `organizations`

```sql
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    stripe_account_id TEXT UNIQUE,
    ivisit_fee_percentage NUMERIC DEFAULT 2.5,
    fee_tier TEXT DEFAULT 'standard',
    contact_email TEXT,
    is_active BOOLEAN DEFAULT true,
    display_id TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Table: `hospitals`

```sql
CREATE TABLE IF NOT EXISTS public.hospitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    phone TEXT,
    rating DOUBLE PRECISION DEFAULT 0,
    type TEXT DEFAULT 'standard',
    image TEXT,
    specialties TEXT[] DEFAULT '{}',
    service_types TEXT[] DEFAULT '{}',
    features TEXT[] DEFAULT '{}',
    emergency_level TEXT,
    available_beds INTEGER DEFAULT 0,
    icu_beds_available INTEGER DEFAULT 0,
    total_beds INTEGER DEFAULT 0,
    ambulances_count INTEGER DEFAULT 0,
    wait_time TEXT,
    price_range TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    coordinates GEOMETRY(POINT, 4326),  -- Shared geospatial field
    verified BOOLEAN DEFAULT false,
    verification_status TEXT DEFAULT 'pending',
    status TEXT DEFAULT 'available',
    place_id TEXT UNIQUE,
    org_admin_id UUID REFERENCES public.profiles(id),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    display_id TEXT UNIQUE,
    base_price NUMERIC,
    bed_availability JSONB DEFAULT '{}',
    ambulance_availability JSONB DEFAULT '{}',
    emergency_wait_time_minutes INTEGER,
    last_availability_update TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Table: `hospital_import_logs`

```sql
CREATE TABLE IF NOT EXISTS public.hospital_import_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_type TEXT NOT NULL,
    location_lat DOUBLE PRECISION,
    location_lng DOUBLE PRECISION,
    radius_km NUMERIC,
    search_query TEXT,
    status TEXT DEFAULT 'running',
    total_found INTEGER DEFAULT 0,
    imported_count INTEGER DEFAULT 0,
    skipped_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    errors JSONB,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    CONSTRAINT hospital_import_logs_counts_non_negative CHECK (
        COALESCE(total_found, 0) >= 0
        AND COALESCE(imported_count, 0) >= 0
        AND COALESCE(skipped_count, 0) >= 0
        AND COALESCE(error_count, 0) >= 0
    )
);
```

### Table: `providers`

```sql
CREATE TABLE IF NOT EXISTS public.providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  provider_type TEXT NOT NULL CHECK (provider_type IN (
    'hospital', 'pharmacy', 'lab', 'radiology', 'urgent_care',
    'clinic', 'mental_health', 'womens_care', 'pediatrics'
  )),
  provider_services JSONB DEFAULT '{}'::jsonb,
  provider_specialties JSONB DEFAULT '{}'::jsonb,
  insurance_accepted TEXT[] DEFAULT ARRAY[]::text[],
  structured_hours JSONB DEFAULT '{}'::jsonb,
  appointment_required BOOLEAN DEFAULT false,
  report_turnaround TEXT,
  age_range TEXT,
  crisis_line TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hospital_id, provider_type)
);
```

### Table: `doctors`

```sql
CREATE TABLE IF NOT EXISTS public.doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    specialization TEXT NOT NULL,
    image TEXT,
    rating DOUBLE PRECISION DEFAULT 5.0,
    reviews_count INTEGER DEFAULT 0,
    experience INTEGER,
    about TEXT,
    consultation_fee TEXT,
    is_available BOOLEAN DEFAULT true,
    is_on_call BOOLEAN DEFAULT false,
    max_patients INTEGER DEFAULT 10,
    current_patients INTEGER DEFAULT 0,
    department TEXT,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'busy', 'off_duty', 'on_call', 'invited')),
    license_number TEXT,
    email TEXT,
    phone TEXT,
    display_id TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Table: `doctor_schedules`

```sql
CREATE TABLE IF NOT EXISTS public.doctor_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    shift_type TEXT NOT NULL CHECK (shift_type IN ('day', 'evening', 'night')),
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Table: `emergency_doctor_assignments`

```sql
CREATE TABLE IF NOT EXISTS public.emergency_doctor_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emergency_request_id UUID NOT NULL,  -- FK added after emergency_requests table exists (in 0003)
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'accepted', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Table: `hospital_media`

```sql
CREATE TABLE IF NOT EXISTS public.hospital_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
    media_role TEXT NOT NULL DEFAULT 'hero',
    source_type TEXT NOT NULL,
    source_provider TEXT,
    remote_url TEXT,
    website_url TEXT,
    provider_photo_ref TEXT,
    attribution_text TEXT,
    attribution_html TEXT,
    attribution_required BOOLEAN NOT NULL DEFAULT false,
    confidence DOUBLE PRECISION NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'active',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT hospital_media_media_role_check CHECK (
        media_role IN ('hero', 'logo', 'gallery')
    ),
    CONSTRAINT hospital_media_source_type_check CHECK (
        source_type IN (
            'hospital_upload',
            'official_website_image',
            'provider_photo',
            'domain_logo',
            'deterministic_fallback',
            'seed_image'
        )
    ),
    CONSTRAINT hospital_media_status_check CHECK (
        status IN ('active', 'archived', 'failed')
    )
);
```

## 📄 20260219000300_logistics.sql

### Table: `ambulances`

```sql
CREATE TABLE IF NOT EXISTS public.ambulances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    profile_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE, -- Driver Profile
    type TEXT,
    call_sign TEXT,
    -- Dispatch lifecycle statuses (matches automations + emergency_logic RPCs)
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN (
        'available', 'dispatched', 'on_trip', 'en_route', 'on_scene', 'returning',
        'maintenance', 'offline', 'pending_approval'
    )),
    location GEOMETRY(POINT, 4326),
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
```

### Table: `emergency_requests`

```sql
CREATE TABLE IF NOT EXISTS public.emergency_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL,
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
```

### Table: `emergency_status_transitions`

```sql
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
```

### Table: `visits`

```sql
CREATE TABLE IF NOT EXISTS public.visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL,
    request_id UUID REFERENCES public.emergency_requests(id) ON DELETE SET NULL,
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
```

### Table: `emergency_chat_rooms`

```sql
CREATE TABLE IF NOT EXISTS public.emergency_chat_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emergency_request_id UUID NOT NULL UNIQUE REFERENCES public.emergency_requests(id) ON DELETE CASCADE,
    visit_id UUID REFERENCES public.visits(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_message_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ
);
```

### Table: `emergency_chat_participants`

```sql
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
```

### Table: `emergency_chat_messages`

```sql
CREATE TABLE IF NOT EXISTS public.emergency_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.emergency_chat_rooms(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    sender_role TEXT NOT NULL CHECK (sender_role IN ('patient', 'driver', 'crew', 'provider', 'hospital_admin', 'dispatcher', 'support', 'system')),
    kind TEXT NOT NULL DEFAULT 'text' CHECK (kind IN ('text', 'quick_action', 'status_event', 'system')),
    body TEXT NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 1000),
    client_message_id TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    edited_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);
```

## 📄 20260219000400_finance.sql

### Table: `organization_wallets`

```sql
CREATE TABLE IF NOT EXISTS public.organization_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
    balance NUMERIC DEFAULT 0.00,
    currency TEXT DEFAULT 'USD',
    display_id TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Table: `patient_wallets`

```sql
CREATE TABLE IF NOT EXISTS public.patient_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    balance NUMERIC DEFAULT 0.00,
    currency TEXT DEFAULT 'USD',
    display_id TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Table: `ivisit_main_wallet`

```sql
CREATE TABLE IF NOT EXISTS public.ivisit_main_wallet (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    balance NUMERIC DEFAULT 0.00,
    currency TEXT DEFAULT 'USD',
    last_updated TIMESTAMPTZ DEFAULT NOW()
);
```

### Table: `wallet_ledger`

```sql
CREATE TABLE IF NOT EXISTS public.wallet_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL,
    amount NUMERIC NOT NULL,
    transaction_type TEXT NOT NULL, -- 'credit', 'debit', 'payout', 'adjustment'
    description TEXT,
    reference_id UUID, -- Internal ID (Payment ID or Request ID)
    external_reference TEXT, -- External ID (Stripe Intent, Payout ID)
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Table: `payment_methods`

```sql
CREATE TABLE IF NOT EXISTS public.payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    provider TEXT NOT NULL,
    last4 TEXT,
    brand TEXT,
    expiry_month INTEGER CHECK (expiry_month BETWEEN 1 AND 12),
    expiry_year INTEGER,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Table: `payments`

```sql
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    emergency_request_id UUID REFERENCES public.emergency_requests(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES public.organizations(id),
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'USD',
    payment_method TEXT, -- 'cash', 'card', 'wallet'
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'declined')),
    stripe_payment_intent_id TEXT UNIQUE,
    ivisit_fee_amount NUMERIC DEFAULT 0.00,
    metadata JSONB DEFAULT '{}',             -- stores fee_amount, method_id, extra context
    provider_response JSONB DEFAULT '{}',
    processed_at TIMESTAMPTZ,
    display_id TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Table: `exchange_rates`

```sql
CREATE TABLE IF NOT EXISTS public.exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    base_currency TEXT NOT NULL,
    quote_currency TEXT NOT NULL,
    rate NUMERIC NOT NULL CHECK (rate > 0),
    source TEXT NOT NULL DEFAULT 'manual_seed',
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    stale_after TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT exchange_rates_currency_code_chk CHECK (
        base_currency ~ '^[A-Z]{3}$' AND quote_currency ~ '^[A-Z]{3}$'
    ),
    CONSTRAINT exchange_rates_base_quote_unique UNIQUE (base_currency, quote_currency)
);
```

### Table: `insurance_policies`

```sql
CREATE TABLE IF NOT EXISTS public.insurance_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    provider_name TEXT NOT NULL,
    policy_number TEXT NOT NULL,
    policy_type TEXT DEFAULT 'basic',
    coverage_amount NUMERIC(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Table: `insurance_billing`

```sql
CREATE TABLE IF NOT EXISTS public.insurance_billing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emergency_request_id UUID REFERENCES public.emergency_requests(id) ON DELETE SET NULL,
    hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    insurance_policy_id UUID REFERENCES public.insurance_policies(id) ON DELETE SET NULL,
    total_amount NUMERIC(10,2) NOT NULL,
    insurance_amount NUMERIC(10,2) NOT NULL,
    user_amount NUMERIC(10,2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
    billing_date DATE,
    paid_date DATE,
    coverage_percentage INTEGER,
    claim_number TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## 📄 20260219000500_ops_content.sql

### Table: `notifications`

```sql
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
    target_id UUID,
    action_data JSONB,
    metadata JSONB DEFAULT '{}',
    display_id TEXT UNIQUE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Table: `support_tickets`

```sql
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
```

### Table: `support_faqs`

```sql
CREATE TABLE IF NOT EXISTS public.support_faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    rank INTEGER DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Table: `health_news`

```sql
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
```

### Table: `documents`

```sql
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
```

## 📄 20260219000600_analytics.sql

### Table: `user_activity`

```sql
CREATE TABLE IF NOT EXISTS public.user_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT, -- 'profile', 'visit', 'emergency_request'
    entity_id UUID,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Table: `admin_audit_log`

```sql
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES public.profiles(id),
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Table: `search_history`

```sql
CREATE TABLE IF NOT EXISTS public.search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    result_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Table: `search_selections`

```sql
CREATE TABLE IF NOT EXISTS public.search_selections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    result_type TEXT NOT NULL,
    result_id TEXT NOT NULL,
    source TEXT DEFAULT 'search',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Table: `search_events`

```sql
CREATE TABLE IF NOT EXISTS public.search_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query TEXT,
    source TEXT, -- 'app', 'console'
    selected_key TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Table: `trending_topics`

```sql
CREATE TABLE IF NOT EXISTS public.trending_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query TEXT NOT NULL,
    category TEXT NOT NULL,
    rank INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## 📄 20260219000800_emergency_logic.sql

### Table: `service_pricing`

```sql
CREATE TABLE IF NOT EXISTS public.service_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID REFERENCES public.hospitals(id) ON DELETE CASCADE,
    service_type TEXT NOT NULL,
    service_name TEXT NOT NULL,
    base_price NUMERIC NOT NULL DEFAULT 0,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(hospital_id, service_type)
);
```

### Table: `room_pricing`

```sql
CREATE TABLE IF NOT EXISTS public.room_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID REFERENCES public.hospitals(id) ON DELETE CASCADE,
    room_type TEXT NOT NULL,
    room_name TEXT NOT NULL,
    price_per_night NUMERIC NOT NULL DEFAULT 0,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(hospital_id, room_type)
);
```

