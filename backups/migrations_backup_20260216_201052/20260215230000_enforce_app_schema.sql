
-- Enforce App Schema: Ensure columns expected by Services exist
-- This migration corresponds to a "Global Schema Sync" based on App Code auditing.

DO $$
BEGIN

    -- 1. PROFILES (Used by authService.js)
    -- Ensure columns exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'provider_type') THEN
        ALTER TABLE public.profiles ADD COLUMN provider_type TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'bvn_verified') THEN
        ALTER TABLE public.profiles ADD COLUMN bvn_verified BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'gender') THEN
        ALTER TABLE public.profiles ADD COLUMN gender TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'date_of_birth') THEN
        ALTER TABLE public.profiles ADD COLUMN date_of_birth DATE;
        -- App might actally expect text, but DATE is safer. We'll use DATE.
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'address') THEN
        ALTER TABLE public.profiles ADD COLUMN address TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'image_uri') THEN
        ALTER TABLE public.profiles ADD COLUMN image_uri TEXT; 
    END IF;

    -- 2. AMBULANCES (Used by ambulanceService.js)
    -- Ensure table exists (if missing)
    CREATE TABLE IF NOT EXISTS public.ambulances (
        id TEXT PRIMARY KEY,
        type TEXT,
        call_sign TEXT,
        status TEXT DEFAULT 'available',
        -- location geometry(Point, 4326),  <-- Geometry handling often requires Create Extension
        eta TEXT,
        crew TEXT[],
        hospital TEXT,
        vehicle_number TEXT,
        last_maintenance TEXT,
        rating DOUBLE PRECISION,
        current_call JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Ensure 'hospital_id' exists for Console compatibility (UUID)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ambulances' AND column_name = 'hospital_id') THEN
        ALTER TABLE public.ambulances ADD COLUMN hospital_id UUID;
    END IF;

    -- Ensure 'profile_id' exists (Driver?)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ambulances' AND column_name = 'profile_id') THEN
        ALTER TABLE public.ambulances ADD COLUMN profile_id UUID REFERENCES public.profiles(id);
    END IF;

    -- 3. EMERGENCY REQUESTS (Refined from earlier)
    -- Ensure 'ambulance_id' is TEXT (to match ambulances.id)
    -- (It is already text in original schema)
    
    -- 4. HOSPITALS (Used by hospitalsService.js)
    -- Ensure 'image' column exists (used by UI)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hospitals' AND column_name = 'image') THEN
        ALTER TABLE public.hospitals ADD COLUMN image TEXT;
    END IF;

END $$;

-- 5. Reload
NOTIFY pgrst, 'reload schema';
