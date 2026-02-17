-- Create ambulances table

create table if not exists "public"."ambulances" (
    "id" text not null,
    "type" text,
    "call_sign" text,
    "status" text default 'available',
    "location" geometry(Point, 4326),
    "eta" text,
    "crew" text[],
    "hospital" text,
    "vehicle_number" text,
    "last_maintenance" text,
    "rating" double precision,
    "current_call" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    primary key ("id")
);

-- Enable RLS
alter table "public"."ambulances" enable row level security;

-- Policies
drop policy if exists "Public read access for ambulances" on "public"."ambulances";
create policy "Public read access for ambulances"
on "public"."ambulances"
for select
using (true);

-- Insert initial data (only if empty)
insert into "public"."ambulances" 
("id", "type", "call_sign", "status", "location", "eta", "crew", "hospital", "vehicle_number", "last_maintenance", "rating")
select 
    t.id, t.type, t.call_sign, t.status, t.location, t.eta, t.crew, t.hospital, t.vehicle_number, t.last_maintenance, t.rating
from (values
(
    'amb_001',
    'advanced',
    'Medic 1',
    'available',
    st_setsrid(st_point(-122.4194, 37.7849), 4326),
    '3 mins',
    ARRAY['Paramedic John D.', 'EMT Sarah M.'],
    'City General Hospital',
    'ALS-201',
    '2026-01-05',
    4.9
),
(
    'amb_002',
    'basic',
    'Rescue 2',
    'en_route',
    st_setsrid(st_point(-122.4294, 37.7649), 4326),
    '7 mins',
    ARRAY['EMT Mike R.', 'EMT Lisa K.'],
    'St. Mary''s Medical Center',
    'BLS-105',
    '2026-01-03',
    4.7
),
(
    'amb_003',
    'critical',
    'Critical 1',
    'available',
    st_setsrid(st_point(-122.4394, 37.7549), 4326),
    '2 mins',
    ARRAY['Paramedic Dr. Amy L.', 'ICU Nurse Tom H.', 'EMT Chris P.'],
    'University Medical Center',
    'CCT-001',
    '2026-01-07',
    5.0
),
(
    'amb_004',
    'advanced',
    'Medic 3',
    'available',
    st_setsrid(st_point(-122.4100, 37.7750), 4326),
    '4 mins',
    ARRAY['Paramedic Rachel S.', 'EMT David W.'],
    'Pacific Heart Institute',
    'ALS-203',
    '2026-01-06',
    4.8
),
(
    'amb_005',
    'basic',
    'Rescue 5',
    'on_scene',
    st_setsrid(st_point(-122.4250, 37.7680), 4326),
    'N/A',
    ARRAY['EMT Kevin B.', 'EMT Maria G.'],
    'Children''s Memorial Hospital',
    'BLS-108',
    '2026-01-04',
    4.6
),
(
    'amb_006',
    'neonatal',
    'Neo 1',
    'available',
    st_setsrid(st_point(-122.4200, 37.7700), 4326),
    '5 mins',
    ARRAY['NICU Nurse Dr. Patricia M.', 'Paramedic Steve L.', 'RT Jennifer K.'],
    'Children''s Memorial Hospital',
    'NEO-001',
    '2026-01-07',
    5.0
),
(
    'amb_007',
    'critical',
    'Critical 2',
    'returning',
    st_setsrid(st_point(-122.4350, 37.7600), 4326),
    '6 mins',
    ARRAY['Paramedic Dr. Michael C.', 'ICU Nurse Anna B.', 'EMT James T.'],
    'Neurological Sciences Center',
    'CCT-002',
    '2026-01-06',
    4.9
),
(
    'amb_008',
    'advanced',
    'Medic 4',
    'available',
    st_setsrid(st_point(-122.4050, 37.7820), 4326),
    '3 mins',
    ARRAY['Paramedic Nancy W.', 'EMT Robert F.'],
    'Eastside Emergency Center',
    'ALS-204',
    '2026-01-05',
    4.7
)
) as t(id, type, call_sign, status, location, eta, crew, hospital, vehicle_number, last_maintenance, rating)
where not exists (
    select 1 from "public"."ambulances"
);
