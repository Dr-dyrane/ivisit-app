-- 🏯 Module 07: Analytics & System Audit
-- User Activity, Logs, and Search History

-- 1. Activity Logs
CREATE TABLE IF NOT EXISTS public.user_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT, -- 'profile', 'visit', 'emergency_request'
    entity_id UUID,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES public.profiles(id),
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Search & Trends
CREATE TABLE IF NOT EXISTS public.search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    result_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.search_selections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    result_type TEXT NOT NULL,
    result_id TEXT NOT NULL,
    source TEXT DEFAULT 'search',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.search_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query TEXT,
    source TEXT, -- 'app', 'console'
    selected_key TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_selections_user_id
ON public.search_selections(user_id);

CREATE INDEX IF NOT EXISTS idx_search_selections_created_at
ON public.search_selections(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_search_selections_query
ON public.search_selections(query);

CREATE TABLE IF NOT EXISTS public.trending_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query TEXT NOT NULL,
    category TEXT NOT NULL,
    rank INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 🛠️ AUTOMATION
CREATE TRIGGER handle_trend_updated_at BEFORE UPDATE ON public.trending_topics FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Log Profile Updates
CREATE OR REPLACE FUNCTION public.log_profile_updates()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_activity (user_id, action, entity_type, entity_id, description)
    VALUES (NEW.id, 'profile_updated', 'profile', NEW.id, 'User updated their profile information.');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_updated
AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE PROCEDURE public.log_profile_updates();
