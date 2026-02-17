-- Create subscribers table
create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Note: Other columns (status, unsubscribed_at, etc.) are added in subsequent migrations
