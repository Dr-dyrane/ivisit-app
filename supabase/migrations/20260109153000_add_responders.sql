-- Add responder columns to emergency_requests
alter table public.emergency_requests 
add column if not exists responder_id uuid references public.profiles(id),
add column if not exists responder_name text,
add column if not exists responder_phone text,
add column if not exists responder_vehicle_type text,
add column if not exists responder_vehicle_plate text,
add column if not exists responder_location geography(POINT),
add column if not exists responder_heading float;

-- Index for geospatial queries on responder location
create index if not exists emergency_requests_responder_loc_idx on public.emergency_requests using GIST(responder_location);
