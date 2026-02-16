-- Migration: Ensure room_pricing schema is correct
-- Description: Restores room_pricing if missing and adds organization_id.

BEGIN;

-- 1. Restore room_pricing if it was missing (console uses this)
CREATE TABLE IF NOT EXISTS public.room_pricing (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_type VARCHAR(50) NOT NULL,
  room_name VARCHAR(100) NOT NULL,
  price_per_night DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  hospital_id UUID REFERENCES public.hospitals(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add organization_id if missing
ALTER TABLE public.service_pricing ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.hospital_rooms ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.room_pricing ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

COMMIT;

-- Force PostgREST to reload
NOTIFY pgrst, 'reload schema';
