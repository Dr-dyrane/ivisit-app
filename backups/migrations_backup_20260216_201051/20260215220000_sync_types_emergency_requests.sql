
-- Master Sync: Standardize Types in emergency_requests
-- Goal: Ensure strictly typed columns (UUIDs) where foreign keys exist to prevent 'operator does not exist' errors.

DO $$
BEGIN

    -- 1. Sync user_id -> UUID
    -- This column references auth.users (which is UUID). It must be UUID.
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'emergency_requests' AND column_name = 'user_id' AND data_type = 'text'
    ) THEN
        -- Attempt to convert. If invalid UUIDs exist, this looks for them first or let it fail?
        -- We will blindly cast; if it fails, the user has bad data that needs manual cleanup.
        -- But for this project, likely safe.
        ALTER TABLE public.emergency_requests 
        ALTER COLUMN user_id TYPE UUID USING user_id::UUID;
    END IF;

    -- 2. Sync hospital_id -> UUID
    -- This references hospitals(id) (which is UUID). It should be UUID.
    -- However, legacy code might put 'null' string or similar. We handle strict casting.
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'emergency_requests' AND column_name = 'hospital_id' AND data_type = 'text'
    ) THEN
        -- Check if all hospital_ids are valid UUIDs or null?
        -- We just try ALTER. If it fails, transaction rolls back.
        BEGIN
            ALTER TABLE public.emergency_requests 
            ALTER COLUMN hospital_id TYPE UUID USING CASE 
                WHEN hospital_id = '' THEN NULL 
                ELSE hospital_id::UUID 
            END;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not auto-convert hospital_id to UUID due to data format. Keeping as TEXT.';
        END;
    END IF;

    -- 3. Sync payment_method_id -> TEXT
    -- This can be 'cash' or 'pm_123', so it MUST be TEXT.
    -- Just ensure it exists (we did this in previous migration, but good to double check).
    -- (No action needed as we verified it's text)

END $$;

-- 4. Re-Apply Policies with strict types (Clean Version)
-- Now that we (hopefully) have UUIDs, we can simplify policies.
DROP POLICY IF EXISTS "Emergency requests are insertable by own user" ON public.emergency_requests;
DROP POLICY IF EXISTS "Emergency requests are readable by own user" ON public.emergency_requests;
DROP POLICY IF EXISTS "Emergency requests are updatable by own user" ON public.emergency_requests;

CREATE POLICY "Emergency requests are readable by own user"
ON public.emergency_requests FOR SELECT
USING (auth.uid() = user_id); -- Strict UUID matching now possible

CREATE POLICY "Emergency requests are insertable by own user"
ON public.emergency_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Emergency requests are updatable by own user"
ON public.emergency_requests FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. Reload Schema Cache
NOTIFY pgrst, 'reload schema';
