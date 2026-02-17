-- Create medical_profiles table
create table if not exists public.medical_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  blood_type text,
  allergies text[],
  conditions text[],
  medications text[],
  organ_donor boolean default false,
  insurance_provider text,
  insurance_policy_number text,
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relationship text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.medical_profiles enable row level security;

-- Policies
create policy "Medical profiles are readable by own user"
on public.medical_profiles for select
using (auth.uid() = user_id);

create policy "Medical profiles are insertable by own user"
on public.medical_profiles for insert
with check (auth.uid() = user_id);

create policy "Medical profiles are updatable by own user"
on public.medical_profiles for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Create trigger to auto-create medical profile on user creation
create or replace function public.handle_new_user_medical_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.medical_profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- Trigger to run after profile creation (since it depends on profile)
-- Note: Ideally this hooks onto auth.users like profiles, or profiles insert.
-- Hooking to profiles insert ensures foreign key constraint is met.
drop trigger if exists on_profile_created_medical on public.profiles;
create trigger on_profile_created_medical
after insert on public.profiles
for each row execute procedure public.handle_new_user_medical_profile();
