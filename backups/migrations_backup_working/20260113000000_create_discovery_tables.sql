-- Create trending_topics table for search feature
create table if not exists "public"."trending_topics" (
    "id" uuid not null default gen_random_uuid(),
    "query" text not null,
    "category" text not null,
    "rank" integer not null,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    primary key ("id")
);

-- Enable RLS
alter table "public"."trending_topics" enable row level security;

-- Policies
drop policy if exists "Public read access for trending_topics" on "public"."trending_topics";
create policy "Public read access for trending_topics"
on "public"."trending_topics"
for select
using (true);

-- Create health_news table for search feature
create table if not exists "public"."health_news" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "source" text not null,
    "time" text not null,
    "icon" text not null,
    "url" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    primary key ("id")
);

-- Enable RLS
alter table "public"."health_news" enable row level security;

-- Policies
drop policy if exists "Public read access for health_news" on "public"."health_news";
create policy "Public read access for health_news"
on "public"."health_news"
for select
using (true);

-- Seed trending topics
insert into "public"."trending_topics" 
("query", "category", "rank")
values
('Cardiologists near me', 'Trending in Lagos', 1),
('Yellow Fever Vaccine', 'Health Alerts', 2),
('24/7 Pharmacies', 'Most Searched', 3),
('Pediatricians', 'Popular', 4),
('Mental Health Services', 'Trending', 5),
('COVID-19 Testing Centers', 'Health Alerts', 6),
('Dental Clinics', 'Popular', 7),
('Eye Specialists', 'Trending', 8),
('Physical Therapy', 'Most Searched', 9),
('Emergency Rooms', 'Popular', 10)
on conflict do nothing;

-- Seed health news
insert into "public"."health_news" 
("title", "source", "time", "icon", "url")
values
('New ICU Wing at Reddington', 'Hospital Update', '2h ago', 'business-outline', 'https://example.com/icu-wing'),
('Free Dental Checkups this Saturday', 'Public Health', '5h ago', 'medical-outline', 'https://example.com/dental-checkup'),
('Flu Season Peak: Stay Protected', 'Health Alert', '1d ago', 'alert-circle-outline', 'https://example.com/flu-season'),
('Breakthrough in Cancer Treatment', 'Medical Research', '2d ago', 'flask-outline', 'https://example.com/cancer-research'),
('New Mental Health Hotline Launched', 'Community News', '3d ago', 'call-outline', 'https://example.com/mental-health'),
('Pediatric Vaccination Drive', 'Public Health', '4d ago', 'shield-checkmark-outline', 'https://example.com/vaccination'),
('Heart Health Awareness Month', 'Health Campaign', '5d ago', 'heart-outline', 'https://example.com/heart-health'),
('Telemedicine Services Expanded', 'Healthcare News', '1w ago', 'videocam-outline', 'https://example.com/telemedicine'),
('New Hospital Opening in Ikeja', 'Hospital Update', '1w ago', 'business-outline', 'https://example.com/new-hospital'),
('Blood Donation Drive This Weekend', 'Community News', '2w ago', 'water-outline', 'https://example.com/blood-donation')
on conflict do nothing;

-- Create indexes for better performance
create index if not exists "trending_topics_rank_idx" on "public"."trending_topics" ("rank");
create index if not exists "trending_topics_category_idx" on "public"."trending_topics" ("category");
create index if not exists "health_news_created_at_idx" on "public"."health_news" ("created_at");

-- Reload schema to recognize new tables
NOTIFY pgrst, 'reload schema';
