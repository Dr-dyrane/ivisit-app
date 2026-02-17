-- 20260216012000_restore_ecosystem.sql
-- Step 3: Restore Integrity and Features

BEGIN;

-- 1. PRIMARY KEYS
ALTER TABLE public.emergency_requests ADD PRIMARY KEY (id);
ALTER TABLE public.payments ADD PRIMARY KEY (id);

-- 2. SAFE DATA ALIGNMENT (Nullify orphans)
UPDATE public.payments SET user_id = NULL WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM public.profiles);
UPDATE public.emergency_requests SET user_id = NULL WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM public.profiles);
UPDATE public.visits SET user_id = NULL WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM public.profiles);

UPDATE public.emergency_requests SET hospital_id = NULL WHERE hospital_id IS NOT NULL AND hospital_id NOT IN (SELECT id FROM public.hospitals);
UPDATE public.payments SET organization_id = NULL WHERE organization_id IS NOT NULL AND organization_id NOT IN (SELECT id FROM public.organizations);
UPDATE public.payments SET emergency_request_id = NULL WHERE emergency_request_id IS NOT NULL AND emergency_request_id NOT IN (SELECT id FROM public.emergency_requests);

-- 3. FOREIGN KEYS
ALTER TABLE public.emergency_requests
    ADD CONSTRAINT emergency_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD CONSTRAINT emergency_requests_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES public.hospitals(id) ON DELETE SET NULL,
    ADD CONSTRAINT emergency_requests_responder_id_fkey FOREIGN KEY (responder_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.visits
    ADD CONSTRAINT visits_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    ADD CONSTRAINT visits_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES public.hospitals(id) ON DELETE SET NULL;

ALTER TABLE public.payments
    ADD CONSTRAINT payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD CONSTRAINT payments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL,
    ADD CONSTRAINT payments_emergency_request_id_fkey FOREIGN KEY (emergency_request_id) REFERENCES public.emergency_requests(id) ON DELETE SET NULL;

-- 4. RLS POLICIES
CREATE POLICY "Users manage own emergencies" ON public.emergency_requests FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Admins see all emergencies" ON public.emergency_requests FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Responders see assigned emergencies" ON public.emergency_requests FOR ALL USING (responder_id = auth.uid());

CREATE POLICY "Users see own payments" ON public.payments FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Orgs see own payments" ON public.payments FOR SELECT USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can see own visits" ON public.visits FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Hospitals see own visits" ON public.visits FOR SELECT USING (hospital_id IN (SELECT id FROM public.hospitals WHERE org_admin_id = auth.uid()));

-- 5. TRIGGERS
CREATE OR REPLACE FUNCTION public.sync_emergency_to_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (NEW.status = 'completed' OR NEW.status = 'cancelled') AND (OLD.status != 'completed' AND OLD.status != 'cancelled') THEN
    INSERT INTO public.visits (
      id,
      user_id,
      hospital_id,
      hospital,
      specialty,
      date,
      time,
      type,
      status,
      request_id,
      created_at
    )
    VALUES (
      NEW.id,
      NEW.user_id,
      NEW.hospital_id,
      NEW.hospital_name,
      NEW.specialty,
      to_char(NEW.created_at, 'YYYY-MM-DD'),
      to_char(NEW.created_at, 'HH12:MI AM'),
      CASE WHEN NEW.service_type = 'ambulance' THEN 'Ambulance Ride' ELSE 'Bed Booking' END,
      NEW.status,
      NEW.request_id,
      NEW.created_at
    )
    ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_emergency_status_change ON public.emergency_requests;
CREATE TRIGGER on_emergency_status_change
    AFTER UPDATE ON public.emergency_requests
    FOR EACH ROW EXECUTE PROCEDURE public.sync_emergency_to_history();

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
    v_already_credited := COALESCE((NEW.metadata->>'ledger_credited')::boolean, false);
    v_is_top_up := COALESCE((NEW.metadata->>'is_top_up')::boolean, false);
    v_is_cash := (NEW.payment_method_id = 'cash');

    IF NEW.organization_id IS NULL AND NEW.emergency_request_id IS NOT NULL THEN
        SELECT h.organization_id INTO v_organization_id
        FROM public.emergency_requests er
        JOIN public.hospitals h ON er.hospital_id = h.id
        WHERE er.id = NEW.emergency_request_id;
        NEW.organization_id := v_organization_id;
    END IF;

    IF NEW.status = 'completed' AND NOT v_already_credited THEN
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
            SELECT ivisit_fee_percentage INTO v_fee_rate FROM public.organizations WHERE id = NEW.organization_id;
            v_fee_rate := COALESCE(v_fee_rate, 2.5);
            v_fee_amount := (NEW.amount * v_fee_rate) / 100;
            v_organization_amount := NEW.amount - v_fee_amount;
            
            IF v_is_cash THEN
                UPDATE public.organization_wallets SET balance = balance - v_fee_amount WHERE organization_id = NEW.organization_id RETURNING id INTO v_org_wallet_id;
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

DROP TRIGGER IF EXISTS tr_process_payment_with_ledger ON public.payments;
CREATE TRIGGER tr_process_payment_with_ledger
    BEFORE UPDATE ON public.payments
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION public.process_payment_with_ledger();

COMMIT;

NOTIFY pgrst, 'reload schema';
