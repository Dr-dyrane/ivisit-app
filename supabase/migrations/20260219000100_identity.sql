-- 🏯 Module 02: Identity & Registry
-- Profiles, Preferences, and ID Mapping

-- 1. Identity Registry (Core Profiles)
-- Central ID mapping table for display ID resolution
CREATE TABLE IF NOT EXISTS public.id_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL,
    display_id TEXT NOT NULL UNIQUE,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('patient', 'provider', 'hospital', 'admin', 'dispatcher', 'doctor', 'ambulance', 'driver', 'emergency_request', 'visit', 'organization', 'payment', 'notification', 'wallet', 'org_admin', 'viewer', 'sponsor')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

-- 5. Emergency Contacts
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

-- 5. Subscribers
CREATE TABLE IF NOT EXISTS public.subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    type TEXT DEFAULT 'free' CHECK (type IN ('free', 'paid')),
    status TEXT DEFAULT 'active',
    new_user BOOLEAN DEFAULT true,
    welcome_email_sent BOOLEAN DEFAULT false,
    subscription_date TIMESTAMPTZ DEFAULT NOW(),
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

-- Username Generation Utility
CREATE OR REPLACE FUNCTION public.generate_username_from_email(email_input TEXT)
RETURNS TEXT AS $$
DECLARE
    base_username TEXT;
    final_username TEXT;
    counter INTEGER := 0;
BEGIN
    base_username := LOWER(SPLIT_PART(COALESCE(email_input, ''), '@', 1));
    base_username := REGEXP_REPLACE(base_username, '[^a-z0-9]', '', 'g');

    IF LENGTH(base_username) < 3 THEN
        base_username := 'user' || COALESCE(NULLIF(base_username, ''), 'ivisit');
    END IF;

    final_username := base_username;

    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
        counter := counter + 1;
        final_username := base_username || counter::TEXT;
    END LOOP;

    RETURN final_username;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill missing usernames from email without touching existing usernames.
UPDATE public.profiles p
SET
    username = public.generate_username_from_email(au.email),
    updated_at = NOW()
FROM auth.users au
WHERE p.id = au.id
  AND au.email IS NOT NULL
  AND (p.username IS NULL OR p.username = '');


-- 🛠️ AUTOMATION: SMART ONBOARDING
-- Automatic Onboarding Completion based on Data Presence
CREATE OR REPLACE FUNCTION public.recalculate_onboarding_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Only attempt to auto-complete if the current status is 'pending'
    IF NEW.onboarding_status = 'pending' THEN
        
        -- Rule 1: Administrative Blessing / Manual Assignment
        -- If an org_admin, provider, or dispatcher is linked to an organization, onboarding is effectively over.
        IF (NEW.role IN ('org_admin', 'provider', 'dispatcher') AND NEW.organization_id IS NOT NULL) THEN
            NEW.onboarding_status := 'complete';
        
        -- Rule 2: Field Operative Assignment
        -- If a driver or paramedic is assigned to an ambulance, they are ready for duty.
        ELSIF (NEW.assigned_ambulance_id IS NOT NULL) THEN
            NEW.onboarding_status := 'complete';
            
        -- Rule 3: System Sovereign
        -- Admins never need to onboarding.
        ELSIF (NEW.role = 'admin') THEN
            NEW.onboarding_status := 'complete';
            
        -- Rule 4: Verified Identity
        -- If a patient completes BVN verification, they have satisfied the core requirement.
        ELSIF (NEW.role = 'patient' AND NEW.bvn_verified = true) THEN
            NEW.onboarding_status := 'complete';
            
        -- Rule 5: Financial Commitment
        -- If a Stripe Customer ID is present, they have bypassed or completed the payment setup.
        ELSIF (NEW.stripe_customer_id IS NOT NULL) THEN
            NEW.onboarding_status := 'complete';
        END IF;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_data_presence_onboarding ON public.profiles;
CREATE TRIGGER on_profile_data_presence_onboarding
BEFORE INSERT OR UPDATE OF organization_id, assigned_ambulance_id, role, bvn_verified, stripe_customer_id, onboarding_status
ON public.profiles
FOR EACH ROW
EXECUTE PROCEDURE public.recalculate_onboarding_status();


