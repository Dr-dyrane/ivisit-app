 
create table if not exists "public"."search_events" (
    "id" uuid not null default gen_random_uuid(),
    "query" text,
    "source" text,
    "selected_key" text,
    "extra" jsonb,
    "created_at" timestamp with time zone default now(),
    primary key ("id")
);

 
alter table "public"."search_events" enable row level security;

 
drop policy if exists "Public insert for search_events" on "public"."search_events";
create policy "Public insert for search_events"
on "public"."search_events"
for insert
with check (true);

drop policy if exists "Public read for search_events" on "public"."search_events";
create policy "Public read for search_events"
on "public"."search_events"
for select
using (true);

 
create index if not exists "search_events_created_at_idx" on "public"."search_events" ("created_at");
create index if not exists "search_events_source_idx" on "public"."search_events" ("source");

 
notify pgrst, 'reload schema';
