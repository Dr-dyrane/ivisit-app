-- Create support_faqs table
create table if not exists public.support_faqs (
  id bigserial primary key,
  question text not null,
  answer text not null,
  category text default 'General',
  rank int default 100,
  created_at timestamp with time zone default now()
);

alter table public.support_faqs enable row level security;

create policy "Read FAQs"
on public.support_faqs for select
to public
using (true);

-- Create support_tickets table
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  subject text not null,
  message text not null,
  status text default 'open',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.support_tickets enable row level security;

create policy "Insert own ticket"
on public.support_tickets for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Read own tickets"
on public.support_tickets for select
to authenticated
using (auth.uid() = user_id);

create policy "Update own tickets"
on public.support_tickets for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

