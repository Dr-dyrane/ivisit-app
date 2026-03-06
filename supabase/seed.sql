-- Seed data entrypoint for Supabase CLI
--
-- This file is referenced by supabase/config.toml:
--   [db.seed]
--   sql_paths = ["./seed.sql"]
--
-- It should be safe to re-run. Use idempotent inserts where possible.

-- Note: Demo data is currently loaded via migration 20260110000000_seed_rich_public_data.sql
-- The \ir command is not supported by the Supabase CLI reset command when sent as a batch.

-- ---------------------------------------------------------------------------
-- Baseline Emergency Pricing + Room Catalog (Request Modal fallback support)
-- Context:
-- - EmergencyRequestModal reads `service_pricing` for ambulance options
-- - EmergencyRequestModal reads `room_pricing` for virtual bed-room fallback
-- - calculate_emergency_cost_v2 has safer service-type defaults, but seeded rows make
--   pricing visible and customizable per hospital instead of relying on hardcoded fallbacks.
-- ---------------------------------------------------------------------------

-- 1) Global fallback service pricing rows (used by UI queries that include hospital_id IS NULL)
WITH service_defaults AS (
    SELECT *
    FROM (VALUES
        ('ambulance',   'Emergency Ambulance Dispatch', 150.00::NUMERIC, 'Baseline fallback ambulance dispatch pricing'),
        ('bed',         'Emergency Bed Reservation',    200.00::NUMERIC, 'Baseline fallback emergency bed reservation pricing'),
        ('bed_booking', 'Emergency Bed Booking',        200.00::NUMERIC, 'Legacy-compatible bed booking pricing fallback')
    ) AS t(service_type, service_name, base_price, description)
)
UPDATE public.service_pricing sp
SET
    service_name = d.service_name,
    base_price = CASE WHEN COALESCE(sp.base_price, 0) <= 0 THEN d.base_price ELSE sp.base_price END,
    description = COALESCE(NULLIF(sp.description, ''), d.description),
    updated_at = NOW()
FROM service_defaults d
WHERE sp.hospital_id IS NULL
  AND sp.service_type = d.service_type;

WITH service_defaults AS (
    SELECT *
    FROM (VALUES
        ('ambulance',   'Emergency Ambulance Dispatch', 150.00::NUMERIC, 'Baseline fallback ambulance dispatch pricing'),
        ('bed',         'Emergency Bed Reservation',    200.00::NUMERIC, 'Baseline fallback emergency bed reservation pricing'),
        ('bed_booking', 'Emergency Bed Booking',        200.00::NUMERIC, 'Legacy-compatible bed booking pricing fallback')
    ) AS t(service_type, service_name, base_price, description)
)
INSERT INTO public.service_pricing (hospital_id, service_type, service_name, base_price, description)
SELECT
    NULL,
    d.service_type,
    d.service_name,
    d.base_price,
    d.description
FROM service_defaults d
WHERE NOT EXISTS (
    SELECT 1
    FROM public.service_pricing sp
    WHERE sp.hospital_id IS NULL
      AND sp.service_type = d.service_type
);

-- 2) Per-hospital baseline service pricing rows (only fills missing/zero values)
WITH service_defaults AS (
    SELECT *
    FROM (VALUES
        ('ambulance',   'Emergency Ambulance Dispatch', 150.00::NUMERIC, 'Baseline hospital ambulance dispatch pricing'),
        ('bed',         'Emergency Bed Reservation',    200.00::NUMERIC, 'Baseline hospital emergency bed reservation pricing'),
        ('bed_booking', 'Emergency Bed Booking',        200.00::NUMERIC, 'Legacy-compatible hospital bed booking pricing')
    ) AS t(service_type, service_name, base_price, description)
)
INSERT INTO public.service_pricing (hospital_id, service_type, service_name, base_price, description)
SELECT
    h.id,
    d.service_type,
    d.service_name,
    d.base_price,
    d.description
FROM public.hospitals h
CROSS JOIN service_defaults d
ON CONFLICT (hospital_id, service_type)
DO UPDATE SET
    service_name = COALESCE(NULLIF(service_pricing.service_name, ''), EXCLUDED.service_name),
    base_price = CASE
        WHEN COALESCE(service_pricing.base_price, 0) <= 0 THEN EXCLUDED.base_price
        ELSE service_pricing.base_price
    END,
    description = COALESCE(NULLIF(service_pricing.description, ''), EXCLUDED.description),
    updated_at = NOW();

-- 3) Global fallback room pricing rows (used by UI virtual room fallback when hospital_rooms missing/empty)
WITH room_defaults AS (
    SELECT *
    FROM (VALUES
        ('general',      'General Ward',        150.00::NUMERIC, 'Shared ward bed with nursing supervision'),
        ('standard',     'Standard Bed',        150.00::NUMERIC, 'Standard emergency admission bed'),
        ('semi_private', 'Semi-Private Room',   250.00::NUMERIC, 'Shared room with reduced occupancy'),
        ('private',      'Private Room',        350.00::NUMERIC, 'Private room with dedicated space'),
        ('icu',          'ICU Bed',             500.00::NUMERIC, 'Intensive care bed (critical monitoring)')
    ) AS t(room_type, room_name, price_per_night, description)
)
UPDATE public.room_pricing rp
SET
    room_name = d.room_name,
    price_per_night = CASE WHEN COALESCE(rp.price_per_night, 0) <= 0 THEN d.price_per_night ELSE rp.price_per_night END,
    description = COALESCE(NULLIF(rp.description, ''), d.description),
    updated_at = NOW()
