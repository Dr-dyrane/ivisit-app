-- Automatic Analytics Pipeline Migration
-- Creates automated system to populate trending_topics from search data
-- This enables global trending without touching app implementation

-- 1. Create function to automatically update trending_topics from search analytics
CREATE OR REPLACE FUNCTION update_trending_topics_from_search()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    analytics_period_days INTEGER := 7;
    max_topics INTEGER := 10;
    updated_rows INTEGER;
BEGIN
    -- Clear existing trending topics
    DELETE FROM public.trending_topics;
    
    -- Insert fresh trending data from search analytics
    INSERT INTO public.trending_topics (query, category, rank)
    SELECT 
        CASE 
            WHEN sa.search_count > 100 THEN sa.query || ' 🔥'
            ELSE sa.query
        END as query,
        CASE 
            WHEN sa.unique_users > 50 THEN 'Trending in Lagos'
            WHEN sa.search_count > 50 THEN 'Most Searched'
            ELSE 'Popular'
        END as category,
        sa.rank
    FROM get_search_analytics(analytics_period_days, max_topics) sa;
    
    -- Log the update
    GET DIAGNOSTICS updated_rows = ROW_COUNT;
    INSERT INTO public.search_events (query, source, selected_key, extra)
    VALUES ('trending_topics_update', 'system', 'auto_update', 
            jsonb_build_object('updated_rows', updated_rows, 'period_days', analytics_period_days));
    
END;
$$;

-- 2. Create scheduled job to update trending topics automatically
-- Note: This requires pg_cron extension. If not available, can be called manually.
-- SELECT cron.schedule('update-trending-topics', '0 */6 * * *', 'SELECT update_trending_topics_from_search();');

-- 3. Grant execute permissions
GRANT EXECUTE ON FUNCTION update_trending_topics_from_search() TO authenticated;

-- 4. Create trigger to automatically update trending topics when significant search activity occurs
CREATE OR REPLACE FUNCTION auto_update_trending_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only update if this is a significant search activity
    -- Update trending topics every 50 new searches to avoid excessive updates
    IF (SELECT COUNT(*) FROM public.search_history WHERE created_at > NOW() - INTERVAL '1 hour') % 50 = 0 THEN
        PERFORM update_trending_topics_from_search();
    END IF;
    
    RETURN NEW;
END;
$$;

-- 5. Create trigger on search_history insertions
-- Note: This trigger may affect performance, consider using cron instead
-- CREATE TRIGGER trigger_auto_update_trending
-- AFTER INSERT ON public.search_history
-- FOR EACH STATEMENT
-- EXECUTE FUNCTION auto_update_trending_trigger();

-- 6. Create admin function to manually trigger trending updates
CREATE OR REPLACE FUNCTION admin_update_trending_topics(
    days_back integer DEFAULT 7,
    limit_count integer DEFAULT 10
)
RETURNS TABLE(
    query text,
    category text,
    rank integer,
    search_count bigint,
    unique_users bigint
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    -- First update the trending_topics table
    SELECT update_trending_topics_from_search();
    
    -- Then return the updated data with analytics
    SELECT 
        tt.query,
        tt.category,
        tt.rank,
        sa.search_count,
        sa.unique_users
    FROM public.trending_topics tt
    LEFT JOIN get_search_analytics(days_back, limit_count) sa ON tt.query = sa.query
    ORDER BY tt.rank;
$$;

-- Grant execute permissions for admin function
GRANT EXECUTE ON FUNCTION admin_update_trending_topics(integer, integer) TO authenticated;

-- 7. Create view for real-time trending analytics (read-only for mobile app)
CREATE OR REPLACE VIEW public.trending_searches_view AS
SELECT 
    tt.query,
    tt.rank,
    tt.category,
    COALESCE(sa.search_count, 100 - (tt.rank * 10)) as search_count,
    COALESCE(sa.unique_users, 20 - (tt.rank * 2)) as unique_users,
    tt.updated_at
FROM public.trending_topics tt
LEFT JOIN LATERAL (
    SELECT search_count, unique_users 
    FROM get_search_analytics(7, 20) 
    WHERE query = tt.query
    LIMIT 1
) sa ON true
ORDER BY tt.rank;

-- Grant read access to the view for everyone
GRANT SELECT ON public.trending_searches_view TO authenticated;
GRANT SELECT ON public.trending_searches_view TO anon;

-- 8. Update the original get_trending_searches function to use the new system
CREATE OR REPLACE FUNCTION get_trending_searches(
    days_back integer DEFAULT 7,
    limit_count integer DEFAULT 8
)
RETURNS TABLE(query text, count bigint)
LANGUAGE sql
STABLE
AS $$
    -- Use the view which combines static trending topics with real analytics
    SELECT 
        query,
        search_count as count
    FROM public.trending_searches_view
    ORDER BY rank
    LIMIT limit_count;
$$;

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';

-- 9. Initial population of trending topics
SELECT update_trending_topics_from_search();
