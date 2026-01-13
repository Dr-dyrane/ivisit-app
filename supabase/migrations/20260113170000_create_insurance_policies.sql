-- Create insurance_policies table
create table if not exists public.insurance_policies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  provider_name text not null,
  policy_number text,
  group_number text,
  policy_holder_name text,
  coverage_type text,
  start_date date,
  end_date date,
  front_image_url text,
  back_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.insurance_policies enable row level security;

-- Policies
create policy "Users can view own insurance policies"
on public.insurance_policies for select
using (auth.uid() = user_id);

create policy "Users can insert own insurance policies"
on public.insurance_policies for insert
with check (auth.uid() = user_id);

create policy "Users can update own insurance policies"
on public.insurance_policies for update
using (auth.uid() = user_id);

create policy "Users can delete own insurance policies"
on public.insurance_policies for delete
using (auth.uid() = user_id);
