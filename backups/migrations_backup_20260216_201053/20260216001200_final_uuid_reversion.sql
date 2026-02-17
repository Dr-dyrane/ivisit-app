DROP VIEW IF EXISTS public.available_hospitals CASCADE;
DROP FUNCTION IF EXISTS public.nearby_hospitals(double precision, double precision, integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_all_auth_users() CASCADE;
DROP FUNCTION IF EXISTS public.process_payment_with_ledger() CASCADE;
DROP FUNCTION IF EXISTS public.process_cash_payment(TEXT, UUID, DECIMAL, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.process_payment_with_fees() CASCADE;
DROP FUNCTION IF EXISTS public.check_cash_eligibility(UUID, DECIMAL) CASCADE;
DROP FUNCTION IF EXISTS public.update_hospital_availability(TEXT, INTEGER, INTEGER, TEXT, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.get_entity_id(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_display_id(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_display_id(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_display_ids(UUID[]) CASCADE;
DROP FUNCTION IF EXISTS public.get_display_ids(TEXT[]) CASCADE;
DROP FUNCTION IF EXISTS public.on_hospital_created_generate_id() CASCADE;
DROP FUNCTION IF EXISTS public.on_profile_created_generate_id() CASCADE;

-- 2. KILL ALL ROGUE POLICIES (Comprehensive Sweep)
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- 3. DROP ALL FKs & PKs (To allow column type changes)
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN SELECT tc.table_name, tc.constraint_name FROM information_schema.table_constraints tc WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public' LOOP
        EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', r.table_name, r.constraint_name);
    END LOOP;
END $$;

ALTER TABLE public.organizations DROP CONSTRAINT IF EXISTS organizations_pkey CASCADE;
ALTER TABLE public.hospitals DROP CONSTRAINT IF EXISTS hospitals_pkey CASCADE;
-- 4. STABILIZE CORE TABLES (Drop and Re-add with Correct UUID Types)
-- Profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS organization_id;
ALTER TABLE public.profiles ADD COLUMN organization_id UUID;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS assigned_ambulance_id;
ALTER TABLE public.profiles ADD COLUMN assigned_ambulance_id TEXT;

-- Organizations
ALTER TABLE public.organizations DROP COLUMN IF EXISTS id CASCADE;
ALTER TABLE public.organizations ADD COLUMN id UUID DEFAULT gen_random_uuid() PRIMARY KEY;

-- Hospitals
ALTER TABLE public.hospitals DROP COLUMN IF EXISTS id CASCADE;
ALTER TABLE public.hospitals ADD COLUMN id UUID DEFAULT gen_random_uuid() PRIMARY KEY;
ALTER TABLE public.hospitals DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE public.hospitals ADD COLUMN organization_id UUID;

-- Ambulances
ALTER TABLE public.ambulances DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE public.ambulances ADD COLUMN organization_id UUID;
ALTER TABLE public.ambulances DROP COLUMN IF EXISTS hospital_id CASCADE;
ALTER TABLE public.ambulances ADD COLUMN hospital_id UUID;

-- Doctors
ALTER TABLE public.doctors DROP COLUMN IF EXISTS hospital_id CASCADE;
ALTER TABLE public.doctors ADD COLUMN hospital_id UUID;

-- Visits
ALTER TABLE public.visits DROP COLUMN IF EXISTS hospital_id CASCADE;
ALTER TABLE public.visits ADD COLUMN hospital_id UUID;

-- Id Mappings (Crucial fix)
ALTER TABLE public.id_mappings DROP COLUMN IF EXISTS entity_id CASCADE;
ALTER TABLE public.id_mappings ADD COLUMN entity_id UUID;

-- Financial Linked Tables
ALTER TABLE public.organization_wallets DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE public.organization_wallets ADD COLUMN organization_id UUID UNIQUE;
ALTER TABLE public.wallet_ledger DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE public.wallet_ledger ADD COLUMN organization_id UUID;
ALTER TABLE public.payments DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE public.payments ADD COLUMN organization_id UUID;
ALTER TABLE public.service_pricing DROP COLUMN IF EXISTS hospital_id CASCADE;
ALTER TABLE public.service_pricing ADD COLUMN hospital_id UUID;
ALTER TABLE public.emergency_requests DROP COLUMN IF EXISTS hospital_id CASCADE;
ALTER TABLE public.emergency_requests ADD COLUMN hospital_id UUID;
ALTER TABLE public.emergency_requests DROP COLUMN IF EXISTS ambulance_id CASCADE;
ALTER TABLE public.emergency_requests ADD COLUMN ambulance_id TEXT;

-- 5. RESTORE CONSTRAINTS
ALTER TABLE public.profiles ADD CONSTRAINT profiles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;
ALTER TABLE public.hospitals ADD CONSTRAINT hospitals_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;
ALTER TABLE public.ambulances ADD CONSTRAINT ambulances_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;
ALTER TABLE public.ambulances ADD CONSTRAINT ambulances_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES public.hospitals(id) ON DELETE SET NULL;
ALTER TABLE public.doctors ADD CONSTRAINT doctors_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES public.hospitals(id) ON DELETE CASCADE;
ALTER TABLE public.visits ADD CONSTRAINT visits_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES public.hospitals(id) ON DELETE SET NULL;
ALTER TABLE public.organization_wallets ADD CONSTRAINT organization_wallets_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 6. RE-IMPLEMENT RPCS (Strict UUID Return Types)
CREATE OR REPLACE FUNCTION public.nearby_hospitals(
    user_lat double precision,
    user_lng double precision,
    radius_km integer DEFAULT 50
)
RETURNS TABLE (
    id uuid, -- REVERTED TO UUID
    name text,
    address text,
    phone text,
    rating double precision,
    type text,
    image text,
    specialties text[],
    service_types text[],
    features text[],
    emergency_level text,
    available_beds integer,
    ambulances_count integer,
    wait_time text,
    price_range text,
    latitude double precision,
    longitude double precision,
    verified boolean,
    status text,
    distance_km double precision,
    place_id text,
    google_address text,
    google_phone text,
    google_rating numeric,
    google_photos text[],
    google_opening_hours jsonb,
    google_types text[],
    google_website text,
    import_status text,
    org_admin_id uuid,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    display_id text 
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        h.id, h.name, h.address, h.phone, h.rating, h.type, h.image, h.specialties, h.service_types, h.features, h.emergency_level,
        h.available_beds, h.ambulances_count, h.wait_time, h.price_range, h.latitude, h.longitude, h.verified, h.status,
        (ST_Distance(ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography, ST_SetSRID(ST_MakePoint(h.longitude, h.latitude), 4326)::geography) / 1000.0) as distance_km,
        h.place_id, h.google_address, h.google_phone, h.google_rating, h.google_photos, h.google_opening_hours, h.google_types, h.google_website, h.import_status, h.org_admin_id, h.created_at, h.updated_at, h.display_id
    FROM public.hospitals h
    WHERE h.latitude IS NOT NULL AND h.longitude IS NOT NULL
      AND ST_DWithin(ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography, ST_SetSRID(ST_MakePoint(h.longitude, h.latitude), 4326)::geography, radius_km * 1000)
    ORDER BY distance_km ASC;
END;
$$;

-- 7. RE-IMPLEMENT ID BEAUTIFICATION FUNCTIONS (Strict UUID)
CREATE OR REPLACE FUNCTION public.get_entity_id(p_display_id TEXT)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT entity_id FROM public.id_mappings WHERE display_id = p_display_id; $$;

CREATE OR REPLACE FUNCTION public.get_display_id(p_entity_id UUID)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT display_id FROM public.id_mappings WHERE entity_id = p_entity_id; $$;

CREATE OR REPLACE FUNCTION public.get_display_ids(p_entity_ids UUID[])
RETURNS TABLE(entity_id UUID, display_id TEXT) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT entity_id, display_id FROM public.id_mappings WHERE entity_id = ANY(p_entity_ids); $$;

-- Update Trigger Functions for IDs
CREATE OR REPLACE FUNCTION public.on_hospital_created_generate_id()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE display_id TEXT;
BEGIN
    display_id := public.generate_display_id('ORG');
    INSERT INTO public.id_mappings (entity_type, entity_id, display_id)
    VALUES ('hospital', NEW.id, display_id) 
    ON CONFLICT (entity_type, entity_id) DO NOTHING;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.on_profile_created_generate_id()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE prefix TEXT; display_id TEXT; entity_type_val TEXT;
BEGIN
    IF NEW.role = 'patient' THEN prefix := 'IVP'; entity_type_val := 'patient';
    ELSIF NEW.role IN ('admin', 'org_admin') THEN prefix := 'ADM'; entity_type_val := 'admin';
    ELSIF NEW.role = 'dispatcher' THEN prefix := 'DSP'; entity_type_val := 'dispatcher';
    ELSIF NEW.role = 'provider' THEN prefix := 'PRV'; entity_type_val := 'provider';
    ELSE RETURN NEW; END IF;
    
    display_id := public.generate_display_id(prefix);
    INSERT INTO public.id_mappings (entity_type, entity_id, display_id)
    VALUES (entity_type_val, NEW.id, display_id) 
    ON CONFLICT (entity_type, entity_id) DO NOTHING;
    RETURN NEW;
END;
$$;

-- 8. RE-IMPLEMENT FINANCIAL LOGIC (Hyper-Safe ::text casting)
CREATE OR REPLACE FUNCTION public.process_payment_with_ledger()
RETURNS TRIGGER AS $$
DECLARE
    v_organization_id UUID;
    v_fee_amount DECIMAL;
    v_organization_amount DECIMAL;
    v_fee_rate DECIMAL;
    v_main_wallet_id UUID;
    v_org_wallet_id UUID;
    v_already_credited BOOLEAN;
    v_is_top_up BOOLEAN;
    v_is_cash BOOLEAN;
BEGIN
    v_already_credited := (NEW.metadata->>'ledger_credited')::boolean;
    v_is_top_up := (NEW.metadata->>'is_top_up')::boolean;
    v_is_cash := (NEW.payment_method_id::text = 'cash');

    IF NEW.organization_id IS NULL AND NEW.emergency_request_id IS NOT NULL THEN
        SELECT h.organization_id INTO v_organization_id
        FROM public.emergency_requests er
        JOIN public.hospitals h ON er.hospital_id::text = h.id::text
        WHERE er.id::text = NEW.emergency_request_id::text;
        NEW.organization_id := v_organization_id;
    END IF;

    IF NEW.status = 'completed' AND COALESCE(v_already_credited, false) = false THEN
        NEW.metadata := jsonb_set(COALESCE(NEW.metadata, '{}'::jsonb), '{ledger_credited}', 'true');
        SELECT id INTO v_main_wallet_id FROM public.ivisit_main_wallet LIMIT 1;
        IF v_is_top_up THEN
            IF NEW.organization_id IS NULL THEN
                UPDATE public.ivisit_main_wallet SET balance = balance + NEW.amount WHERE id = v_main_wallet_id;
                INSERT INTO public.wallet_ledger (wallet_type, wallet_id, amount, transaction_type, description, reference_id, reference_type)
                VALUES ('main', v_main_wallet_id, NEW.amount, 'credit', 'Platform top-up', NEW.id, 'adjustment');
            ELSE
                INSERT INTO public.organization_wallets (organization_id, balance) VALUES (NEW.organization_id, NEW.amount)
                ON CONFLICT (organization_id) DO UPDATE SET balance = organization_wallets.balance + NEW.amount RETURNING id INTO v_org_wallet_id;
                INSERT INTO public.wallet_ledger (wallet_type, wallet_id, organization_id, amount, transaction_type, description, reference_id, reference_type)
                VALUES ('organization', v_org_wallet_id, NEW.organization_id, NEW.amount, 'credit', 'Org top-up', NEW.id, 'adjustment');
            END IF;
        ELSIF NEW.organization_id IS NOT NULL THEN
            SELECT ivisit_fee_percentage INTO v_fee_rate FROM public.organizations WHERE id::text = NEW.organization_id::text;
            v_fee_rate := COALESCE(v_fee_rate, 2.5);
            v_fee_amount := (NEW.amount * v_fee_rate) / 100;
            v_organization_amount := NEW.amount - v_fee_amount;
            IF v_is_cash THEN
                UPDATE public.organization_wallets SET balance = balance - v_fee_amount WHERE organization_id::text = NEW.organization_id::text RETURNING id INTO v_org_wallet_id;
                INSERT INTO public.wallet_ledger (wallet_type, wallet_id, organization_id, amount, transaction_type, description, reference_id, reference_type)
                VALUES ('organization', v_org_wallet_id, NEW.organization_id, -v_fee_amount, 'debit', 'Cash fee for ' || NEW.id, NEW.id, 'payment');
            ELSE
                INSERT INTO public.organization_wallets (organization_id, balance) VALUES (NEW.organization_id, v_organization_amount)
                ON CONFLICT (organization_id) DO UPDATE SET balance = organization_wallets.balance + v_organization_amount RETURNING id INTO v_org_wallet_id;
                INSERT INTO public.wallet_ledger (wallet_type, wallet_id, organization_id, amount, transaction_type, description, reference_id, reference_type)
                VALUES ('organization', v_org_wallet_id, NEW.organization_id, v_organization_amount, 'credit', 'Payment ' || NEW.id, NEW.id, 'payment');
            END IF;
            UPDATE public.ivisit_main_wallet SET balance = balance + v_fee_amount WHERE id = v_main_wallet_id;
            INSERT INTO public.wallet_ledger (wallet_type, wallet_id, amount, transaction_type, description, reference_id, reference_type)
            VALUES ('main', v_main_wallet_id, v_fee_amount, 'credit', 'Fee from ' || NEW.id, NEW.id, 'payment');
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER process_payment_ledger_trigger BEFORE INSERT OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.process_payment_with_ledger();

-- 8. RESTORE RLS POLICIES (Hyper-Robust)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are readable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public hospitals are readable" ON public.hospitals FOR SELECT USING (true);

ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public doctors are readable" ON public.doctors FOR SELECT USING (true);

ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see own visits" ON public.visits FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE public.emergency_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own emergencies" ON public.emergency_requests FOR ALL USING (user_id = auth.uid());

-- 9. RECREATE VIEW
CREATE OR REPLACE VIEW public.available_hospitals AS
SELECT id, name, status, available_beds, ambulances_count, latitude, longitude
FROM public.hospitals WHERE status = 'available';


-- Final reload
NOTIFY pgrst, 'reload schema';
