-- Create notifications table

create table if not exists "public"."notifications" (
    "id" text not null,
    "user_id" uuid references auth.users(id) on delete cascade not null,
    "type" text,
    "title" text,
    "message" text,
    "read" boolean default false,
    "priority" text default 'normal',
    "action_type" text,
    "action_data" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    primary key ("id")
);

-- Enable RLS
alter table "public"."notifications" enable row level security;

-- Policies
drop policy if exists "Users can view own notifications" on "public"."notifications";
create policy "Users can view own notifications"
on "public"."notifications"
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own notifications" on "public"."notifications";
create policy "Users can insert own notifications"
on "public"."notifications"
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own notifications" on "public"."notifications";
create policy "Users can update own notifications"
on "public"."notifications"
for update
using (auth.uid() = user_id);

drop policy if exists "Users can delete own notifications" on "public"."notifications";
create policy "Users can delete own notifications"
on "public"."notifications"
for delete
using (auth.uid() = user_id);
