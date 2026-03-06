-- SCC-061: Harden non-cash payment distribution for card/wallet flows.
-- Skip top-ups/platform-only payments and ensure missing wallets do not break updates.

CREATE OR REPLACE FUNCTION public.process_payment_distribution()
RETURNS TRIGGER AS $$
DECLARE
    v_org_wallet_id UUID;
    v_platform_wallet_id UUID;
    v_net_amount NUMERIC := 0;
    v_fee_amount NUMERIC := 0;
    v_is_top_up BOOLEAN := false;
BEGIN
    IF NEW.status IS DISTINCT FROM 'completed' THEN
        RETURN NEW;
    END IF;

    IF COALESCE(OLD.status, '') = 'completed' THEN
        RETURN NEW;
    END IF;

    IF COALESCE(NEW.payment_method, '') = 'cash' THEN
        RETURN NEW;
    END IF;

    v_is_top_up := COALESCE((NEW.metadata->>'is_top_up')::BOOLEAN, false);

    -- Platform top-ups and payments without destination org do not feed org/platform settlement wallets.
    IF v_is_top_up OR NEW.organization_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT id INTO v_org_wallet_id
    FROM public.organization_wallets
    WHERE organization_id = NEW.organization_id
    LIMIT 1
    FOR UPDATE;

    IF v_org_wallet_id IS NULL THEN
        INSERT INTO public.organization_wallets (organization_id, balance, currency, created_at, updated_at)
        VALUES (
            NEW.organization_id,
            0,
            COALESCE(NULLIF(NEW.currency, ''), 'USD'),
            NOW(),
            NOW()
        )
        RETURNING id INTO v_org_wallet_id;
    END IF;

    SELECT id INTO v_platform_wallet_id
    FROM public.ivisit_main_wallet
    LIMIT 1
    FOR UPDATE;

    IF v_platform_wallet_id IS NULL THEN
        INSERT INTO public.ivisit_main_wallet (balance, currency, last_updated)
        VALUES (
            0,
            COALESCE(NULLIF(NEW.currency, ''), 'USD'),
            NOW()
        )
        RETURNING id INTO v_platform_wallet_id;
    END IF;

    v_fee_amount := GREATEST(ROUND(COALESCE(NEW.ivisit_fee_amount, 0)::NUMERIC, 2), 0);
    v_net_amount := GREATEST(ROUND(COALESCE(NEW.amount, 0)::NUMERIC - v_fee_amount, 2), 0);

    IF v_net_amount > 0 THEN
        UPDATE public.organization_wallets
        SET balance = COALESCE(balance, 0) + v_net_amount,
            updated_at = NOW()
        WHERE id = v_org_wallet_id;

        INSERT INTO public.wallet_ledger (
            wallet_id,
            amount,
            transaction_type,
            description,
            reference_id,
            metadata,
            created_at
        )
        VALUES (
            v_org_wallet_id,
            v_net_amount,
            'credit',
            'Service Payment (Net)',
            NEW.id,
            jsonb_build_object(
                'source', 'process_payment_distribution',
                'payment_method', COALESCE(NEW.payment_method, 'unknown'),
                'ivisit_fee_amount', v_fee_amount
            ),
            COALESCE(NEW.processed_at, NEW.updated_at, NEW.created_at, NOW())
        );
    END IF;

    IF v_fee_amount > 0 THEN
        UPDATE public.ivisit_main_wallet
        SET balance = COALESCE(balance, 0) + v_fee_amount,
            last_updated = NOW()
        WHERE id = v_platform_wallet_id;

        INSERT INTO public.wallet_ledger (
            wallet_id,
            amount,
            transaction_type,
            description,
            reference_id,
            metadata,
            created_at
        )
        VALUES (
            v_platform_wallet_id,
            v_fee_amount,
            'credit',
            'Platform Fee',
            NEW.id,
            jsonb_build_object(
                'source', 'process_payment_distribution',
                'payment_method', COALESCE(NEW.payment_method, 'unknown')
            ),
            COALESCE(NEW.processed_at, NEW.updated_at, NEW.created_at, NOW())
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