FROM room_defaults d
WHERE rp.hospital_id IS NULL
  AND rp.room_type = d.room_type;

WITH room_defaults AS (
    SELECT *
    FROM (VALUES
        ('general',      'General Ward',        150.00::NUMERIC, 'Shared ward bed with nursing supervision'),
        ('standard',     'Standard Bed',        150.00::NUMERIC, 'Standard emergency admission bed'),
        ('semi_private', 'Semi-Private Room',   250.00::NUMERIC, 'Shared room with reduced occupancy'),
        ('private',      'Private Room',        350.00::NUMERIC, 'Private room with dedicated space'),
        ('icu',          'ICU Bed',             500.00::NUMERIC, 'Intensive care bed (critical monitoring)')
    ) AS t(room_type, room_name, price_per_night, description)
)
INSERT INTO public.room_pricing (hospital_id, room_type, room_name, price_per_night, description)
SELECT
    NULL,
    d.room_type,
    d.room_name,
    d.price_per_night,
    d.description
FROM room_defaults d
WHERE NOT EXISTS (
    SELECT 1
    FROM public.room_pricing rp
    WHERE rp.hospital_id IS NULL
      AND rp.room_type = d.room_type
);

-- 4) Per-hospital baseline room pricing rows (only fills missing/zero values)
WITH room_defaults AS (
    SELECT *
    FROM (VALUES
        ('general',      'General Ward',        150.00::NUMERIC, 'Shared ward bed with nursing supervision'),
        ('standard',     'Standard Bed',        150.00::NUMERIC, 'Standard emergency admission bed'),
        ('semi_private', 'Semi-Private Room',   250.00::NUMERIC, 'Shared room with reduced occupancy'),
        ('private',      'Private Room',        350.00::NUMERIC, 'Private room with dedicated space'),
        ('icu',          'ICU Bed',             500.00::NUMERIC, 'Intensive care bed (critical monitoring)')
    ) AS t(room_type, room_name, price_per_night, description)
)
INSERT INTO public.room_pricing (hospital_id, room_type, room_name, price_per_night, description)
SELECT
    h.id,
    d.room_type,
    d.room_name,
    d.price_per_night,
    d.description
FROM public.hospitals h
CROSS JOIN room_defaults d
ON CONFLICT (hospital_id, room_type)
DO UPDATE SET
    room_name = COALESCE(NULLIF(room_pricing.room_name, ''), EXCLUDED.room_name),
    price_per_night = CASE
        WHEN COALESCE(room_pricing.price_per_night, 0) <= 0 THEN EXCLUDED.price_per_night
        ELSE room_pricing.price_per_night
    END,
    description = COALESCE(NULLIF(room_pricing.description, ''), EXCLUDED.description),
    updated_at = NOW();

-- ---------------------------------------------------------------------------
-- Baseline Support FAQ catalog (Help & Support screen parity)
-- Context:
-- - HelpSupportScreen reads support_faqs ordered by rank ASC.
-- - If DB has zero FAQ rows, app falls back to constants/faqs.js.
-- - Seed canonical DB FAQs so first-run and reset environments match app UI copy.
-- ---------------------------------------------------------------------------

WITH faq_defaults AS (
    SELECT *
    FROM (VALUES
        ('How do I update my medical profile?', 'Go to the ''More'' tab and select ''Medical Profile''. You can update your blood type, allergies, and chronic conditions there. Changes are saved immediately and synced with emergency responders.', 'Account', 1),
        ('What happens when I press SOS?', 'When you activate SOS, we immediately alert nearby ambulances and your emergency contacts. Your location and medical profile are shared securely with responders to ensure the fastest possible care.', 'Emergency', 2),
        ('Who can see my medical data?', 'Your data is private by default. We only share your critical medical info (blood type, allergies) with verified emergency responders during an active SOS request. You can manage these permissions in Settings > Privacy.', 'Privacy', 3),
        ('Do you accept my insurance?', 'iVisit partners with major insurance providers. You can add your insurance details in the ''Insurance'' section under the ''More'' tab. We''ll automatically check eligibility for ambulance rides and hospital visits.', 'Billing', 4),
        ('How do I reset my password?', 'If you''re logged out, tap ''Forgot Password'' on the login screen. If you''re logged in, go to Settings > Account Security to change your password.', 'Account', 5)
    ) AS t(question, answer, category, rank)
),
updated_rows AS (
    UPDATE public.support_faqs f
    SET
        answer = d.answer,
        category = d.category,
        rank = d.rank
    FROM faq_defaults d
    WHERE lower(trim(f.question)) = lower(trim(d.question))
    RETURNING f.id
)
INSERT INTO public.support_faqs (question, answer, category, rank)
SELECT
    d.question,
    d.answer,
    d.category,
    d.rank
FROM faq_defaults d
WHERE NOT EXISTS (
    SELECT 1
    FROM public.support_faqs f
    WHERE lower(trim(f.question)) = lower(trim(d.question))
);
