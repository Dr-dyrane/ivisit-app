-- Ensure cost column exists (redundant safety check)
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS cost text;

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';
