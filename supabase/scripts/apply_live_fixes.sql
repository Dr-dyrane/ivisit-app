-- 🏯 ID BEAUTIFICATION & RESOLUTION REFINEMENTS
-- This script applies the latest refinements for Role-Based ID Beautification 
-- to the live database, ensuring parity with the source migrations.

BEGIN;

-- 1. Update the Stamping Function (Role-Aware)
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
    IF NEW.display_id IS NULL THEN
        NEW.display_id := public.generate_display_id(v_prefix);
    END IF;

    -- Sync to Central Registry
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.id_mappings (entity_id, display_id, entity_type)
        VALUES (NEW.id, NEW.display_id, TG_TABLE_NAME)
        ON CONFLICT (display_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update the Resolver (Universal)
CREATE OR REPLACE FUNCTION public.get_entity_id(p_display_id TEXT)
RETURNS UUID AS $$
DECLARE
    v_prefix TEXT;
    v_id UUID;
BEGIN
    v_prefix := SPLIT_PART(p_display_id, '-', 1);
    
    CASE v_prefix
        WHEN 'PAT', 'ADM', 'DPC', 'OAD', 'PRO', 'DOC', 'DRV', 'PMD', 'AMS', 'PHR', 'CLN', 'USR' THEN 
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
            SELECT entity_id INTO v_id FROM public.id_mappings WHERE display_id = p_display_id;
    END CASE;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 3. Ensure Triggers are Active on Missing Modules
DO $$
BEGIN
    -- Finance Triggers
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'stamp_pay_display_id') THEN
        CREATE TRIGGER stamp_pay_display_id BEFORE INSERT ON public.payments FOR EACH ROW EXECUTE PROCEDURE public.stamp_entity_display_id();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'stamp_pat_wallet_display_id') THEN
        CREATE TRIGGER stamp_pat_wallet_display_id BEFORE INSERT ON public.patient_wallets FOR EACH ROW EXECUTE PROCEDURE public.stamp_entity_display_id();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'stamp_org_wallet_display_id') THEN
        CREATE TRIGGER stamp_org_wallet_display_id BEFORE INSERT ON public.organization_wallets FOR EACH ROW EXECUTE PROCEDURE public.stamp_entity_display_id();
    END IF;

    -- Ops Triggers
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'stamp_ntf_display_id') THEN
        CREATE TRIGGER stamp_ntf_display_id BEFORE INSERT ON public.notifications FOR EACH ROW EXECUTE PROCEDURE public.stamp_entity_display_id();
    END IF;
END $$;

COMMIT;
