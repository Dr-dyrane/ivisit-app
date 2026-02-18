-- ============================================================================
-- SURGICAL UUID TO TEXT CONVERSION (HEALING VERSION)
-- ============================================================================
-- This version uses a dynamic cleaner to remove ALL policies and constraints 
-- that might block the conversion of Organizations to TEXT.
-- ============================================================================

BEGIN;

-- 1. DROP ALL VIEWS (They are the most common blockers)
DROP VIEW IF EXISTS public.available_hospitals CASCADE;
DROP VIEW IF EXISTS public.available_doctors CASCADE;
DROP VIEW IF EXISTS public.hospital_analytics CASCADE;
DROP VIEW IF EXISTS public.active_emergencies CASCADE;
DROP VIEW IF EXISTS public.hospital_resource_pricing CASCADE;

-- 2. DYNAMICALLY DROP ALL POLICIES (Ensures no "cannot alter type used in policy" errors)
DO $$
DECLARE pol record;
BEGIN
    FOR pol IN SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- 3. DYNAMICALLY DROP ALL FOREIGN KEYS REFERENCING ORGANIZATIONS
DO $$
DECLARE r RECORD;
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

-- 4. ALTER COLUMNS TO TEXT
ALTER TABLE public.organizations ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE public.hospitals ALTER COLUMN organization_id TYPE TEXT USING organization_id::text;
ALTER TABLE public.organization_wallets ALTER COLUMN organization_id TYPE TEXT USING organization_id::text;
ALTER TABLE public.payments ALTER COLUMN organization_id TYPE TEXT USING organization_id::text;
ALTER TABLE public.profiles ALTER COLUMN organization_id TYPE TEXT USING organization_id::text;
ALTER TABLE public.wallet_ledger ALTER COLUMN organization_id TYPE TEXT USING organization_id::text;

-- Special cases for Ledger
ALTER TABLE public.wallet_ledger ALTER COLUMN wallet_id TYPE TEXT USING wallet_id::text;
ALTER TABLE public.wallet_ledger ALTER COLUMN reference_id TYPE TEXT USING reference_id::text;

-- 5. UPDATE HELPER FUNCTIONS
DROP FUNCTION IF EXISTS public.get_current_user_org_id CASCADE;
CREATE OR REPLACE FUNCTION public.get_current_user_org_id()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid();
$$;

-- 6. RESTORE CONSTRAINTS
ALTER TABLE public.hospitals ADD CONSTRAINT hospitals_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.organization_wallets ADD CONSTRAINT organization_wallets_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.payments ADD CONSTRAINT payments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.wallet_ledger ADD CONSTRAINT wallet_ledger_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;

-- 7. RESTORE CORE VIEWS
CREATE OR REPLACE VIEW public.available_hospitals AS
  SELECT h.*, o.name as organization_name
  FROM public.hospitals h
  LEFT JOIN public.organizations o ON h.organization_id = o.id
  WHERE h.status = 'active';

-- 8. RESTORE MASTER RLS (Seed basic policies)
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read for active organizations" ON public.organizations FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Admins manage all organizations" ON public.organizations FOR ALL USING (public.get_current_user_role() = 'admin');

ALTER TABLE public.wallet_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins see all ledger" ON public.wallet_ledger FOR ALL USING (public.get_current_user_role() = 'admin');
CREATE POLICY "Org admins see their ledger" ON public.wallet_ledger FOR SELECT USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

COMMIT;
NOTIFY pgrst, 'reload schema';
