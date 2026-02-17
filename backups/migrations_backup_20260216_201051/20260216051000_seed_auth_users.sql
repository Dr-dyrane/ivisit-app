-- Phase 8: Golden Path Seeding (Part 1: Auth Users)
-- Hybrid Strategy: SQL for Auth (to allow fixed UUIDs), JS for Public Data (to handle types).

-- Hardcoded Hash for 'password123' (generated via bcryptjs):
-- $2b$10$Q7xtF8Fg1b.zP2mKwp7oUuaiWHWEhHnEC3zE5v1JQptanB2TU4N9m

DO $$
DECLARE
    v_admin_id UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12';
    v_doctor_id UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13';
    v_driver_id UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15';
    v_patient_id UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17';
    
    v_admin_email TEXT := 'manager@hemet.com';
    v_doctor_email TEXT := 'dr.dyrane@hemet.com';
    v_driver_email TEXT := 'driver@hemet.com';
    v_patient_email TEXT := 'patient@test.com';
    
    v_password_hash TEXT := '$2b$10$Q7xtF8Fg1b.zP2mKwp7oUuaiWHWEhHnEC3zE5v1JQptanB2TU4N9m';
BEGIN

    -- Admin
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = v_admin_email) THEN
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
        VALUES (v_admin_id, v_admin_email, v_password_hash, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Hemet Manager"}', 'authenticated', 'authenticated');
    END IF;

    -- Doctor
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = v_doctor_email) THEN
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
        VALUES (v_doctor_id, v_doctor_email, v_password_hash, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Dr. Dyrane"}', 'authenticated', 'authenticated');
    END IF;

    -- Driver
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = v_driver_email) THEN
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
        VALUES (v_driver_id, v_driver_email, v_password_hash, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Fast EMS Driver"}', 'authenticated', 'authenticated');
    END IF;

    -- Patient
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = v_patient_email) THEN
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
        VALUES (v_patient_id, v_patient_email, v_password_hash, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Patient Zero"}', 'authenticated', 'authenticated');
    END IF;

END $$;
