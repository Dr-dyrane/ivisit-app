-- 🏯 Module 06: Operations & Content
-- Notifications, Support, and CMS

-- 1. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT, -- 'emergency', 'system', 'visit'
    title TEXT,
    message TEXT,
    icon TEXT,
    color TEXT,
    read BOOLEAN NOT NULL DEFAULT false,
    priority TEXT DEFAULT 'normal',
    action_type TEXT,
    action_data JSONB,
    metadata JSONB DEFAULT '{}',
    display_id TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Support System
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES public.organizations(id),
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    status TEXT DEFAULT 'open',
    priority TEXT DEFAULT 'normal',
    assigned_to UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.support_faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    rank INTEGER DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Content (CMS)
CREATE TABLE IF NOT EXISTS public.health_news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    source TEXT NOT NULL,
    url TEXT,
    image_url TEXT,
    category TEXT DEFAULT 'general',
    published BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    file_path TEXT,
    tier TEXT DEFAULT 'confidential', -- 'public', 'confidential', 'restricted'
    visibility TEXT[] DEFAULT '{admin}',
    content TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 🛠️ AUTOMATION: OPS HOOKS
-- A. Notify on Emergency Status Change
CREATE OR REPLACE FUNCTION public.notify_emergency_events()
RETURNS TRIGGER AS $$
BEGIN
    -- Notify Org Admins on New Request
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.notifications (user_id, type, title, message, priority, action_type, action_data)
        SELECT 
            p.id, 'emergency', '🚨 New Emergency', 
            'A new ' || NEW.service_type || ' request was created at your facility.', 
            'high', 'view_emergency', jsonb_build_object('id', NEW.id)
        FROM public.profiles p
        WHERE p.organization_id = (SELECT organization_id FROM public.hospitals WHERE id = NEW.hospital_id)
        AND p.role IN ('org_admin', 'admin');
    END IF;

    -- Notify Patient on Approval/Dispatch
    IF (TG_OP = 'UPDATE' AND NEW.status != OLD.status) THEN
        INSERT INTO public.notifications (user_id, type, title, message, priority)
        VALUES (
            NEW.user_id, 'emergency', 'Status Updated', 
            'Your emergency request is now: ' || NEW.status, 
            'normal'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_emergency_notification
AFTER INSERT OR UPDATE ON public.emergency_requests
FOR EACH ROW EXECUTE PROCEDURE public.notify_emergency_events();

-- Standard Updates
CREATE TRIGGER handle_note_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_ticket_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_doc_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
