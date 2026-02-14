
-- 1. Create a Test Organization (if not exists)
INSERT INTO public.organizations (name, ivisit_fee_percentage, is_active)
VALUES ('Hemet General Org', 2.5, true)
ON CONFLICT (stripe_account_id) DO NOTHING;

-- Get the ID we just created/found
DO $$
DECLARE
    v_org_id UUID;
    v_hospital_id UUID;
    v_user_id UUID;
BEGIN
    SELECT id INTO v_org_id FROM public.organizations WHERE name = 'Hemet General Org' LIMIT 1;

    -- 2. Seed a Test Wallet with Balance (So Cash option is enabled)
    INSERT INTO public.organization_wallets (organization_id, balance, currency)
    VALUES (v_org_id, 500.00, 'USD') -- $500 Balance to cover fees
    ON CONFLICT (organization_id) 
    DO UPDATE SET balance = 500.00;

    -- 3. Create/Update a Hospital covering Hemet
    INSERT INTO public.hospitals (
        name, 
        organization_id, 
        latitude, 
        longitude, 
        address, 
        status,
        emergency_services
    )
    VALUES (
        'Hemet Valley Medical Center',
        v_org_id,
        33.753201,  -- Near Corinto Ct
        -116.995314, 
        '2235 Corinto Court, Hemet, CA',
        'active',
        ARRAY['ambulance', 'bed']
    )
    ON CONFLICT (name) DO UPDATE SET 
        organization_id = v_org_id,
        latitude = 33.753201,
        longitude = -116.995314;
        
    -- 4. (Optional) Ensure there is a test user if needed, 
    -- but usually you create this via Auth in the app.
END $$;
