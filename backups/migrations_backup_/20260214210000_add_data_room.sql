-- ============================================================
-- iVisit Secure Data Room — Schema & RLS
-- Integrated from ivisit-docs migration 001 and 002
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;



-- 1. DOCUMENTS TABLE
-- Metadata catalog of available files in the Data Room
CREATE TABLE IF NOT EXISTS public.documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  tier        TEXT DEFAULT 'confidential' CHECK (tier IN ('public','confidential','restricted')),
  file_path   TEXT NOT NULL,
  icon        TEXT DEFAULT 'file-text',
  visibility  TEXT[] DEFAULT '{"admin"}', -- Roles that can see this doc
  content     TEXT, -- Markdown content
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 2. USER ROLES TABLE (iVisit-docs specific global roles)
-- Maps auth.users to specialized roles for Data Room access
CREATE TABLE IF NOT EXISTS public.user_roles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'viewer'
               CHECK (role IN ('admin','sponsor','lawyer','cto','developer','viewer')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. ACCESS REQUESTS TABLE
-- Per-user, per-document access records
CREATE TABLE IF NOT EXISTS public.access_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id   UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','revoked')),
  nda_signed_at TIMESTAMPTZ,
  signer_name   TEXT,
  signer_entity TEXT,
  signer_title  TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, document_id)
);

-- 4. DOCUMENT INVITES TABLE
-- Admin sends invite link to a sponsor's email
CREATE TABLE IF NOT EXISTS public.document_invites (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT NOT NULL,
  document_id  UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  token        TEXT UNIQUE NOT NULL DEFAULT md5(gen_random_uuid()::text),

  claimed      BOOLEAN DEFAULT false,

  claimed_by   UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ DEFAULT now(),
  expires_at   TIMESTAMPTZ DEFAULT (now() + interval '30 days')
);

-- 5. AUTO-UPDATE TRIGGERS
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_documents_updated ON public.documents;
CREATE TRIGGER trg_documents_updated
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_access_requests_updated ON public.access_requests;
CREATE TRIGGER trg_access_requests_updated
  BEFORE UPDATE ON public.access_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 6. ROW LEVEL SECURITY

-- Documents RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view document metadata"
  ON public.documents FOR SELECT TO authenticated
  USING (true);

-- User Roles RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own role"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Access Requests RLS
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own requests"
  ON public.access_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own requests"
  ON public.access_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Document Invites RLS
ALTER TABLE public.document_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view invites by token"
  ON public.document_invites FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can claim invites"
  ON public.document_invites FOR UPDATE TO authenticated
  USING (claimed = false AND email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  WITH CHECK (claimed = true AND claimed_by = auth.uid());


-- 7. ADMIN POLICIES (Explicit for completeness)
-- Admin defined by existence in user_roles table with role='admin'

CREATE POLICY "Admin can insert documents"
  ON public.documents FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin can update documents"
  ON public.documents FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin can delete documents"
  ON public.documents FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin can view all access requests"
  ON public.access_requests FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin can update access requests"
  ON public.access_requests FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));


-- 8. NOTIFICATION TRIGGERS (Using shared notifications table)

-- Trigger: Notify admin on new access request
CREATE OR REPLACE FUNCTION public.notify_admin_on_access_request()
RETURNS TRIGGER AS $$
DECLARE
  doc_title TEXT;
  user_email TEXT;
  admin_row RECORD;
BEGIN
  SELECT title INTO doc_title FROM public.documents WHERE id = NEW.document_id;
  SELECT email INTO user_email FROM auth.users WHERE id = NEW.user_id;

  -- Insert notification for every admin user found in user_roles
  FOR admin_row IN
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    -- ivisit-app notifications table (id is text with default gen_random_uuid)
    INSERT INTO public.notifications (user_id, type, action_type, target_id, title, message, icon, color, priority)
    VALUES (
      admin_row.user_id,
      'access_request',
      'created',
      NEW.id::TEXT,
      'New Access Request',
      user_email || ' requested access to "' || doc_title || '"',
      'Shield',
      'warning',
      'high'
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_admin_access_request ON public.access_requests;
CREATE TRIGGER trg_notify_admin_access_request
  AFTER INSERT ON public.access_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_on_access_request();


-- Trigger: Notify user when access status changes
CREATE OR REPLACE FUNCTION public.notify_user_on_access_change()
RETURNS TRIGGER AS $$
DECLARE
  doc_title TEXT;
  notif_title TEXT;
  notif_message TEXT;
  notif_color TEXT;
  notif_icon TEXT;
BEGIN
  -- Only fire on status change
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  SELECT title INTO doc_title FROM public.documents WHERE id = NEW.document_id;

  IF NEW.status = 'approved' THEN
    notif_title := 'Access Granted';
    notif_message := 'You now have access to "' || doc_title || '"';
    notif_color := 'success';
    notif_icon := 'Unlock';
  ELSIF NEW.status = 'revoked' THEN
    notif_title := 'Access Revoked';
    notif_message := 'Your access to "' || doc_title || '" has been revoked';
    notif_color := 'destructive';
    notif_icon := 'Lock';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, type, action_type, target_id, title, message, icon, color)
  VALUES (
    NEW.user_id,
    'access_request',
    NEW.status,
    NEW.id::TEXT,
    notif_title,
    notif_message,
    notif_icon,
    notif_color
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_user_access_change ON public.access_requests;
CREATE TRIGGER trg_notify_user_access_change
  AFTER UPDATE ON public.access_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_user_on_access_change();


-- 9. INDEXES
CREATE INDEX IF NOT EXISTS idx_access_requests_user ON public.access_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_document ON public.access_requests(document_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_status ON public.access_requests(status);
CREATE INDEX IF NOT EXISTS idx_document_invites_token ON public.document_invites(token);
CREATE INDEX IF NOT EXISTS idx_document_invites_email ON public.document_invites(email);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);


-- 10. ENABLE REALTIME
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'access_requests') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.access_requests;
  END IF;
END $$;


-- 11. SEED DATA
INSERT INTO public.documents (slug, title, description, tier, file_path, icon, visibility) VALUES
  ('business-proposal', 'iVisit Definitive Business Proposal 2026', 'Neural Emergency Infrastructure — the complete investor-ready business proposal covering Unity Architecture, market analysis, execution roadmap, and financial projections.', 'confidential', 'iVisit_Definitive_Business_Proposal_2026.md', 'briefcase', '{"admin","sponsor","lawyer","cto"}'),
  ('master-plan', 'iVisit Master Plan v2.0', 'The strategic master plan outlining the three-phase deployment from Lagos tactical strike to national lifeline infrastructure.', 'restricted', 'iVisit_Master_Plan_v2.md', 'map', '{"admin","cto","developer"}'),
  ('mutual-nda', 'Mutual Non-Disclosure Agreement', 'Standardized mutual NDA governing all confidential disclosures between iVisit and external parties under Nigerian law.', 'public', 'iVisit_Mutual_NDA_External_2026.md', 'shield', '{"admin","sponsor","lawyer","cto","developer","viewer"}'),
  ('print-engine', 'Print Engine Blueprint', 'Technical specification for the high-fidelity document printing system powering the iVisit Data Room.', 'confidential', 'iVisit_Print_Engine_Blueprint.md', 'printer', '{"admin","cto","developer"}')
ON CONFLICT (slug) DO UPDATE SET 
  visibility = EXCLUDED.visibility,
  title = EXCLUDED.title,
  description = EXCLUDED.description;
