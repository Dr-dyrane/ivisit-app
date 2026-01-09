create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  phone text,
  username text,
  first_name text,
  last_name text,
  full_name text,
  image_uri text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  demo_mode_enabled boolean not null default true,
  notifications_enabled boolean not null default true,
  appointment_reminders boolean not null default true,
  emergency_updates boolean not null default true,
  privacy_share_medical_profile boolean not null default false,
  privacy_share_emergency_contacts boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.visits (
  id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  hospital_id text,
  hospital text,
  doctor text,
  specialty text,
  date text,
  time text,
  type text,
  status text,
  image text,
  address text,
  phone text,
  notes text,
  room_number text,
  estimated_duration text,
  request_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists visits_user_id_idx on public.visits(user_id);
create index if not exists visits_status_idx on public.visits(status);

create table if not exists public.notifications (
  id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text,
  title text,
  message text,
  timestamp text,
  read boolean not null default false,
  priority text,
  action_type text,
  action_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_read_idx on public.notifications(read);

alter table public.profiles enable row level security;
alter table public.preferences enable row level security;
alter table public.visits enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "Profiles are readable by own user" on public.profiles;
create policy "Profiles are readable by own user"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "Profiles are insertable by own user" on public.profiles;
create policy "Profiles are insertable by own user"
on public.profiles for insert
with check (auth.uid() = id);

drop policy if exists "Profiles are updatable by own user" on public.profiles;
create policy "Profiles are updatable by own user"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Preferences are readable by own user" on public.preferences;
create policy "Preferences are readable by own user"
on public.preferences for select
using (auth.uid() = user_id);

drop policy if exists "Preferences are updatable by own user" on public.preferences;
create policy "Preferences are updatable by own user"
on public.preferences for insert
with check (auth.uid() = user_id);

drop policy if exists "Preferences are insertable by own user" on public.preferences;
create policy "Preferences are insertable by own user"
on public.preferences for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Visits are readable by own user" on public.visits;
create policy "Visits are readable by own user"
on public.visits for select
using (auth.uid() = user_id);

drop policy if exists "Visits are insertable by own user" on public.visits;
create policy "Visits are insertable by own user"
on public.visits for insert
with check (auth.uid() = user_id);

drop policy if exists "Visits are updatable by own user" on public.visits;
create policy "Visits are updatable by own user"
on public.visits for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Visits are deletable by own user" on public.visits;
create policy "Visits are deletable by own user"
on public.visits for delete
using (auth.uid() = user_id);

drop policy if exists "Notifications are readable by own user" on public.notifications;
create policy "Notifications are readable by own user"
on public.notifications for select
using (auth.uid() = user_id);

drop policy if exists "Notifications are insertable by own user" on public.notifications;
create policy "Notifications are insertable by own user"
on public.notifications for insert
with check (auth.uid() = user_id);

drop policy if exists "Notifications are updatable by own user" on public.notifications;
create policy "Notifications are updatable by own user"
on public.notifications for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Notifications are deletable by own user" on public.notifications;
create policy "Notifications are deletable by own user"
on public.notifications for delete
using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, phone, created_at, updated_at)
  values (new.id, new.email, new.phone, now(), now())
  on conflict (id) do update set email = excluded.email, phone = excluded.phone, updated_at = now();

  insert into public.preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

