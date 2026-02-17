
-- Fix Policy Type Mismatch on emergency_requests
-- The error "operator does not exist: uuid = text" suggests a type mismatch in RLS policies

-- 1. Drop existing policies to be safe
DROP POLICY IF EXISTS "Emergency requests are insertable by own user" ON public.emergency_requests;
DROP POLICY IF EXISTS "Emergency requests are readable by own user" ON public.emergency_requests;
DROP POLICY IF EXISTS "Emergency requests are updatable by own user" ON public.emergency_requests;

-- 2. Re-create policies with robust casting
-- If user_id is UUID, auth.uid() matches. 
-- If user_id is TEXT (which is possible if schema drifted), we cast auth.uid() to text.

CREATE POLICY "Emergency requests are readable by own user"
ON public.emergency_requests FOR SELECT
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Emergency requests are insertable by own user"
ON public.emergency_requests FOR INSERT
WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Emergency requests are updatable by own user"
ON public.emergency_requests FOR UPDATE
USING (auth.uid()::text = user_id::text)
WITH CHECK (auth.uid()::text = user_id::text);

-- 3. Just in case, try to ALTER column to UUID if it's text (safe because UUID strings cast fine)
-- If it's already UUID, this is a no-op or fast.
DO $$
BEGIN
    -- Only try if it's currently text
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'emergency_requests' AND column_name = 'user_id' AND data_type = 'text'
    ) THEN
        ALTER TABLE public.emergency_requests 
        ALTER COLUMN user_id TYPE UUID USING user_id::UUID;
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
