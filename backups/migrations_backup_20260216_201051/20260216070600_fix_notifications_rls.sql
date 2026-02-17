-- Migration: Fix notifications RLS and FK for admin operations
--
-- ISSUES:
-- 1. INSERT policy: `auth.uid() = user_id` blocks admins from creating
--    notifications for other users or system notifications
-- 2. FK constraint: `user_id references auth.users(id)` fails when creating
--    notifications for profile-only users (no auth entry)
--
-- FIX:
-- 1. Add admin INSERT policy (admins can create notifications for anyone)
-- 2. Drop FK to auth.users, add FK to profiles instead (profiles is source of truth)
-- 3. Add a "system can insert" policy for authenticated users creating
--    notifications where user_id = their own ID (keep existing behavior)

-- Step 1: Drop the old FK constraint on user_id -> auth.users
-- First find and drop it
DO $$
DECLARE
    fk_name text;
BEGIN
    SELECT conname INTO fk_name
    FROM pg_constraint
    WHERE conrelid = 'public.notifications'::regclass
    AND confrelid = 'auth.users'::regclass;
    
    IF fk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.notifications DROP CONSTRAINT %I', fk_name);
    END IF;
END $$;

-- Step 2: Add FK to profiles instead (profiles is the source of truth)
-- Use ON DELETE CASCADE so deleting a profile cleans up their notifications
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.notifications'::regclass
        AND confrelid = 'public.profiles'::regclass
    ) THEN
        ALTER TABLE public.notifications
        ADD CONSTRAINT notifications_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Step 3: Fix RLS policies
-- Keep existing self-insert policy
-- Add admin insert policy (admins can create notifications for any user)

DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;
CREATE POLICY "Admins can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Also allow admins to view all notifications (for admin dashboard)
DROP POLICY IF EXISTS "Admins can view all notifications" ON public.notifications;
CREATE POLICY "Admins can view all notifications"
ON public.notifications
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Also allow admins to update any notification
DROP POLICY IF EXISTS "Admins can update all notifications" ON public.notifications;
CREATE POLICY "Admins can update all notifications"
ON public.notifications
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Also allow admins to delete any notification
DROP POLICY IF EXISTS "Admins can delete all notifications" ON public.notifications;
CREATE POLICY "Admins can delete all notifications"
ON public.notifications
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

NOTIFY pgrst, 'reload schema';
