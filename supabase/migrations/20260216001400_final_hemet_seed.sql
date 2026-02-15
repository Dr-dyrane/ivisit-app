-- 20260216001400_final_hemet_seed.sql
DO $$
DECLARE
    v_admin_id UUID;
    v_org_admin_id UUID;
    v_driver_id UUID;
    v_patient_id UUID;
    v_hospital_id UUID;
    v_ambulance_id TEXT := 'AMB-HEMET-001';
BEGIN
    -- 1. Identify Test Users (Pick the first 4)
    SELECT id INTO v_admin_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
    SELECT id INTO v_org_admin_id FROM auth.users ORDER BY created_at ASC LIMIT 1 OFFSET 1;
    SELECT id INTO v_driver_id FROM auth.users ORDER BY created_at ASC LIMIT 1 OFFSET 2;
    SELECT id INTO v_patient_id FROM auth.users ORDER BY created_at ASC LIMIT 1 OFFSET 3;

    IF v_org_admin_id IS NULL THEN
        RAISE EXCEPTION 'SEED ERROR: FEWER THAN 2 USERS IN AUTH.USERS.';
    END IF;

    -- 2. Create Organization
    INSERT INTO public.organizations (id, name, contact_email, stripe_account_id)
    VALUES (v_org_admin_id, 'Hemet Health Collective', 'hemet@example.com', 'acct_test_hemet')
    ON CONFLICT (id) DO NOTHING;

    -- 3. Create Org Wallet
    INSERT INTO public.organization_wallets (organization_id, balance, currency)
    VALUES (v_org_admin_id, 1000.00, 'USD')
    ON CONFLICT (organization_id) DO UPDATE SET balance = 1000.00;

    -- 4. Update Profiles
    UPDATE public.profiles SET role = 'admin', full_name = 'Test Admin' WHERE id = v_admin_id;
    UPDATE public.profiles SET role = 'org_admin', full_name = 'Hemet Health Manager', organization_id = v_org_admin_id WHERE id = v_org_admin_id;
    UPDATE public.profiles SET role = 'provider', full_name = 'Fast EMS Driver', assigned_ambulance_id = v_ambulance_id WHERE id = v_driver_id;
    UPDATE public.profiles SET role = 'patient', full_name = 'John Doe Patient' WHERE id = v_patient_id;

    -- 5. Create Hospital
    v_hospital_id := gen_random_uuid();
    INSERT INTO public.hospitals (
        id, name, organization_id, latitude, longitude, address, status, service_types, verified, available_beds, ambulances_count, type
    ) VALUES (
        v_hospital_id,
        'Hemet Valley Medical Center (Test)',
        v_org_admin_id,
        33.7445,
        -116.9696,
        '1117 E Devonshire Ave, Hemet, CA 92543',
        'available',
        ARRAY['ambulance', 'bed'],
        true,
        10,
        2,
        'standard'
    );

    -- 6. Create Ambulance
    INSERT INTO public.ambulances (
        id, type, status, hospital_id, organization_id, base_price, call_sign, hospital
    ) VALUES (
        v_ambulance_id,
        'basic',
        'available',
        v_hospital_id,
        v_org_admin_id,
        150.00,
        'Medic-HEMET-1',
        'Hemet Valley Medical Center (Test)'
    );

    RAISE NOTICE 'HEMET SEEDING SUCCESSFUL FOR ORG: %', v_org_admin_id;
END $$;
