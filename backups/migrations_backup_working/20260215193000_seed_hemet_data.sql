
-- Data seed for 2235 Corinto Court Test
DO $$
DECLARE
    v_org_id UUID;
BEGIN
    -- 1. Create Organization (Idempotent check by stripe_account_id)
    SELECT id INTO v_org_id FROM public.organizations WHERE stripe_account_id = 'acct_test_hemet';
    
    IF v_org_id IS NULL THEN
        INSERT INTO public.organizations (name, ivisit_fee_percentage, is_active, stripe_account_id)
        VALUES ('Hemet General Org', 2.5, true, 'acct_test_hemet')
        RETURNING id INTO v_org_id;
    END IF;

    -- 2. Seed Wallet with $500
    INSERT INTO public.organization_wallets (organization_id, balance, currency)
    VALUES (v_org_id, 500.00, 'USD')
    ON CONFLICT (organization_id)
    DO UPDATE SET balance = 500.00;

    -- 3. Create Hospital at User Location
    -- We delete any existing hospital with this name to ensure clean state
    DELETE FROM public.hospitals WHERE name = 'Hemet Valley Medical Center';
    
    INSERT INTO public.hospitals (
        name,
        organization_id,
        latitude,
        longitude,
        address,
        status,
        service_types,
        verified,            -- Added verified
        available_beds,      -- Added beds
        ambulances_count     -- Added ambulances
    )
    VALUES (
        'Hemet Valley Medical Center',
        v_org_id,
        33.753201,
        -116.995314,
        '2235 Corinto Court, Hemet, CA',
        'available',         -- Changed from 'active' to 'available' to match RPC filter
        ARRAY['ambulance', 'bed'],
        true,                -- Set verified = true to match RPC filter
        10,                  -- Default beds
        2                    -- Default ambulances
    );
END $$;
