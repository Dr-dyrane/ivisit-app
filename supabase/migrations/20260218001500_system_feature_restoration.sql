-- ============================================================================
-- SYSTEM FEATURE RESTORATION (RLS + TRIGGERS + AUTOMATIONS)
-- ============================================================================
-- 1. Restores the full set of Master RLS policies (casted for TEXT IDs).
-- 2. Restores User Onboarding Automations (Auth -> Profile -> Wallet).
-- 3. Restores Financial Ledgering (Payments -> Ledger).
-- 4. Restores ID Beautification (ORG-XXX, IVP-XXX prefixes).
-- ============================================================================

BEGIN;

-- ═══════════════════════════════════════════════════════════
-- 1. RE-APPLY MASTER RLS (CASTED FOR TEXT)
-- ═══════════════════════════════════════════════════════════

-- [Profiles]
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (id::text = auth.uid()::text);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (id::text = auth.uid()::text);

-- [Hospitals]
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view hospitals" ON public.hospitals;
CREATE POLICY "Authenticated users can view hospitals" ON public.hospitals FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Platform Admins can manage hospitals" ON public.hospitals;
CREATE POLICY "Platform Admins can manage hospitals" ON public.hospitals FOR ALL USING (public.get_current_user_role() = 'admin');

-- [Emergency Requests]
ALTER TABLE public.emergency_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own emergencies" ON public.emergency_requests;
CREATE POLICY "Users manage own emergencies" ON public.emergency_requests FOR ALL USING (user_id::text = auth.uid()::text);
DROP POLICY IF EXISTS "Admins view all emergencies" ON public.emergency_requests;
CREATE POLICY "Admins view all emergencies" ON public.emergency_requests FOR ALL USING (public.get_current_user_role() IN ('admin', 'org_admin', 'dispatcher'));

-- [Visits]
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own visits" ON public.visits;
CREATE POLICY "Users can view own visits" ON public.visits FOR SELECT USING (user_id::text = auth.uid()::text);

-- [Wallets]
ALTER TABLE public.patient_wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own patient wallet" ON public.patient_wallets;
CREATE POLICY "Users manage own patient wallet" ON public.patient_wallets FOR ALL USING (user_id::text = auth.uid()::text);

ALTER TABLE public.organization_wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Org admins view their own wallet" ON public.organization_wallets;
CREATE POLICY "Org admins view their own wallet" ON public.organization_wallets FOR SELECT USING (
    organization_id::text = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR public.get_current_user_role() = 'admin'
);

-- ═══════════════════════════════════════════════════════════
-- 2. RESTORE ONBOARDING ENGINE
-- ═══════════════════════════════════════════════════════════

