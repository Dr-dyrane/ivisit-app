-- 🏯 Module 02: Identity & Registry
-- Profiles, Preferences, and ID Mapping

-- 1. Identity Registry (Core Profiles)
-- Removed id_mappings table for direct fluid flow.
-- Each table now holds its own display_id with unique indexes.

-- 2. Profiles
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
    onboarding_status TEXT CHECK (onboarding_status IN ('pending', 'complete')),
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

-- 3. Preferences
CREATE TABLE IF NOT EXISTS public.preferences (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    demo_mode_enabled BOOLEAN NOT NULL DEFAULT true,
    notifications_enabled BOOLEAN NOT NULL DEFAULT true,
    appointment_reminders BOOLEAN NOT NULL DEFAULT true,
    emergency_updates BOOLEAN NOT NULL DEFAULT true,
    privacy_share_medical_profile BOOLEAN NOT NULL DEFAULT false,
    privacy_share_emergency_contacts BOOLEAN NOT NULL DEFAULT false,
    notification_sounds_enabled BOOLEAN NOT NULL DEFAULT true,
    view_preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Medical Profiles
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

-- 5. Subscribers
CREATE TABLE IF NOT EXISTS public.subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    type TEXT DEFAULT 'free' CHECK (type IN ('free', 'paid')),
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Roles & Sessions
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    last_active TIMESTAMPTZ DEFAULT NOW(),
    session_data JSONB DEFAULT '{}'
);

-- 🛠️ AUTOMATION: IDENTITY HOOKS
-- triggers moved to 20260219000900_automations.sql to resolve dependency on Finance module


-- 🛠️ STAMP DISPLAY ID TRIGGER (Fluid Edition)
CREATE OR REPLACE FUNCTION public.stamp_entity_display_id()
RETURNS TRIGGER AS $$
DECLARE
    v_prefix TEXT;
    v_display_id TEXT;
BEGIN
    -- Determine Prefix
    CASE TG_TABLE_NAME
        WHEN 'profiles' THEN v_prefix := 'USR';
        WHEN 'hospitals' THEN v_prefix := 'HSP';
        WHEN 'ambulances' THEN v_prefix := 'AMB';
        WHEN 'emergency_requests' THEN v_prefix := 'REQ';
        WHEN 'visits' THEN v_prefix := 'VIST';
        WHEN 'organizations' THEN v_prefix := 'ORG';
        WHEN 'doctors' THEN v_prefix := 'DOC';
        WHEN 'payments' THEN v_prefix := 'PAY';
        WHEN 'notifications' THEN v_prefix := 'NTF';
        ELSE v_prefix := 'ID';
    END CASE;

    -- Generate and set Display ID on current record
    IF NEW.display_id IS NULL THEN
        NEW.display_id := public.generate_display_id(v_prefix);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 🛠️ FLUID ID RESOLVER (Virtual Mapping Replacement)
CREATE OR REPLACE FUNCTION public.get_entity_id(p_display_id TEXT)
RETURNS UUID AS $$
DECLARE
    v_prefix TEXT;
    v_id UUID;
BEGIN
    v_prefix := SPLIT_PART(p_display_id, '-', 1);
    
    CASE v_prefix
        WHEN 'USR' THEN SELECT id INTO v_id FROM public.profiles WHERE display_id = p_display_id;
        WHEN 'HSP' THEN SELECT id INTO v_id FROM public.hospitals WHERE display_id = p_display_id;
        WHEN 'ORG' THEN SELECT id INTO v_id FROM public.organizations WHERE display_id = p_display_id;
        WHEN 'AMB' THEN SELECT id INTO v_id FROM public.ambulances WHERE display_id = p_display_id;
        WHEN 'REQ' THEN SELECT id INTO v_id FROM public.emergency_requests WHERE display_id = p_display_id;
        WHEN 'VIST' THEN SELECT id INTO v_id FROM public.visits WHERE display_id = p_display_id;
        WHEN 'DOC' THEN SELECT id INTO v_id FROM public.doctors WHERE display_id = p_display_id;
        ELSE v_id := NULL;
    END CASE;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE TRIGGER stamp_profile_display_id
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE PROCEDURE public.stamp_entity_display_id();
