-- Create doctors table
create table if not exists "public"."doctors" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "specialty" text not null,
    "hospital_id" uuid references "public"."hospitals"("id") on delete cascade,
    "image" text,
    "rating" double precision default 5.0,
    "reviews_count" integer default 0,
    "years_experience" integer,
    "about" text,
    "consultation_fee" text,
    "is_available" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    primary key ("id")
);

-- Enable RLS
alter table "public"."doctors" enable row level security;

-- Policies
drop policy if exists "Public read access for doctors" on "public"."doctors";
create policy "Public read access for doctors"
on "public"."doctors"
for select
using (true);

-- Seed Doctors (linking to existing hospitals by name)
insert into "public"."doctors" 
("name", "specialty", "hospital_id", "image", "rating", "reviews_count", "years_experience", "about", "consultation_fee")
select 
    d.name, d.specialty, h.id, d.image, d.rating, d.reviews_count, d.years_experience, d.about, d.consultation_fee
from "public"."hospitals" h
join (values
    ('Dr. Sarah Wilson', 'Cardiology', 'City General Hospital', 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400', 4.9, 120, 15, 'Expert in cardiovascular health and preventative care.', '$150'),
    ('Dr. James Chen', 'Orthopedics', 'City General Hospital', 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400', 4.8, 95, 12, 'Specializing in sports injuries and joint replacement.', '$200'),
    ('Dr. Emily Brown', 'Neurology', 'University Medical Center', 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400', 4.9, 200, 20, 'Leading researcher in neurological disorders.', '$250'),
    ('Dr. Michael Ross', 'Pediatrics', 'Children''s Memorial Hospital', 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400', 4.95, 300, 18, 'Compassionate care for children of all ages.', '$120'),
    ('Dr. Lisa Wong', 'Dermatology', 'St. Mary''s Medical Center', 'https://images.unsplash.com/photo-1527613426441-4da17471b66d?w=400', 4.7, 80, 8, 'Specialist in medical and cosmetic dermatology.', '$180'),
    ('Dr. Robert Taylor', 'General Surgery', 'City General Hospital', 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400', 4.85, 150, 22, 'Experienced general and laparoscopic surgeon.', '$300'),
    ('Dr. Amanda Martinez', 'Gynecology', 'Northgate Health Pavilion', 'https://images.unsplash.com/photo-1594824476961-b7aa8a1c090c?w=400', 4.9, 110, 14, 'Dedicated to women''s health and wellness.', '$160'),
    ('Dr. David Kim', 'Cardiology', 'Pacific Heart Institute', 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400', 5.0, 180, 16, 'Interventional cardiologist with a focus on heart failure.', '$280'),
    ('Dr. Jennifer Lopez', 'Pediatrics', 'Metro Health Center', 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400', 4.6, 50, 5, 'Pediatrician focused on community health.', '$100'),
    ('Dr. Thomas Anderson', 'Psychiatry', 'Presidio Health Campus', 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400', 4.8, 90, 11, 'Specializing in anxiety and depression treatment.', '$200'),
    ('Dr. Olivia White', 'Oncology', 'Oncology & Cancer Institute', 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400', 4.9, 140, 19, 'Oncologist dedicated to comprehensive cancer care.', '$220'),
    ('Dr. William Harris', 'Orthopedics', 'Golden Gate Orthopedic Center', 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400', 4.75, 105, 13, 'Orthopedic surgeon specializing in spine surgery.', '$240')
) as d(name, specialty, hospital_name, image, rating, reviews_count, years_experience, about, consultation_fee)
on h.name = d.hospital_name
where not exists (select 1 from "public"."doctors" where name = d.name);

-- Add more Hospitals
insert into "public"."hospitals" 
("name", "address", "phone", "rating", "type", "image", "specialties", "service_types", "features", "emergency_level", "available_beds", "ambulances_count", "wait_time", "price_range", "latitude", "longitude", "verified", "status")
values
(
    'Westside Medical Plaza',
    '880 Ocean Blvd',
    '+1-555-0880',
    4.5,
    'standard',
    'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=400',
    ARRAY['General Care', 'Family Medicine'],
    ARRAY['standard'],
    ARRAY['Walk-in', 'Lab'],
    'Community Hospital',
    4,
    1,
    '10 mins',
    '$90',
    37.7600,
    -122.5000,
    true,
    'available'
),
(
    'Oakland Trauma Center',
    '400 Broadway',
    '+1-555-0400',
    4.7,
    'premium',
    'https://images.unsplash.com/photo-1632833239869-a37e3a5806d2?w=400',
    ARRAY['Trauma', 'Emergency', 'Surgery'],
    ARRAY['premium', 'standard'],
    ARRAY['Level 1 Trauma', 'Helipad'],
    'Level 1 Trauma Center',
    10,
    5,
    '15 mins',
    '$180',
    37.8044,
    -122.2711,
    true,
    'busy'
);

-- Add more Ambulances
insert into "public"."ambulances" 
("id", "type", "call_sign", "status", "location", "eta", "crew", "hospital", "vehicle_number", "last_maintenance", "rating")
values
(
    'amb_009',
    'basic',
    'Rescue 9',
    'available',
    st_setsrid(st_point(-122.4500, 37.7700), 4326),
    '5 mins',
    ARRAY['EMT Joe D.', 'EMT Sue F.'],
    'Westside Medical Plaza',
    'BLS-301',
    '2026-01-08',
    4.5
),
(
    'amb_010',
    'advanced',
    'Medic 10',
    'en_route',
    st_setsrid(st_point(-122.2700, 37.8000), 4326),
    '10 mins',
    ARRAY['Paramedic Dan B.', 'EMT Alice C.'],
    'Oakland Trauma Center',
    'ALS-401',
    '2026-01-08',
    4.8
);

-- Reload schema to recognize new tables/data
NOTIFY pgrst, 'reload schema';
