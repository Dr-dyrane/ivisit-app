-- Fix notifications table ID to auto-generate UUIDs
-- Change id column from text to uuid with default gen_random_uuid()

-- First, if there are any existing rows, we need to handle them
-- But for a fresh table or if you want to clear it, we can just alter

alter table "public"."notifications" 
alter column "id" type uuid using (case when id is null or id = '' then gen_random_uuid() else id::uuid end),
alter column "id" set default gen_random_uuid();

-- Ensure the column is still not null and primary key
-- (these should already be set, but we're being explicit)
alter table "public"."notifications" 
alter column "id" set not null;
