-- Migration: Enhanced Wallet Intelligence Trigger
-- Handles Platform Top-ups and preserves full amount for Top-up transactions.

CREATE OR REPLACE FUNCTION process_payment_with_ledger()
RETURNS TRIGGER AS $$
DECLARE
    v_organization_id UUID;
    v_fee_amount DECIMAL;
    v_organization_amount DECIMAL;
    v_fee_rate DECIMAL;
    v_main_wallet_id UUID;
    v_org_wallet_id UUID;
    v_already_credited BOOLEAN;
    v_is_top_up BOOLEAN;
BEGIN
    -- 1. Identify context
    v_already_credited := (NEW.metadata->>'ledger_credited')::boolean;
    v_is_top_up := (NEW.metadata->>'is_top_up')::boolean;
    
    -- Link from Emergency Request -> Hospital -> Organization if missing
    IF NEW.organization_id IS NULL AND NEW.emergency_request_id IS NOT NULL THEN
        SELECT h.organization_id INTO v_organization_id
        FROM public.emergency_requests er
        JOIN public.hospitals h ON er.hospital_id = h.id::text
        WHERE er.id = NEW.emergency_request_id;
        NEW.organization_id := v_organization_id;
    END IF;

    -- 2. Financial logic ONLY on status 'completed' and not already credited
    IF NEW.status = 'completed' AND COALESCE(v_already_credited, false) = false THEN
        
        -- Start Process
        NEW.metadata := jsonb_set(COALESCE(NEW.metadata, '{}'::jsonb), '{ledger_credited}', 'true');
        SELECT id INTO v_main_wallet_id FROM public.ivisit_main_wallet LIMIT 1;

        -- CASE A: Platform Top-Up (Directly funding the iVisit main wallet)
        IF NEW.organization_id IS NULL AND v_is_top_up THEN
            UPDATE public.ivisit_main_wallet 
            SET balance = balance + NEW.amount, last_updated = NOW() 
            WHERE id = v_main_wallet_id;

            INSERT INTO public.wallet_ledger (
                wallet_type, wallet_id, organization_id, amount, 
                transaction_type, description, reference_id, reference_type
            ) VALUES (
                'main', v_main_wallet_id, NULL, NEW.amount,
                'credit', 'Platform top-up via ' || NEW.transaction_id, NEW.id, 'adjustment'
            );

        -- CASE B: Organization Top-Up (Directly funding an organization wallet, no 2.5% fee)
        ELSIF NEW.organization_id IS NOT NULL AND v_is_top_up THEN
            INSERT INTO public.organization_wallets (organization_id, balance)
            VALUES (NEW.organization_id, NEW.amount)
            ON CONFLICT (organization_id) 
            DO UPDATE SET balance = organization_wallets.balance + NEW.amount, updated_at = NOW()
            RETURNING id INTO v_org_wallet_id;

            INSERT INTO public.wallet_ledger (
                wallet_type, wallet_id, organization_id, amount, 
                transaction_type, description, reference_id, reference_type
            ) VALUES (
                'organization', v_org_wallet_id, NEW.organization_id, NEW.amount,
                'credit', 'Organization top-up via ' || NEW.transaction_id, NEW.id, 'adjustment'
            );

        -- CASE C: Standard Service Payment (Applies 2.5% platform fee)
        ELSIF NEW.organization_id IS NOT NULL THEN
            -- Calculate Fees
            SELECT ivisit_fee_percentage INTO v_fee_rate FROM public.organizations WHERE id = NEW.organization_id;
            v_fee_rate := COALESCE(v_fee_rate, 2.5);
            v_fee_amount := (NEW.amount * v_fee_rate) / 100;
            v_organization_amount := NEW.amount - v_fee_amount;
            
            NEW.organization_fee_rate := v_fee_rate;
            NEW.ivisit_deduction_amount := v_fee_amount;
            
            -- Credit Organization Wallet
            INSERT INTO public.organization_wallets (organization_id, balance)
            VALUES (NEW.organization_id, v_organization_amount)
            ON CONFLICT (organization_id) 
            DO UPDATE SET balance = organization_wallets.balance + v_organization_amount, updated_at = NOW()
            RETURNING id INTO v_org_wallet_id;
            
            INSERT INTO public.wallet_ledger (
                wallet_type, wallet_id, organization_id, amount, 
                transaction_type, description, reference_id, reference_type
            ) VALUES (
                'organization', v_org_wallet_id, NEW.organization_id, v_organization_amount,
                'credit', 'Service payment ' || NEW.id, NEW.id, 'payment'
            );
            
            -- Credit Platform Wallet (Fee)
            UPDATE public.ivisit_main_wallet 
            SET balance = balance + v_fee_amount, last_updated = NOW() 
            WHERE id = v_main_wallet_id;
            
            INSERT INTO public.wallet_ledger (
                wallet_type, wallet_id, organization_id, amount, 
                transaction_type, description, reference_id, reference_type
            ) VALUES (
                'main', v_main_wallet_id, NULL, v_fee_amount,
                'credit', 'Fee from transaction ' || NEW.id, NEW.id, 'payment'
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