-- 🛠️ STAMP DISPLAY ID TRIGGER (Fluid Edition: Role-Aware)
CREATE OR REPLACE FUNCTION public.stamp_entity_display_id()
RETURNS TRIGGER AS $$
DECLARE
    v_prefix TEXT;
    v_role TEXT;
    v_type TEXT;
BEGIN
    -- Determine Prefix Based on Table and Role
    CASE TG_TABLE_NAME
        WHEN 'profiles' THEN 
            -- Granular User Beautification
            v_role := NEW.role;
            v_type := NEW.provider_type;
            
            IF v_role = 'admin' THEN v_prefix := 'ADM';
            ELSIF v_role = 'patient' THEN v_prefix := 'PAT';
            ELSIF v_role = 'dispatcher' THEN v_prefix := 'DPC';
            ELSIF v_role = 'org_admin' THEN v_prefix := 'OAD';
            ELSIF v_role = 'viewer' THEN v_prefix := 'VWR';
            ELSIF v_role = 'sponsor' THEN v_prefix := 'SPN';
            ELSIF v_role = 'provider' THEN
                CASE v_type
                    WHEN 'doctor' THEN v_prefix := 'DOC';
                    WHEN 'driver' THEN v_prefix := 'DRV';
                    WHEN 'paramedic' THEN v_prefix := 'PMD';
                    WHEN 'ambulance_service' THEN v_prefix := 'AMS';
                    WHEN 'pharmacy' THEN v_prefix := 'PHR';
                    WHEN 'clinic' THEN v_prefix := 'CLN';
                    ELSE v_prefix := 'PRO';
                END CASE;
            ELSE v_prefix := 'USR';
            END IF;
            
        WHEN 'organizations' THEN v_prefix := 'ORG';
        WHEN 'hospitals' THEN v_prefix := 'HSP';
        WHEN 'doctors' THEN v_prefix := 'DOC';
        WHEN 'ambulances' THEN v_prefix := 'AMB';
        WHEN 'emergency_requests' THEN v_prefix := 'REQ';
        WHEN 'visits' THEN v_prefix := 'VIST';
        WHEN 'payments' THEN v_prefix := 'PAY';
        WHEN 'notifications' THEN v_prefix := 'NTF';
        WHEN 'patient_wallets' THEN v_prefix := 'WLT';
        WHEN 'organization_wallets' THEN v_prefix := 'OWL';
        ELSE v_prefix := 'ID';
    END CASE;

    -- Generate and set Display ID on current record
    IF TG_OP = 'INSERT' AND NEW.display_id IS NULL THEN
        NEW.display_id := public.generate_display_id(v_prefix);
    ELSIF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'profiles' THEN
        -- Rule: Ensure display_id prefix matches the role/type on every touch
        IF NEW.display_id IS NULL OR LEFT(NEW.display_id, 3) != v_prefix THEN
            NEW.display_id := public.generate_display_id(v_prefix);
        END IF;
    END IF;

    -- Sync to Central Registry (redundancy for cross-table lookup speed)
    IF TG_OP = 'INSERT' THEN
        -- Map plural table names to canonical id_mappings entity_type values.
        v_type := CASE
            WHEN TG_TABLE_NAME = 'profiles' THEN COALESCE(v_role, 'patient')
            WHEN TG_TABLE_NAME = 'organizations' THEN 'organization'
            WHEN TG_TABLE_NAME = 'hospitals' THEN 'hospital'
            WHEN TG_TABLE_NAME = 'doctors' THEN 'doctor'
            WHEN TG_TABLE_NAME = 'ambulances' THEN 'ambulance'
            WHEN TG_TABLE_NAME = 'emergency_requests' THEN 'emergency_request'
            WHEN TG_TABLE_NAME = 'visits' THEN 'visit'
            WHEN TG_TABLE_NAME = 'payments' THEN 'payment'
            WHEN TG_TABLE_NAME = 'notifications' THEN 'notification'
            WHEN TG_TABLE_NAME IN ('patient_wallets', 'organization_wallets') THEN 'wallet'
            ELSE 'patient'
        END;

        INSERT INTO public.id_mappings (entity_id, display_id, entity_type)
        VALUES (NEW.id, NEW.display_id, v_type)
        ON CONFLICT (display_id) DO NOTHING;
    ELSIF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'profiles' AND NEW.display_id IS DISTINCT FROM OLD.display_id THEN
        -- Role or type changed, update the display_id and entity_type in the registry
        v_type := NEW.role;
        IF v_type NOT IN ('patient', 'provider', 'hospital', 'admin', 'dispatcher', 'doctor', 'ambulance', 'driver', 'emergency_request', 'visit', 'organization', 'payment', 'notification', 'wallet', 'org_admin', 'viewer', 'sponsor') THEN
            v_type := 'patient';
        END IF;

        UPDATE public.id_mappings 
        SET display_id = NEW.display_id,
            entity_type = v_type
        WHERE entity_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 🛠️ FLUID ID RESOLVER (Universal Resolution)
