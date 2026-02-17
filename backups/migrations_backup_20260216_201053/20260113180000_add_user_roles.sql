-- Migration: Add role and provider_type to profiles
-- Description: Supports the "Provider App" user types (Hospital, Doctor, Driver, etc.)

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role text DEFAULT 'patient' CHECK (role IN ('patient', 'provider', 'admin')),
ADD COLUMN IF NOT EXISTS provider_type text CHECK (provider_type IN ('hospital', 'ambulance_service', 'doctor', 'driver', 'paramedic')),
ADD COLUMN IF NOT EXISTS bvn_verified boolean DEFAULT false;

-- Create index for faster filtering by role
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
