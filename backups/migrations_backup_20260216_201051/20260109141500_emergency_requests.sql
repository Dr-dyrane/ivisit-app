-- Create PostGIS extension (required for location)
create extension if not exists "postgis";

-- Create emergency_requests table
create table if not exists public.emergency_requests (
  id text primary key,
  request_id text unique,
  user_id uuid references public.profiles(id) on delete cascade,
  
  -- Service Details
  service_type text not null, -- 'ambulance' or 'bed'
  hospital_id text,
  hospital_name text,
  specialty text,
  
  -- Ambulance Specifics
  ambulance_type text,
  ambulance_id text,
  
  -- Bed Specifics
  bed_number text,
  bed_type text,
  bed_count text,
  
  -- Status & Timing
  status text not null default 'in_progress',
  estimated_arrival text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  cancelled_at timestamptz,
  
  -- Location (PostGIS)
  pickup_location geography(POINT),
  destination_location geography(POINT),
  
  -- Snapshots (JSONB for flexibility)
  patient_snapshot jsonb,
  shared_data_snapshot jsonb
);

-- Indexes
create index if not exists emergency_requests_user_id_idx on public.emergency_requests(user_id);
create index if not exists emergency_requests_status_idx on public.emergency_requests(status);
create index if not exists emergency_requests_location_idx on public.emergency_requests using GIST(pickup_location);

-- RLS
alter table public.emergency_requests enable row level security;

-- Policies
create policy "Emergency requests are readable by own user"
on public.emergency_requests for select
using (auth.uid() = user_id);

create policy "Emergency requests are insertable by own user"
on public.emergency_requests for insert
with check (auth.uid() = user_id);

create policy "Emergency requests are updatable by own user"
on public.emergency_requests for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Function to sync emergency request to visits table on completion
create or replace function public.sync_emergency_to_history()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Only sync when status changes to 'completed' or 'cancelled'
  if (new.status = 'completed' or new.status = 'cancelled') and (old.status != 'completed' and old.status != 'cancelled') then
    insert into public.visits (
      id,
      user_id,
      hospital_id,
      hospital,
      specialty,
      date,
      time,
      type,
      status,
      request_id,
      created_at
    )
    values (
      new.id, -- Use same ID
      new.user_id,
      new.hospital_id,
      new.hospital_name,
      new.specialty,
      to_char(new.created_at, 'YYYY-MM-DD'),
      to_char(new.created_at, 'HH12:MI AM'),
      case when new.service_type = 'ambulance' then 'Ambulance Ride' else 'Bed Booking' end,
      new.status,
      new.request_id,
      new.created_at
    )
    on conflict (id) do update set status = excluded.status;
  end if;
  return new;
end;
$$;

drop trigger if exists on_emergency_status_change on public.emergency_requests;
create trigger on_emergency_status_change
after update on public.emergency_requests
for each row execute procedure public.sync_emergency_to_history();
