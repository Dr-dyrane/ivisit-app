-- Migration: Wallet Ledger Foreign Key Fix
-- Adds the missing foreign key relationship between wallet_ledger and organizations

BEGIN;

-- 1. Ensure foreign key exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'wallet_ledger_organization_id_fkey' 
        AND table_name = 'wallet_ledger'
    ) THEN
        ALTER TABLE public.wallet_ledger
        ADD CONSTRAINT wallet_ledger_organization_id_fkey
        FOREIGN KEY (organization_id)
        REFERENCES public.organizations(id)
        ON DELETE SET NULL;
    END IF;
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';
