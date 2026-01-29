-- Search System Migration
-- Creates search_history, search_selections tables and trending searches RPC
-- Idempotent: Safe to run multiple times

-- 1. Search History Table
CREATE TABLE IF NOT EXISTS public.search_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  query text NOT NULL,
  result_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for search_history if they don't exist
CREATE INDEX IF NOT EXISTS idx_search_history_user_id 
ON public.search_history(user_id);

CREATE INDEX IF NOT EXISTS idx_search_history_created_at 
ON public.search_history(created_at DESC);

-- 2. Search Selections Table
CREATE TABLE IF NOT EXISTS public.search_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  query text NOT NULL,
  result_type text NOT NULL,
  result_id text NOT NULL,
  source text DEFAULT 'console',
  created_at timestamptz DEFAULT now()
);

-- Create indexes for search_selections if they don't exist
CREATE INDEX IF NOT EXISTS idx_search_selections_user_id 
ON public.search_selections(user_id);

CREATE INDEX IF NOT EXISTS idx_search_selections_created_at 
ON public.search_selections(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_search_selections_query
ON public.search_selections(query);

-- 3. Create or Replace Trending Searches Function
CREATE OR REPLACE FUNCTION get_trending_searches(
  days_back integer DEFAULT 7,
  limit_count integer DEFAULT 8
)
RETURNS TABLE(query text, count bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    search_history.query,
    COUNT(*) as count
  FROM public.search_history
  WHERE search_history.created_at >= (now() - (days_back || ' days')::interval)
  GROUP BY search_history.query
  ORDER BY count DESC
  LIMIT limit_count;
$$;

-- 4. Enable Row Level Security
ALTER TABLE IF EXISTS public.search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.search_selections ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies for search_history
DO $$
BEGIN
  -- Drop existing policies if they exist
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'search_history' 
    AND policyname = 'Users can view own search history'
  ) THEN
    DROP POLICY "Users can view own search history" ON public.search_history;
  END IF;
END
$$;

CREATE POLICY "Users can view own search history"
  ON public.search_history
  FOR SELECT
  USING (auth.uid() = user_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'search_history' 
    AND policyname = 'Users can insert own search history'
  ) THEN
    DROP POLICY "Users can insert own search history" ON public.search_history;
  END IF;
END
$$;

CREATE POLICY "Users can insert own search history"
  ON public.search_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 6. Create RLS Policies for search_selections
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'search_selections' 
    AND policyname = 'Users can view own search selections'
  ) THEN
    DROP POLICY "Users can view own search selections" ON public.search_selections;
  END IF;
END
$$;

CREATE POLICY "Users can view own search selections"
  ON public.search_selections
  FOR SELECT
  USING (auth.uid() = user_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'search_selections' 
    AND policyname = 'Users can insert own search selections'
  ) THEN
    DROP POLICY "Users can insert own search selections" ON public.search_selections;
  END IF;
END
$$;

CREATE POLICY "Users can insert own search selections"
  ON public.search_selections
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 7. Patient app can insert selections without user_id (anonymous tracking)
CREATE POLICY "Anonymous can insert search selections"
  ON public.search_selections
  FOR INSERT
  WITH CHECK (user_id IS NULL);

-- 8. Anyone can read trending (for patient app discovery)
CREATE POLICY "Anyone can read trending searches"
  ON public.search_history
  FOR SELECT
  USING (true);

-- Grant permissions
GRANT SELECT ON public.search_history TO authenticated;
GRANT SELECT ON public.search_history TO anon;
GRANT INSERT ON public.search_history TO authenticated;

GRANT SELECT ON public.search_selections TO authenticated;
GRANT SELECT ON public.search_selections TO anon;
GRANT INSERT ON public.search_selections TO authenticated;
GRANT INSERT ON public.search_selections TO anon;

-- Grant execute on RPC function
GRANT EXECUTE ON FUNCTION get_trending_searches(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_trending_searches(integer, integer) TO anon;
