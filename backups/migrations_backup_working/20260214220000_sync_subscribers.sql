-- Sync subscribers table with ivisit (web) schema
-- Adds columns used by simpler landing pages (free/paid, sale_id)

-- 1. Add type column
ALTER TABLE public.subscribers
ADD COLUMN IF NOT EXISTS type text DEFAULT 'free' CHECK (type IN ('free', 'paid'));

-- 2. Add sale_id column
ALTER TABLE public.subscribers
ADD COLUMN IF NOT EXISTS sale_id text UNIQUE;

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_subscribers_type ON public.subscribers(type);

-- 4. Comment
COMMENT ON COLUMN public.subscribers.type IS 'Subscription type: free or paid (synced with ivisit web)';
COMMENT ON COLUMN public.subscribers.sale_id IS 'External sale ID for paid subscriptions';
