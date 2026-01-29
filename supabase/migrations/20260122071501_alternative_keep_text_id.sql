-- ALTERNATIVE: Keep existing notifications and use text-based IDs
-- Only use this if you need to preserve existing notification data

-- Step 1: Add missing columns
alter table "public"."notifications" 
add column if not exists "target_id" text,
add column if not exists "icon" text,
add column if not exists "color" text,
add column if not exists "metadata" jsonb default '{}'::jsonb;

-- Step 2: Keep id as text but add a generation function
create or replace function generate_notification_id()
returns text
language plpgsql
as $$
begin
  return 'notif_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 8);
end;
$$;

-- Step 3: Set default for id column
alter table "public"."notifications" 
alter column "id" set default generate_notification_id();

-- Step 4: Add indexes
create index if not exists "notifications_target_id_idx" on "public"."notifications" ("target_id");
create index if not exists "notifications_user_id_created_at_idx" on "public"."notifications" ("user_id", "created_at" desc);
create index if not exists "notifications_read_idx" on "public"."notifications" ("read") where read = false;
