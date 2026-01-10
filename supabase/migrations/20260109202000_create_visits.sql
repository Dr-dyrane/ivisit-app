-- Create visits table

create table if not exists "public"."visits" (
    "id" text not null,
    "user_id" uuid references auth.users(id) on delete cascade not null,
    "hospital" text,
    "hospital_id" text,
    "doctor" text,
    "doctor_image" text,
    "specialty" text,
    "date" text,
    "time" text,
    "type" text,
    "status" text default 'upcoming',
    "image" text,
    "address" text,
    "phone" text,
    "notes" text,
    "estimated_duration" text,
    "preparation" text[],
    "cost" text,
    "insurance_covered" boolean default true,
    "room_number" text,
    "summary" text,
    "prescriptions" text[],
    "next_visit" text,
    "request_id" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    primary key ("id")
);

-- Enable RLS
alter table "public"."visits" enable row level security;

-- Policies
drop policy if exists "Users can view own visits" on "public"."visits";
create policy "Users can view own visits"
on "public"."visits"
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own visits" on "public"."visits";
create policy "Users can insert own visits"
on "public"."visits"
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own visits" on "public"."visits";
create policy "Users can update own visits"
on "public"."visits"
for update
using (auth.uid() = user_id);

drop policy if exists "Users can delete own visits" on "public"."visits";
create policy "Users can delete own visits"
on "public"."visits"
for delete
using (auth.uid() = user_id);
