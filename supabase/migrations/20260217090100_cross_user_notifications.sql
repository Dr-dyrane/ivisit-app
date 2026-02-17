-- Migration: Allow cross-user notification inserts
-- 
-- CONTEXT: The cash payment approval flow requires patients to create
-- notifications for org_admin users. The existing RLS only allows
-- self-inserts and admin inserts.
--
-- CHANGE: Allow any authenticated user to INSERT a notification for any user.
-- SELECT/UPDATE/DELETE remain restricted to own notifications (or admin).
-- This is safe because notifications are informational, not financial.

-- Allow any authenticated user to insert notifications for any user
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;
CREATE POLICY "Authenticated users can create notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Note: The existing self-insert policy is now redundant but harmless.
-- The new policy is broader and covers all insert cases.

NOTIFY pgrst, 'reload schema';
