-- Sync notifications table with iVisit-docs schema
-- This ensures compatibility between ivisit-app and iVisit-docs

-- 1. Add missing columns
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS icon text,
ADD COLUMN IF NOT EXISTS color text DEFAULT 'info',
ADD COLUMN IF NOT EXISTS target_id text,
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- 2. Ensure ID has a default generator to support inserts without ID
ALTER TABLE public.notifications
ALTER COLUMN id SET DEFAULT gen_random_uuid();


-- 4. Add indexes from iVisit-docs schema for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(user_id, read);

-- 5. Add comment
COMMENT ON TABLE public.notifications IS 'Unified notifications table supporting ivisit-app and iVisit-docs';
