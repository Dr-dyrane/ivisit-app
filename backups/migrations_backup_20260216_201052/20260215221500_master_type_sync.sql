
-- Master Type Sync Migration: Standardizing UUIDs across the Schema
-- This ensures critical foreign keys are UUIDs to prevent 'operator does not exist: uuid = text' errors in Console and App.

DO $$
BEGIN

    -- 1. Profiles: organization_id -> UUID
    -- Critical for Org Admin permissions in Console
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'organization_id' AND data_type = 'text') THEN
        ALTER TABLE public.profiles 
        ALTER COLUMN organization_id TYPE UUID USING organization_id::UUID;
    END IF;

    -- 2. Organizations: id -> UUID (Primary Key, likely already UUID but let's check)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'id' AND data_type = 'text') THEN
        ALTER TABLE public.organizations 
        ALTER COLUMN id TYPE UUID USING id::UUID;
    END IF;

    -- 3. Organization Wallets: organization_id -> UUID
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organization_wallets' AND column_name = 'organization_id' AND data_type = 'text') THEN
        ALTER TABLE public.organization_wallets 
        ALTER COLUMN organization_id TYPE UUID USING organization_id::UUID;
    END IF;

    -- 4. Wallet Ledger: organization_id -> UUID
    -- Used by walletService.js
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallet_ledger' AND column_name = 'organization_id' AND data_type = 'text') THEN
        ALTER TABLE public.wallet_ledger 
        ALTER COLUMN organization_id TYPE UUID USING organization_id::UUID;
    END IF;

    -- 5. Hospitals: organization_id -> UUID
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hospitals' AND column_name = 'organization_id' AND data_type = 'text') THEN
        ALTER TABLE public.hospitals 
        ALTER COLUMN organization_id TYPE UUID USING organization_id::UUID;
    END IF;

    -- 6. Hospitals: org_admin_id -> UUID
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hospitals' AND column_name = 'org_admin_id' AND data_type = 'text') THEN
        ALTER TABLE public.hospitals 
        ALTER COLUMN org_admin_id TYPE UUID USING org_admin_id::UUID;
    END IF;
    
    -- 7. Payments: user_id, organization_id, hospital_id -> UUID
    -- Payments table is critical for creating records
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'user_id' AND data_type = 'text') THEN
        ALTER TABLE public.payments
        ALTER COLUMN user_id TYPE UUID USING user_id::UUID;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'organization_id' AND data_type = 'text') THEN
        ALTER TABLE public.payments
        ALTER COLUMN organization_id TYPE UUID USING organization_id::UUID;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'hospital_id' AND data_type = 'text') THEN
        ALTER TABLE public.payments
        ALTER COLUMN hospital_id TYPE UUID USING hospital_id::UUID;
    END IF;

END $$;

-- 8. Refresh Schema Cache
NOTIFY pgrst, 'reload schema';
