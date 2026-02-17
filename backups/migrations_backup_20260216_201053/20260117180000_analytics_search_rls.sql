-- Search Analytics RLS Migration
-- Description: Enable admin access to global search analytics while maintaining user privacy
-- This allows console to provide real trending data to mobile app

-- 1. Create analytics function for global search insights
CREATE OR REPLACE FUNCTION get_search_analytics(
    days_back integer DEFAULT 7,
    limit_count integer DEFAULT 10
)
RETURNS TABLE(
    query text,
    search_count bigint,
    unique_users bigint,
    last_searched timestamptz,
    rank integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    WITH search_analytics AS (
        SELECT 
            sh.query,
            COUNT(*) as search_count,
            COUNT(DISTINCT sh.user_id) as unique_users,
            MAX(sh.created_at) as last_searched,
            ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) as rank
        FROM public.search_history sh
        WHERE sh.created_at >= (now() - (days_back || ' days')::interval)
        GROUP BY sh.query
        ORDER BY search_count DESC
        LIMIT limit_count
    )
    SELECT 
        sa.query,
        sa.search_count,
        sa.unique_users,
        sa.last_searched,
        sa.rank
    FROM search_analytics sa;
$$;

-- 2. Create function for search analytics summary
CREATE OR REPLACE FUNCTION get_search_analytics_summary(
    days_back integer DEFAULT 30
)
RETURNS TABLE(
    total_searches bigint,
    unique_searchers bigint,
    unique_queries bigint,
    avg_searches_per_user numeric,
    top_query text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT 
        COUNT(*) as total_searches,
        COUNT(DISTINCT user_id) as unique_searchers,
        COUNT(DISTINCT query) as unique_queries,
        CASE 
            WHEN COUNT(DISTINCT user_id) > 0 
            THEN ROUND(COUNT(*)::numeric / COUNT(DISTINCT user_id), 2)
            ELSE 0 
        END as avg_searches_per_user,
        (SELECT query FROM (
            SELECT query, COUNT(*) as cnt
            FROM public.search_history
            WHERE created_at >= (now() - (days_back || ' days')::interval)
            GROUP BY query
            ORDER BY cnt DESC
            LIMIT 1
        ) top) as top_query
    FROM public.search_history
    WHERE created_at >= (now() - (days_back || ' days')::interval);
$$;

-- 3. Grant execute permissions to authenticated users (for admin access)
GRANT EXECUTE ON FUNCTION get_search_analytics(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_search_analytics_summary(integer) TO authenticated;

-- 4. Create admin-only policy for global search analytics
-- This allows admins to bypass RLS for analytics while maintaining user privacy

-- Drop existing public read policy if it exists
DROP POLICY IF EXISTS "Anyone can read trending searches" ON public.search_history;

-- Create admin analytics policy
CREATE POLICY "Admin analytics access to search_history"
ON public.search_history
FOR SELECT
TO authenticated
USING (
    -- Allow access if user is admin OR accessing their own data
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    )
);

-- 5. Create search_events table for better analytics tracking
CREATE TABLE IF NOT EXISTS public.search_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    query text,
    source text DEFAULT 'console',
    selected_key text,
    extra jsonb,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS on search_events
ALTER TABLE public.search_events ENABLE ROW LEVEL SECURITY;

-- Policy for search_events - admins can read all, users can insert
CREATE POLICY "Admins can read all search events"
ON public.search_events
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    )
);

CREATE POLICY "Users can insert search events"
ON public.search_events
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON public.search_events TO authenticated;
GRANT INSERT ON public.search_events TO authenticated;

-- 6. Create index for better performance
CREATE INDEX IF NOT EXISTS idx_search_events_created_at 
ON public.search_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_search_events_query 
ON public.search_events(query);

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';

-- 7. Create function to check if user is admin (helper for RLS)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    );
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