CREATE OR REPLACE FUNCTION public.get_entity_id(p_display_id TEXT)
RETURNS UUID AS $$
DECLARE
    v_prefix TEXT;
    v_id UUID;
BEGIN
    v_prefix := SPLIT_PART(p_display_id, '-', 1);
    
    CASE v_prefix
        WHEN 'PAT', 'ADM', 'DPC', 'OAD', 'VWR', 'SPN', 'PRO', 'DOC', 'DRV', 'PMD', 'AMS', 'PHR', 'CLN', 'USR' THEN 
            SELECT id INTO v_id FROM public.profiles WHERE display_id = p_display_id;
        WHEN 'HSP' THEN SELECT id INTO v_id FROM public.hospitals WHERE display_id = p_display_id;
        WHEN 'ORG' THEN SELECT id INTO v_id FROM public.organizations WHERE display_id = p_display_id;
        WHEN 'AMB' THEN SELECT id INTO v_id FROM public.ambulances WHERE display_id = p_display_id;
        WHEN 'REQ' THEN SELECT id INTO v_id FROM public.emergency_requests WHERE display_id = p_display_id;
        WHEN 'VIST' THEN SELECT id INTO v_id FROM public.visits WHERE display_id = p_display_id;
        WHEN 'PAY' THEN SELECT id INTO v_id FROM public.payments WHERE display_id = p_display_id;
        WHEN 'NTF' THEN SELECT id INTO v_id FROM public.notifications WHERE display_id = p_display_id;
        WHEN 'WLT' THEN SELECT id INTO v_id FROM public.patient_wallets WHERE display_id = p_display_id;
        WHEN 'OWL' THEN SELECT id INTO v_id FROM public.organization_wallets WHERE display_id = p_display_id;
        ELSE 
            -- Final Fallback: Check central registry
            SELECT entity_id INTO v_id FROM public.id_mappings WHERE display_id = p_display_id;
    END CASE;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE TRIGGER stamp_profile_display_id
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE PROCEDURE public.stamp_entity_display_id();

-- Missing updated_at triggers for identity tables
CREATE TRIGGER handle_prefs_updated_at BEFORE UPDATE ON public.preferences FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_med_profile_updated_at BEFORE UPDATE ON public.medical_profiles FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_emergency_contact_updated_at BEFORE UPDATE ON public.emergency_contacts FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_subscriber_updated_at BEFORE UPDATE ON public.subscribers FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER stamp_emergency_contact_display_id BEFORE INSERT ON public.emergency_contacts FOR EACH ROW EXECUTE PROCEDURE public.stamp_entity_display_id();

-- 🏥 Medical Profile RPC Functions
-- Part of Master System Improvement Plan - Phase 2 Important System Enhancements

