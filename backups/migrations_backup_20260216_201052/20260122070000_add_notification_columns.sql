
-- Add missing columns to notifications table to match frontend service usage
alter table "public"."notifications" 
add column if not exists "target_id" text,
add column if not exists "icon" text,
add column if not exists "color" text,
add column if not exists "metadata" jsonb default '{}'::jsonb;

-- Add index on target_id for faster lookups
create index if not exists "notifications_target_id_idx" on "public"."notifications" ("target_id");
