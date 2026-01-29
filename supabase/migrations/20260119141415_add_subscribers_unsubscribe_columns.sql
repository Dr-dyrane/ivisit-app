-- Add unsubscribe functionality to subscribers table
-- This migration adds the necessary columns for the unsubscribe feature

-- Add status column to track subscription status
ALTER TABLE public.subscribers 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- Add unsubscribe tracking columns
ALTER TABLE public.subscribers 
ADD COLUMN IF NOT EXISTS unsubscribed_at timestamptz;

-- Add welcome email tracking columns (if they don't exist)
ALTER TABLE public.subscribers 
ADD COLUMN IF NOT EXISTS welcome_email_sent boolean DEFAULT false;

ALTER TABLE public.subscribers 
ADD COLUMN IF NOT EXISTS welcome_email_sent_at timestamptz;

-- Add subscription date column (if it doesn't exist)
ALTER TABLE public.subscribers 
ADD COLUMN IF NOT EXISTS subscription_date date;

-- Add source tracking column (if it doesn't exist)
ALTER TABLE public.subscribers 
ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';

-- Add last engagement tracking (if it doesn't exist)
ALTER TABLE public.subscribers 
ADD COLUMN IF NOT EXISTS last_engagement_at timestamptz;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS subscribers_status_idx ON public.subscribers(status);
CREATE INDEX IF NOT EXISTS subscribers_email_idx ON public.subscribers(email);
CREATE INDEX IF NOT EXISTS subscribers_unsubscribed_at_idx ON public.subscribers(unsubscribed_at);

-- Enable RLS on subscribers table
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Subscribers are publicly readable" ON public.subscribers;
DROP POLICY IF EXISTS "Subscribers are publicly insertable" ON public.subscribers;
DROP POLICY IF EXISTS "Subscribers are publicly updatable" ON public.subscribers;
DROP POLICY IF EXISTS "Subscribers are publicly deletable" ON public.subscribers;

-- Create RLS policies for subscribers
-- Anyone can read subscribers (for unsubscribe functionality)
CREATE POLICY "Subscribers are publicly readable" ON public.subscribers
FOR SELECT USING (true);

-- Authenticated users can insert subscribers
CREATE POLICY "Subscribers are insertable by authenticated users" ON public.subscribers
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Service role can update subscribers (for unsubscribe functionality)
CREATE POLICY "Subscribers are updatable by service role" ON public.subscribers
FOR UPDATE USING (auth.role() = 'service_role');

-- Service role can delete subscribers
CREATE POLICY "Subscribers are deletable by service role" ON public.subscribers
FOR DELETE USING (auth.role() = 'service_role');

-- Reload schema to apply changes
NOTIFY pgrst, 'reload schema';