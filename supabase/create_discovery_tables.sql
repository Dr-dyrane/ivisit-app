-- ============================================
-- CREATE DISCOVERY TABLES FOR SEARCH FEATURE
-- ============================================

-- Create trending_topics table for search feature
CREATE TABLE IF NOT EXISTS "public"."trending_topics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "query" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY ("id")
);

-- Enable RLS
ALTER TABLE "public"."trending_topics" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Public read access for trending_topics" ON "public"."trending_topics";
CREATE POLICY "Public read access for trending_topics"
ON "public"."trending_topics"
FOR SELECT
USING (true);

-- Create health_news table for search feature
CREATE TABLE IF NOT EXISTS "public"."health_news" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "url" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY ("id")
);

-- Enable RLS
ALTER TABLE "public"."health_news" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Public read access for health_news" ON "public"."health_news";
CREATE POLICY "Public read access for health_news"
ON "public"."health_news"
FOR SELECT
USING (true);

-- Seed trending topics
INSERT INTO "public"."trending_topics" 
("query", "category", "rank")
VALUES
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
ON CONFLICT DO NOTHING;

-- Seed health news
INSERT INTO "public"."health_news" 
("title", "source", "time", "icon", "url")
VALUES
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
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "trending_topics_rank_idx" ON "public"."trending_topics" ("rank");
CREATE INDEX IF NOT EXISTS "trending_topics_category_idx" ON "public"."trending_topics" ("category");
CREATE INDEX IF NOT EXISTS "health_news_created_at_idx" ON "public"."health_news" ("created_at");

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Reload schema to recognize new tables
NOTIFY pgrst, 'reload schema';

-- Verify tables were created
SELECT 'trending_topics table created successfully' as status;
SELECT 'health_news table created successfully' as status;
