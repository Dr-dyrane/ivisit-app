-- Fix notifications table schema
-- Option 1: If you want to preserve existing notifications, keep id as text with generation
-- Option 2: Clear old data and use UUID (recommended for clean slate)

-- RECOMMENDED APPROACH: Clear and use UUID
-- Step 1: Clear existing notification data (they're transient anyway)
truncate table "public"."notifications" cascade;

-- Step 2: Add missing columns if not exists
alter table "public"."notifications" 
add column if not exists "target_id" text,
add column if not exists "icon" text,
add column if not exists "color" text,
add column if not exists "metadata" jsonb default '{}'::jsonb;

-- Step 3: Convert id column to uuid with auto-generation
alter table "public"."notifications" 
alter column "id" drop default,
alter column "id" type uuid using gen_random_uuid(),
alter column "id" set default gen_random_uuid();

-- Step 4: Add useful indexes
create index if not exists "notifications_target_id_idx" on "public"."notifications" ("target_id");
create index if not exists "notifications_user_id_created_at_idx" on "public"."notifications" ("user_id", "created_at" desc);
create index if not exists "notifications_read_idx" on "public"."notifications" ("read") where read = false;
