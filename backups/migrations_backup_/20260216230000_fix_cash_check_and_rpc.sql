-- Migration: Fix Cash Eligibility Check and Add Pricing CRUD RPC
-- Author: Antigravity
-- Date: 2026-02-16

-- 1. Overload check_cash_eligibility to handle TEXT organization_id (Fixes 42882 error)
CREATE OR REPLACE FUNCTION public.check_cash_eligibility(
    p_organization_id TEXT,
    p_estimated_amount DECIMAL
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.check_cash_eligibility(p_organization_id::UUID, p_estimated_amount);
EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create upsert_pricing_item RPC for flexible Pricing Management
-- Handles both service_pricing and room_pricing base tables? 
-- Actually, let's target service_pricing first as it's the more complex one.
-- Or better, create a unified one if possible.
-- User asked for: "Admin updates ones they created, org ones they created, admin can't mutate org admins ones"

CREATE OR REPLACE FUNCTION public.upsert_service_pricing(
    p_id UUID,
    p_service_name TEXT,
    p_base_price DECIMAL,
    p_unit TEXT,
    p_category TEXT,
    p_organization_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
    v_user_role TEXT;
    v_user_org_id UUID;
    v_existing_org_id UUID;
BEGIN
    -- Get current user context
    SELECT role, organization_id INTO v_user_role, v_user_org_id 
    FROM public.profiles 
    WHERE id = auth.uid();

    -- Check existing record if editing
    IF p_id IS NOT NULL THEN
        SELECT organization_id INTO v_existing_org_id 
        FROM public.service_pricing 
        WHERE id = p_id;

        -- RULE: Admin cannot mutate Org-created items
        IF v_user_role = 'admin' AND v_existing_org_id IS NOT NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'Admins cannot mutate organization-specific overrides.');
        END IF;

        -- RULE: Org Admin can only mutate their own items or create override (handled by upsert logic)
        IF v_user_role = 'org_admin' AND v_existing_org_id IS NOT NULL AND v_existing_org_id != v_user_org_id THEN
            RETURN jsonb_build_object('success', false, 'error', 'Permission denied: Cannot edit another organization''s pricing.');
        END IF;
    END IF;

    -- Upsert logic
    INSERT INTO public.service_pricing (
        id,
        service_name,
        base_price,
        unit,
        category,
        organization_id,
        metadata,
        updated_at
    ) VALUES (
        COALESCE(p_id, gen_random_uuid()),
        p_service_name,
        p_base_price,
        p_unit,
        p_category,
        CASE 
            WHEN v_user_role = 'admin' THEN NULL -- Admin always creates/edits Global
            ELSE v_user_org_id -- Org Admin creates/edits Org-specific
        END,
        p_metadata,
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        service_name = EXCLUDED.service_name,
        base_price = EXCLUDED.base_price,
        unit = EXCLUDED.unit,
        category = EXCLUDED.category,
        metadata = EXCLUDED.metadata,
        updated_at = NOW();

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Add Delete RPC with same permission rules
CREATE OR REPLACE FUNCTION public.delete_service_pricing(p_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_user_role TEXT;
    v_user_org_id UUID;
    v_existing_org_id UUID;
BEGIN
    SELECT role, organization_id INTO v_user_role, v_user_org_id 
    FROM public.profiles 
    WHERE id = auth.uid();

    SELECT organization_id INTO v_existing_org_id 
    FROM public.service_pricing 
    WHERE id = p_id;

    IF v_user_role = 'admin' AND v_existing_org_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Admins cannot delete organization-specific overrides.');
    END IF;

    IF v_user_role = 'org_admin' AND (v_existing_org_id IS NULL OR v_existing_org_id != v_user_org_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Permission denied: Can only delete your own organization''s pricing.');
    END IF;

    DELETE FROM public.service_pricing WHERE id = p_id;
    
    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.check_cash_eligibility(TEXT, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_service_pricing(UUID, TEXT, DECIMAL, TEXT, TEXT, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_service_pricing(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
