-- Emergency lifecycle + concurrency enforcement

-- 1) Visits: add lifecycle + rating fields (backwards compatible)
alter table public.visits
add column if not exists lifecycle_state text,
add column if not exists lifecycle_updated_at timestamptz,
add column if not exists rating smallint,
add column if not exists rating_comment text,
add column if not exists rated_at timestamptz;

update public.visits
set lifecycle_state = coalesce(lifecycle_state, null),
    lifecycle_updated_at = coalesce(lifecycle_updated_at, updated_at, now())
where lifecycle_updated_at is null;

alter table public.visits
alter column lifecycle_updated_at set default now();

do $$
begin
  alter table public.visits
  add constraint visits_rating_range_chk
  check (rating is null or (rating >= 1 and rating <= 5));
exception
  when duplicate_object then null;
end $$;

-- 2) Concurrency: allow max 1 active bed booking + 1 active ambulance per user
with ranked as (
  select
    id,
    row_number() over (
      partition by user_id, service_type
      order by updated_at desc nulls last, created_at desc nulls last, id desc
    ) as rn
  from public.emergency_requests
  where service_type in ('bed', 'ambulance')
    and status in ('in_progress', 'accepted', 'arrived')
)
update public.emergency_requests er
set
  status = 'cancelled',
  cancelled_at = coalesce(er.cancelled_at, now()),
  updated_at = now()
from ranked r
where er.id = r.id and r.rn > 1;

with ranked as (
  select
    id,
    row_number() over (
      partition by user_id, type
      order by updated_at desc nulls last, created_at desc nulls last, id desc
    ) as rn
  from public.visits
  where type in ('Bed Booking', 'Ambulance Ride')
    and status = 'in_progress'
)
update public.visits v
set
  status = 'cancelled',
  updated_at = now()
from ranked r
where v.id = r.id and r.rn > 1;

create unique index if not exists emergency_requests_one_active_bed_per_user_idx
on public.emergency_requests (user_id)
where service_type = 'bed' and status in ('in_progress', 'accepted', 'arrived');

create unique index if not exists emergency_requests_one_active_ambulance_per_user_idx
on public.emergency_requests (user_id)
where service_type = 'ambulance' and status in ('in_progress', 'accepted', 'arrived');

create unique index if not exists visits_one_active_bed_booking_per_user_idx
on public.visits (user_id)
where type = 'Bed Booking' and status = 'in_progress';

create unique index if not exists visits_one_active_ambulance_ride_per_user_idx
on public.visits (user_id)
where type = 'Ambulance Ride' and status = 'in_progress';

-- 3) Server-side sync: keep visits aligned with emergency_requests status transitions
create or replace function public.sync_emergency_to_visit()
returns trigger
language plpgsql
security definer
as $$
declare
  visit_type text;
  visit_status text;
  visit_lifecycle text;
begin
  visit_type := case when new.service_type = 'ambulance' then 'Ambulance Ride' else 'Bed Booking' end;

  visit_status := case
    when new.status in ('completed', 'cancelled') then new.status
    else 'in_progress'
  end;

  visit_lifecycle := case
    when new.status = 'cancelled' then 'cancelled'
    when new.status = 'completed' then 'completed'
    when new.status = 'arrived' and new.service_type = 'bed' then 'occupied'
    when new.status = 'arrived' and new.service_type = 'ambulance' then 'arrived'
    when new.status = 'accepted' then 'confirmed'
    when new.status = 'in_progress' then 'initiated'
    else 'initiated'
  end;

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
    lifecycle_state,
    lifecycle_updated_at,
    created_at,
    updated_at
  )
  values (
    new.id,
    new.user_id,
    new.hospital_id,
    new.hospital_name,
    new.specialty,
    to_char(new.created_at, 'YYYY-MM-DD'),
    to_char(new.created_at, 'HH12:MI AM'),
    visit_type,
    visit_status,
    new.request_id,
    visit_lifecycle,
    now(),
    new.created_at,
    now()
  )
  on conflict (id) do update set
    hospital_id = excluded.hospital_id,
    hospital = excluded.hospital,
    specialty = excluded.specialty,
    status = excluded.status,
    request_id = excluded.request_id,
    lifecycle_state = excluded.lifecycle_state,
    lifecycle_updated_at = excluded.lifecycle_updated_at,
    updated_at = excluded.updated_at;

  return new;
end;
$$;

drop trigger if exists on_emergency_status_change on public.emergency_requests;

create trigger on_emergency_status_change
after insert or update on public.emergency_requests
for each row execute function public.sync_emergency_to_visit();
