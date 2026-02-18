-- ==========================================================================
-- STABILIZE ORG-PROVIDER LINKAGE — 2026-02-17
-- ==========================================================================

BEGIN;

-- 1. CLEANUP: Drop everything that could block a type change
DO $$
BEGIN
    -- Drop all views
    DROP VIEW IF EXISTS public.available_hospitals CASCADE;
    
    -- Drop all specialized functions first
    DROP FUNCTION IF EXISTS public.calculate_organization_ivisit_fee CASCADE;
    DROP FUNCTION IF EXISTS public.process_payment_with_fees CASCADE;
    DROP FUNCTION IF EXISTS public.process_refund_with_fees CASCADE;
    DROP FUNCTION IF EXISTS public.get_all_auth_users CASCADE;
    DROP FUNCTION IF EXISTS public.get_current_user_org_id CASCADE;
    DROP FUNCTION IF EXISTS public.get_current_user_role CASCADE;
    DROP FUNCTION IF EXISTS public.get_current_user_onboarding_status CASCADE;

    -- Drop all policies from all user schemas
    DECLARE
        r RECORD;
    BEGIN
        FOR r IN (SELECT policyname, tablename, schemaname FROM pg_policies WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')) LOOP
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.schemaname) || '.' || quote_ident(r.tablename);
        END LOOP;
        
        -- Drop all triggers
        FOR r IN (SELECT trigger_name, event_object_table, event_object_schema FROM information_schema.triggers WHERE event_object_schema NOT IN ('pg_catalog', 'information_schema')) LOOP
            EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.trigger_name) || ' ON ' || quote_ident(r.event_object_schema) || '.' || quote_ident(r.event_object_table);
        END LOOP;
    END;
END $$;

-- 2. TYPE CONVERSION
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tc.table_schema, tc.table_name, tc.constraint_name
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.referential_constraints AS rc ON tc.constraint_name = rc.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu ON rc.unique_constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'organizations' AND ccu.column_name = 'id'
    ) LOOP
        EXECUTE 'ALTER TABLE ' || quote_ident(r.table_schema) || '.' || quote_ident(r.table_name) || ' DROP CONSTRAINT ' || quote_ident(r.constraint_name);
    END LOOP;
END $$;

ALTER TABLE public.organizations DROP CONSTRAINT IF EXISTS organizations_pkey;
ALTER TABLE public.organizations ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE public.organizations ADD PRIMARY KEY (id);

ALTER TABLE public.hospitals ALTER COLUMN organization_id TYPE TEXT USING organization_id::text;
ALTER TABLE public.organization_wallets ALTER COLUMN organization_id TYPE TEXT USING organization_id::text;
ALTER TABLE public.payments ALTER COLUMN organization_id TYPE TEXT USING organization_id::text;
ALTER TABLE public.profiles ALTER COLUMN organization_id TYPE TEXT USING organization_id::text;

-- 3. RECREATE BASIC POLICIES (Admin only for safety)
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage all organizations" ON public.organizations FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Public read organizations" ON public.organizations FOR SELECT USING (is_active = true);

-- 4. BACKFILL
INSERT INTO public.organizations (id, name, contact_email, is_active)
SELECT id::text, name, 'hospital_ops@ivisit.ai', TRUE
FROM public.hospitals h
WHERE NOT EXISTS (SELECT 1 FROM public.organizations o WHERE o.id::text = h.id::text)
ON CONFLICT (id) DO NOTHING;

UPDATE public.hospitals SET organization_id = id::text WHERE organization_id IS NULL;

-- 5. AUTOMATION
CREATE OR REPLACE FUNCTION public.handle_org_admin_setup()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role = 'org_admin' AND NEW.organization_id IS NULL THEN
        INSERT INTO public.organizations (id, name, contact_email)
        VALUES (NEW.id::text, COALESCE(NEW.full_name, 'New') || ' Organization', COALESCE(NEW.email, 'contact@ivisit.ai'))
        ON CONFLICT (id) DO NOTHING;
        NEW.organization_id := NEW.id::text;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_handle_org_admin_setup ON public.profiles;
CREATE TRIGGER tr_handle_org_admin_setup BEFORE UPDATE OF role OR INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_org_admin_setup();

-- Induction
INSERT INTO public.organization_wallets (organization_id, balance, currency)
SELECT id::text, 0.00, 'USD' FROM public.organizations o WHERE NOT EXISTS (SELECT 1 FROM public.organization_wallets w WHERE w.organization_id::text = o.id::text)
ON CONFLICT (organization_id) DO NOTHING;

COMMIT;
NOTIFY pgrst, 'reload schema';
