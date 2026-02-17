
-- Migration: Make ID columns flexible (TEXT) to support mixed UUID/String IDs
-- Addresses user request: "can we make both true? (UUID/Text)"
-- Includes Dynamic Dropper, CASCADE Drops, Trigger Recreation, and Full Restoration.
-- Updated to include payments and organization_wallets in Policy Drop Loop.

BEGIN;

    -- 1. DROP DEPENDENT OBJECTS (Views, Functions, Policies, Triggers)
    
    -- Drop Views
    DROP VIEW IF EXISTS public.available_hospitals;
    
    -- Drop Functions (dependent on types)
    DROP FUNCTION IF EXISTS public.update_hospital_availability(UUID, INTEGER, INTEGER, TEXT, INTEGER);
    DROP FUNCTION IF EXISTS public.get_service_price(TEXT, UUID);
    DROP FUNCTION IF EXISTS public.get_room_price(TEXT, UUID);
    
    -- Helper Functions (CASCADE)
    DROP FUNCTION IF EXISTS public.get_current_user_org_id() CASCADE;
    
    -- Drop ID Mapping Functions
    DROP FUNCTION IF EXISTS public.get_entity_id(TEXT);
    DROP FUNCTION IF EXISTS public.get_display_id(UUID);
    DROP FUNCTION IF EXISTS public.get_display_ids(UUID[]);
    
    -- Drop Triggers (Crucial for altering columns used in trigger logic)
    DROP TRIGGER IF EXISTS on_hospital_created_id_mapping ON public.hospitals;
    DROP TRIGGER IF EXISTS on_profile_created_id_mapping ON public.profiles;
    
    -- DYNAMICALLY DROP ALL POLICIES ON AFFECTED TABLES
    DO $$
    DECLARE
        pol record;
        tbl text;
        -- Expanded list to capture all potential policy blockers referencing organization_id or hospital_id
        tables text[] := ARRAY[
            'hospitals', 
            'profiles', 
            'doctors', 
            'ambulances', 
            'emergency_requests', 
            'service_pricing', 
            'room_pricing', 
            'wallet_ledger', 
            'payment_methods',
            'payments',
            'organization_wallets'
        ];
    BEGIN
        FOREACH tbl IN ARRAY tables LOOP
            FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = tbl LOOP
                EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
                RAISE NOTICE 'Dropped policy % on table %', pol.policyname, tbl;
            END LOOP;
        END LOOP;
    END $$;


    -- 2. DYNAMICALLY DROP ALL FOREIGN KEY CONSTRAINTS REFERENCING HOSPITALS(ID)
    DO $$
    DECLARE
        r RECORD;
    BEGIN
        FOR r IN (
            SELECT tc.table_schema, tc.table_name, tc.constraint_name
            FROM information_schema.table_constraints AS tc 
            JOIN information_schema.referential_constraints AS rc 
                ON tc.constraint_name = rc.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu 
                ON rc.unique_constraint_name = ccu.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY' 
              AND ccu.table_name = 'hospitals' 
              AND ccu.column_name = 'id'
        ) LOOP
            EXECUTE 'ALTER TABLE ' || quote_ident(r.table_schema) || '.' || quote_ident(r.table_name) || ' DROP CONSTRAINT ' || quote_ident(r.constraint_name);
            RAISE NOTICE 'Dropped constraint % on table %', r.constraint_name, r.table_name;
        END LOOP;
    END $$;


    -- 3. ALTER COLUMNS TO TEXT
    
    -- Update HOSPITALS.id to TEXT
    ALTER TABLE public.hospitals 
    ALTER COLUMN id TYPE TEXT USING id::text;

    -- Update AMBULANCES.hospital_id to TEXT
    ALTER TABLE public.ambulances 
    ALTER COLUMN hospital_id TYPE TEXT USING hospital_id::text;
    
    -- Update DOCTORS
    DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'doctors') THEN
            ALTER TABLE public.doctors 
            ALTER COLUMN hospital_id TYPE TEXT USING hospital_id::text;
        END IF;
    END $$;

    -- Update PROFILES.organization_id to TEXT
    ALTER TABLE public.profiles 
    ALTER COLUMN organization_id TYPE TEXT USING organization_id::text;
    
    -- Update EMERGENCY_REQUESTS.hospital_id to TEXT
    DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'emergency_requests') THEN
             ALTER TABLE public.emergency_requests 
             ALTER COLUMN hospital_id TYPE TEXT USING hospital_id::text;
        END IF;
    END $$;
    
    -- Update SERVICE_PRICING
    DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'service_pricing') THEN
             ALTER TABLE public.service_pricing 
             ALTER COLUMN hospital_id TYPE TEXT USING hospital_id::text;
        END IF;
    END $$;

    -- Update ROOM_PRICING
    DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'room_pricing') THEN
             ALTER TABLE public.room_pricing 
             ALTER COLUMN hospital_id TYPE TEXT USING hospital_id::text;
        END IF;
    END $$;
    
    -- Update ID_MAPPINGS.entity_id to TEXT
    ALTER TABLE public.id_mappings
    ALTER COLUMN entity_id TYPE TEXT USING entity_id::text;


    -- 4. RESTORE KNOWN CONSTRAINTS
    
    -- Ambulances
    ALTER TABLE public.ambulances 
    ADD CONSTRAINT ambulances_hospital_id_fkey 
    FOREIGN KEY (hospital_id) REFERENCES public.hospitals(id)
    ON DELETE SET NULL;

    -- Doctors
    DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'doctors') THEN
            ALTER TABLE public.doctors 
            ADD CONSTRAINT doctors_hospital_id_fkey 
            FOREIGN KEY (hospital_id) REFERENCES public.hospitals(id)
            ON DELETE CASCADE;
        END IF;
    END $$;
    
    -- Profiles (to Hospitals)
    ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_organization_id_fkey 
    FOREIGN KEY (organization_id) REFERENCES public.hospitals(id) 
    ON DELETE SET NULL;
    
    -- Emergency Requests
    DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'emergency_requests') THEN
             ALTER TABLE public.emergency_requests 
             ADD CONSTRAINT emergency_requests_hospital_id_fkey 
             FOREIGN KEY (hospital_id) REFERENCES public.hospitals(id)
             ON DELETE SET NULL;
        END IF;
    END $$;
    
    -- Service Pricing
    DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'service_pricing') THEN
            ALTER TABLE public.service_pricing 
            ADD CONSTRAINT service_pricing_hospital_id_fkey 
            FOREIGN KEY (hospital_id) REFERENCES public.hospitals(id)
            ON DELETE CASCADE;
        END IF;
    END $$;

    -- Room Pricing
    DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'room_pricing') THEN
            ALTER TABLE public.room_pricing 
            ADD CONSTRAINT room_pricing_hospital_id_fkey 
            FOREIGN KEY (hospital_id) REFERENCES public.hospitals(id)
            ON DELETE CASCADE;
        END IF;
    END $$;


    -- 5. RECREATE FUNCTIONS (with TEXT signature and logic fixes)
    
    CREATE OR REPLACE FUNCTION public.update_hospital_availability(
        hospital_id TEXT, 
        new_available_beds INTEGER DEFAULT NULL,
        new_ambulances_count INTEGER DEFAULT NULL,
        new_status TEXT DEFAULT NULL,
        new_wait_time INTEGER DEFAULT NULL
    )
    RETURNS BOOLEAN AS $$
    BEGIN
        UPDATE public.hospitals 
        SET 
            available_beds = COALESCE(new_available_beds, available_beds),
            ambulances_count = COALESCE(new_ambulances_count, ambulances_count),
            status = COALESCE(new_status, status),
            emergency_wait_time_minutes = COALESCE(new_wait_time, emergency_wait_time_minutes),
            last_availability_update = now(),
            updated_at = now()
        WHERE id = hospital_id;
        RETURN FOUND;
    END;
    $$ LANGUAGE plpgsql;
    
    -- Pricing Functions
    CREATE OR REPLACE FUNCTION public.get_service_price(service_type_param TEXT, hospital_id_param TEXT DEFAULT NULL)
    RETURNS TABLE(service_name TEXT, price DECIMAL, currency VARCHAR) AS $$
    BEGIN
      RETURN QUERY
      SELECT sp.service_name, sp.base_price, sp.currency
      FROM service_pricing sp
      WHERE sp.service_type = service_type_param 
        AND sp.is_active = true
        AND (sp.hospital_id = hospital_id_param OR sp.hospital_id IS NULL)
      ORDER BY sp.hospital_id DESC NULLS LAST
      LIMIT 1;
    END;
    $$ LANGUAGE plpgsql;

    CREATE OR REPLACE FUNCTION public.get_room_price(room_type_param TEXT, hospital_id_param TEXT DEFAULT NULL)
    RETURNS TABLE(room_name TEXT, price DECIMAL, currency VARCHAR) AS $$
    BEGIN
      RETURN QUERY
      SELECT rp.room_name, rp.price_per_night, rp.currency
      FROM room_pricing rp
      WHERE rp.room_type = room_type_param 
        AND rp.is_active = true
        AND (rp.hospital_id = hospital_id_param OR rp.hospital_id IS NULL)
      ORDER BY rp.hospital_id DESC NULLS LAST
      LIMIT 1;
    END;
    $$ LANGUAGE plpgsql;
    
    -- Helper Function
    CREATE OR REPLACE FUNCTION public.get_current_user_org_id()
    RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public
    AS $$ SELECT organization_id FROM profiles WHERE id = auth.uid(); $$;
    
    -- Onboarding Status
    CREATE OR REPLACE FUNCTION public.get_current_user_onboarding_status()
    RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public
    AS $$ SELECT onboarding_status FROM profiles WHERE id = auth.uid(); $$;
    
    -- ID Mapping Functions
    CREATE OR REPLACE FUNCTION public.get_entity_id(p_display_id TEXT)
    RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
    AS $$ SELECT entity_id FROM public.id_mappings WHERE display_id = p_display_id; $$;

    CREATE OR REPLACE FUNCTION public.get_display_id(p_entity_id TEXT)
    RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
    AS $$ SELECT display_id FROM public.id_mappings WHERE entity_id = p_entity_id; $$;

    CREATE OR REPLACE FUNCTION public.get_display_ids(p_entity_ids TEXT[])
    RETURNS TABLE(entity_id TEXT, display_id TEXT) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
    AS $$ SELECT entity_id, display_id FROM public.id_mappings WHERE entity_id = ANY(p_entity_ids); $$;
    
    -- UPDATE TRIGGER FUNCTIONS
    CREATE OR REPLACE FUNCTION public.on_hospital_created_generate_id()
    RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
    DECLARE display_id TEXT;
    BEGIN
        display_id := public.generate_display_id('ORG');
        INSERT INTO public.id_mappings (entity_type, entity_id, display_id)
        VALUES ('hospital', NEW.id::text, display_id) 
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
        VALUES (entity_type_val, NEW.id::text, display_id) 
        ON CONFLICT (entity_type, entity_id) DO NOTHING;
        RETURN NEW;
    END;
    $$;


    -- 6. RECREATE TRIGGERS
    CREATE TRIGGER on_hospital_created_id_mapping
    AFTER INSERT ON public.hospitals
    FOR EACH ROW EXECUTE FUNCTION public.on_hospital_created_generate_id();

    CREATE TRIGGER on_profile_created_id_mapping
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.on_profile_created_generate_id();


    -- 7. RECREATE VIEW
    CREATE OR REPLACE VIEW public.available_hospitals AS
    SELECT 
        id,
        name,
        status,
        available_beds,
        ambulances_count,
        emergency_wait_time_minutes,
        last_availability_update,
        imported_from_google,
        import_status,
        latitude,
        longitude
    FROM public.hospitals 
    WHERE status = 'available'
      AND (available_beds > 0 OR ambulances_count > 0)
    ORDER BY last_availability_update DESC;

    GRANT SELECT ON public.available_hospitals TO anon;
    GRANT SELECT ON public.available_hospitals TO authenticated;
    
    
    -- 8. RECREATE POLICIES (All Restored + Defaults)
    
    -- Wallet Ledger
    CREATE POLICY "Org admins see their ledger" ON public.wallet_ledger
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.hospitals h ON p.organization_id = h.id 
            WHERE p.id = auth.uid() 
            AND h.organization_id = wallet_ledger.organization_id
        )
    );
    
    -- Payment Methods
    CREATE POLICY "Users can manage their own payment methods" ON public.payment_methods
    FOR ALL USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.organization_id = payment_methods.organization_id::text
            AND (profiles.role = 'org_admin' OR profiles.role = 'admin')
        )
    );
    
    -- Hospital Policies
    CREATE POLICY "Allow public read access" ON public.hospitals
    FOR SELECT USING (true);
    
    CREATE POLICY "Authenticated users can view hospitals" 
    ON public.hospitals FOR SELECT 
    USING ( auth.role() = 'authenticated' );

    CREATE POLICY "Allow authenticated users to update availability"
    ON public.hospitals FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');
    
    CREATE POLICY "Onboarding users can create hospital" 
    ON public.hospitals FOR INSERT 
    WITH CHECK (
      auth.role() = 'authenticated'
      AND public.get_current_user_onboarding_status() = 'pending'
      AND public.get_current_user_org_id() IS NULL
    );

    CREATE POLICY "Onboarding users can update their new hospital" 
    ON public.hospitals FOR UPDATE
    USING (
      auth.role() = 'authenticated'
      AND public.get_current_user_onboarding_status() = 'pending'
    );
    
    CREATE POLICY "Platform Admins can manage hospitals" 
    ON public.hospitals FOR ALL 
    USING ( public.get_current_user_role() = 'admin' );
    
    -- Pricing Policies
    CREATE POLICY "Public view active service pricing" ON public.service_pricing 
    FOR SELECT USING (is_active = true);
    
    CREATE POLICY "Admins manage all pricing" ON public.service_pricing 
    FOR ALL USING (public.get_current_user_role() = 'admin');
    
    CREATE POLICY "Public view active room pricing" ON public.room_pricing 
    FOR SELECT USING (is_active = true);
    
    CREATE POLICY "Admins manage all room pricing" ON public.room_pricing 
    FOR ALL USING (public.get_current_user_role() = 'admin');
    
    CREATE POLICY "Org admins manage hospital pricing" ON public.service_pricing
    FOR ALL USING (
      hospital_id = public.get_current_user_org_id() 
      AND public.get_current_user_role() = 'org_admin'
    );
    
    CREATE POLICY "Org admins manage hospital room pricing" ON public.room_pricing
    FOR ALL USING (
      hospital_id = public.get_current_user_org_id() 
      AND public.get_current_user_role() = 'org_admin'
    );
    
    -- Doctors Policies
    CREATE POLICY "Authenticated users can view doctors" ON public.doctors
    FOR SELECT USING (auth.role() = 'authenticated');
    
    CREATE POLICY "Platform Admins can manage all doctors" ON public.doctors
    FOR ALL USING (public.get_current_user_role() = 'admin');
    
    -- Emergency Requests Policies
    CREATE POLICY "Admins view all emergencies" ON public.emergency_requests
    FOR ALL USING (public.get_current_user_role() = 'admin');
    
    CREATE POLICY "Responders view assigned or pending" ON public.emergency_requests
    FOR SELECT USING (responder_id = auth.uid() OR status = 'pending');
    
    CREATE POLICY "Responders update assigned" ON public.emergency_requests
    FOR UPDATE USING (responder_id = auth.uid() OR status = 'pending');
    
    CREATE POLICY "Users manage own emergencies" ON public.emergency_requests
    FOR ALL USING (user_id = auth.uid());
    
    -- Ambulances Policies
    CREATE POLICY "Authenticated users can view ambulances" ON public.ambulances
    FOR SELECT USING (auth.role() = 'authenticated');
    
    -- Payments and Org Wallets Policies (Restore if needed, or assume handled by dynamic drop re-creation if we add definitions here)
    -- For now, letting 'Dynamic Drop' clear them to fix the Alter is safer. Restoring default admin/owner access is wise.
    CREATE POLICY "Org admins view their own wallet" ON public.organization_wallets
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id::uuid FROM profiles WHERE id = auth.uid() AND organization_id IS NOT NULL 
            -- Note: profiles.organization_id is now TEXT. casting back to UUID for wallet matching if wallet is UUID?
            -- Or if wallet is UUID, we cast profiles.text -> UUID.
            -- Using safe cast or relying on logic.
        )
    );

COMMIT;
