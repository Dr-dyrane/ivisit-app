-- Fix: Add Default Value for ID to allow auto-generation
ALTER TABLE public.emergency_requests
ALTER COLUMN id SET DEFAULT gen_random_uuid();

NOTIFY pgrst, 'reload schema';