-- Handle New User (Auth -> Profile)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, phone, full_name, avatar_url, updated_at)
  VALUES (NEW.id, NEW.email, NEW.phone, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url', now())
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, phone = EXCLUDED.phone, updated_at = now();
  
  INSERT INTO public.preferences (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Handle Profile Features (Wallet & Medical)
CREATE OR REPLACE FUNCTION public.handle_new_profile_features()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.medical_profiles (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.patient_wallets (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS tr_on_profile_created_features ON public.profiles;
CREATE TRIGGER tr_on_profile_created_features AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile_features();

-- ═══════════════════════════════════════════════════════════
-- 3. RESTORE FINANCIAL ENGINE (Ledger)
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.process_payment_with_ledger()
RETURNS TRIGGER AS $$
DECLARE
    v_organization_id TEXT;
    v_fee_amount DECIMAL;
    v_organization_amount DECIMAL;
    v_fee_rate DECIMAL;
    v_main_wallet_id UUID;
    v_org_wallet_id UUID;
    v_already_credited BOOLEAN;
BEGIN
    v_already_credited := COALESCE((NEW.metadata->>'ledger_credited')::boolean, false);

    IF NEW.organization_id IS NULL AND NEW.emergency_request_id IS NOT NULL THEN
        SELECT h.organization_id::text INTO v_organization_id
        FROM public.emergency_requests er
        JOIN public.hospitals h ON er.hospital_id = h.id
        WHERE er.id = NEW.emergency_request_id;
        NEW.organization_id := v_organization_id;
    END IF;

    IF NEW.status = 'completed' AND NOT v_already_credited AND NEW.organization_id IS NOT NULL THEN
        SELECT ivisit_fee_percentage INTO v_fee_rate FROM public.organizations WHERE id = NEW.organization_id;
        v_fee_rate := COALESCE(v_fee_rate, 2.5);
        v_fee_amount := (NEW.amount * v_fee_rate) / 100;
        v_organization_amount := NEW.amount - v_fee_amount;
        
        NEW.metadata := jsonb_set(COALESCE(NEW.metadata, '{}'::jsonb), '{ledger_credited}', 'true');
        
        -- Platform Fee
        SELECT id INTO v_main_wallet_id FROM public.ivisit_main_wallet LIMIT 1;
        UPDATE public.ivisit_main_wallet SET balance = balance + v_fee_amount WHERE id = v_main_wallet_id;
        INSERT INTO public.wallet_ledger (wallet_type, wallet_id, amount, transaction_type, reference_id, reference_type)
        VALUES ('main', v_main_wallet_id::text, v_fee_amount, 'credit', NEW.id, 'payment');

        -- Org Balance
        INSERT INTO public.organization_wallets (organization_id, balance) 
        VALUES (NEW.organization_id, v_organization_amount)
        ON CONFLICT (organization_id) DO UPDATE SET balance = organization_wallets.balance + v_organization_amount RETURNING id INTO v_org_wallet_id;
        
        INSERT INTO public.wallet_ledger (wallet_type, wallet_id, organization_id, amount, transaction_type, reference_id, reference_type)
        VALUES ('organization', v_org_wallet_id::text, NEW.organization_id, v_organization_amount, 'credit', NEW.id, 'payment');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_process_payment_with_ledger ON public.payments;
CREATE TRIGGER tr_process_payment_with_ledger BEFORE UPDATE ON public.payments
FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status) EXECUTE FUNCTION public.process_payment_with_ledger();

-- ═══════════════════════════════════════════════════════════
-- 4. RESTORE ID BEAUTIFICATION
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.generate_display_id(prefix TEXT)
RETURNS TEXT AS $$
DECLARE
    new_id TEXT;
    random_num TEXT;
BEGIN
    random_num := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    new_id := prefix || '-' || random_num;
    RETURN new_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.stamp_entity_display_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE prefix TEXT;
BEGIN
  IF TG_TABLE_NAME = 'hospitals' THEN prefix := 'ORG';
  ELSIF TG_TABLE_NAME = 'profiles' THEN prefix := 'USR';
  ELSIF TG_TABLE_NAME = 'emergency_requests' THEN prefix := 'AMB';
  ELSE prefix := 'GEN';
  END IF;
  
  IF NEW.display_id IS NULL THEN
    NEW.display_id := public.generate_display_id(prefix);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_stamp_hospital_id ON public.hospitals;
CREATE TRIGGER tr_stamp_hospital_id BEFORE INSERT ON public.hospitals FOR EACH ROW EXECUTE FUNCTION public.stamp_entity_display_id();

DROP TRIGGER IF EXISTS tr_stamp_profile_id ON public.profiles;
CREATE TRIGGER tr_stamp_profile_id BEFORE INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.stamp_entity_display_id();

DROP TRIGGER IF EXISTS tr_stamp_request_id ON public.emergency_requests;
CREATE TRIGGER tr_stamp_request_id BEFORE INSERT ON public.emergency_requests FOR EACH ROW EXECUTE FUNCTION public.stamp_entity_display_id();

COMMIT;
NOTIFY pgrst, 'reload schema';