-- 1. Get Medical Summary
CREATE OR REPLACE FUNCTION public.get_medical_summary(
    p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_medical_profile JSONB;
    v_result JSONB;
BEGIN
    -- Get user's medical profile
    SELECT jsonb_build_object(
        'blood_type', blood_type,
        'allergies', allergies,
        'medications', medications,
        'conditions', conditions,
        'emergency_notes', emergency_notes,
        'updated_at', updated_at
    ) INTO v_medical_profile
    FROM public.medical_profiles 
    WHERE user_id = p_user_id;
    
    IF v_medical_profile IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Medical profile not found',
            'code', 'PROFILE_NOT_FOUND'
        );
    END IF;
    
    v_result := jsonb_build_object(
        'success', true,
        'medical_summary', v_medical_profile,
        'retrieved_at', NOW()
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. Validate Medical Profile
CREATE OR REPLACE FUNCTION public.validate_medical_profile(
    p_user_id UUID,
    p_medical_data JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_validation_errors TEXT[];
    v_result JSONB;
BEGIN
    -- Validate required fields
    IF p_medical_data->>'blood_type' IS NULL OR p_medical_data->>'blood_type' = '' THEN
        v_validation_errors := array_append(v_validation_errors, 'Blood type is required');
    END IF;
    
    -- Validate blood type format
    IF p_medical_data->>'blood_type' IS NOT NULL THEN
        IF p_medical_data->>'blood_type' NOT IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') THEN
            v_validation_errors := array_append(v_validation_errors, 'Invalid blood type format');
        END IF;
    END IF;
    
    -- Validate allergies format
    IF p_medical_data->>'allergies' IS NOT NULL AND LENGTH(p_medical_data->>'allergies') > 1000 THEN
        v_validation_errors := array_append(v_validation_errors, 'Allergies field too long (max 1000 chars)');
    END IF;
    
    -- Validate medications format
    IF p_medical_data->>'medications' IS NOT NULL AND LENGTH(p_medical_data->>'medications') > 1000 THEN
        v_validation_errors := array_append(v_validation_errors, 'Medications field too long (max 1000 chars)');
    END IF;
    
    -- Return validation result
    IF array_length(v_validation_errors, 1) > 0 THEN
        v_result := jsonb_build_object(
            'valid', false,
            'errors', v_validation_errors,
            'code', 'VALIDATION_FAILED'
        );
    ELSE
        v_result := jsonb_build_object(
            'valid', true,
            'code', 'VALIDATION_PASSED'
        );
    END IF;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update Medical Profile
CREATE OR REPLACE FUNCTION public.update_medical_profile(
    p_user_id UUID,
    p_medical_data JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_validation_result JSONB;
    v_profile_exists BOOLEAN;
    v_result JSONB;
BEGIN
    -- Validate medical data first
    v_validation_result := public.validate_medical_profile(p_user_id, p_medical_data);
    
    IF NOT (v_validation_result->>'valid')::BOOLEAN THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Validation failed',
            'validation_errors', v_validation_result->'errors'
        );
    END IF;
    
    -- Check if profile exists
    SELECT EXISTS(
        SELECT 1 FROM public.medical_profiles 
        WHERE user_id = p_user_id
    ) INTO v_profile_exists;
    
    -- Update or insert profile
    IF v_profile_exists THEN
        UPDATE public.medical_profiles 
        SET 
            blood_type = p_medical_data->>'blood_type',
            allergies = p_medical_data->>'allergies',
            medications = p_medical_data->>'medications',
            conditions = p_medical_data->>'conditions',
            emergency_notes = p_medical_data->>'emergency_notes',
            updated_at = NOW()
        WHERE user_id = p_user_id;
    ELSE
        INSERT INTO public.medical_profiles (
            user_id, blood_type, allergies, medications, conditions, emergency_notes
        ) VALUES (
            p_user_id, 
            p_medical_data->>'blood_type',
            p_medical_data->>'allergies',
            p_medical_data->>'medications',
            p_medical_data->>'conditions',
            p_medical_data->>'emergency_notes'
        );
    END IF;
    
    v_result := jsonb_build_object(
        'success', true,
        'user_id', p_user_id,
        'updated_at', NOW()
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Get Emergency Medical Data
CREATE OR REPLACE FUNCTION public.get_emergency_medical_data(
    p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_medical_profile JSONB;
    v_emergency_contacts JSONB;
    v_result JSONB;
BEGIN
    -- Get medical profile
    SELECT jsonb_build_object(
        'blood_type', blood_type,
        'allergies', allergies,
        'medications', medications,
        'conditions', conditions,
        'emergency_notes', emergency_notes
    ) INTO v_medical_profile
    FROM public.medical_profiles 
    WHERE user_id = p_user_id;
    
    -- Get emergency contacts
    SELECT jsonb_agg(
        jsonb_build_object(
            'name', name,
            'relationship', relationship,
            'phone', phone,
            'is_primary', is_primary
        )
    ) INTO v_emergency_contacts
    FROM public.emergency_contacts 
    WHERE user_id = p_user_id 
    AND is_active = true;
    
    v_result := jsonb_build_object(
        'success', true,
        'medical_profile', v_medical_profile,
        'emergency_contacts', v_emergency_contacts,
        'retrieved_at', NOW()
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
