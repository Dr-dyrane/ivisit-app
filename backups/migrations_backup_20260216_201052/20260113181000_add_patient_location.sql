-- Migration: Add patient live location tracking
-- Description: Allows providers to see where the patient is moving during a request

ALTER TABLE public.emergency_requests
ADD COLUMN IF NOT EXISTS patient_location geography(POINT),
ADD COLUMN IF NOT EXISTS patient_heading float;

-- Index for spatial queries if needed (though mostly accessed by ID)
CREATE INDEX IF NOT EXISTS idx_emergency_requests_patient_location ON public.emergency_requests USING GIST (patient_location);
