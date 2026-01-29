-- Create health_news table
create table if not exists public.health_news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source text not null,
  category text not null,
  icon text,
  url text,
  description text,
  content text,
  published boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.health_news enable row level security;

-- Admin policies
create policy "Admins can do anything"
on public.health_news for all
to authenticated
using (
  exists (
    select 1 from public.profiles 
    where profiles.id = auth.uid() 
    and profiles.role = 'admin'
  )
);

-- Public policies
create policy "Anyone can read published news"
on public.health_news for select
to public
using (published = true);

-- Enable realtime
alter publication supabase_realtime add table public.health_news;
