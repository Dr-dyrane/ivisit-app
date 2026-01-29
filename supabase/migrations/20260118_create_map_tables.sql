-- SQL migration for iVisit map data tables (real‑time enabled via Supabase Realtime)
-- Run with: supabase db reset && supabase db push

-- 1. emergencies: active emergency requests
CREATE TABLE IF NOT EXISTS public.emergencies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id uuid REFERENCES public.profiles(id) NOT NULL,
    status text NOT NULL CHECK (status IN ('pending','accepted','arrived','in_progress','completed','canceled')),
    type text NOT NULL CHECK (type IN ('ambulance','bed_reservation')),
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable realtime on emergencies (all columns)
ALTER PUBLICATION supabase_realtime ADD TABLE public.emergencies;

-- 2. users: location of patients (live tracking) – separate from profiles for privacy
CREATE TABLE IF NOT EXISTS public.users (
    id uuid PRIMARY KEY REFERENCES public.profiles(id),
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    last_seen timestamp with time zone DEFAULT now()
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.users;

-- 3. services: hospitals, ambulances, doctors, etc.
CREATE TABLE IF NOT EXISTS public.services (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id uuid REFERENCES public.profiles(id) NOT NULL,
    service_type text NOT NULL CHECK (service_type IN ('hospital','ambulance','doctor','pharmacy','diagnostic')),
    status text NOT NULL CHECK (status IN ('online','offline','busy','unavailable')),
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.services;

-- Indexes for fast geo‑queries (optional, using pg_trgm or PostGIS if installed)
CREATE INDEX IF NOT EXISTS idx_emergencies_location ON public.emergencies USING btree (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_users_location ON public.users USING btree (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_services_location ON public.services USING btree (latitude, longitude);

-- Trigger to update updated_at on row change
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_emergencies_updated BEFORE UPDATE ON public.emergencies
FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER trg_services_updated BEFORE UPDATE ON public.services
FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

-- Grant SELECT/INSERT/UPDATE to anon role (adjust as needed)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon;

-- End of migration
