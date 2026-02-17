-- Migration: Room Pricing CRUD RPCs
-- Adds upsert and delete functions for room_pricing with role-based checks

-- 1. Upsert Function
CREATE OR REPLACE FUNCTION public.upsert_room_pricing(
    p_id UUID,
    p_room_name TEXT,
    p_room_type TEXT,
    p_price_per_night DECIMAL,
    p_currency TEXT DEFAULT 'USD',
    p_description TEXT DEFAULT NULL,
    p_organization_id UUID DEFAULT NULL
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
        FROM public.room_pricing 
        WHERE id = p_id;

        -- RULE: Admin cannot mutate Org-created items
        IF v_user_role = 'admin' AND v_existing_org_id IS NOT NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'Admins cannot mutate organization-specific room overrides.');
        END IF;

        -- RULE: Org Admin can only mutate their own items
        IF v_user_role = 'org_admin' AND v_existing_org_id IS NOT NULL AND v_existing_org_id != v_user_org_id THEN
            RETURN jsonb_build_object('success', false, 'error', 'Permission denied: Cannot edit another organization''s room pricing.');
        END IF;
    END IF;

    -- Upsert logic
    INSERT INTO public.room_pricing (
        id,
        room_name,
        room_type,
        price_per_night,
        currency,
        description,
        organization_id,
        updated_at
    ) VALUES (
        COALESCE(p_id, gen_random_uuid()),
        p_room_name,
        p_room_type,
        p_price_per_night,
        p_currency,
        p_description,
        CASE 
            WHEN v_user_role = 'admin' THEN NULL 
            ELSE v_user_org_id 
        END,
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        room_name = EXCLUDED.room_name,
        room_type = EXCLUDED.room_type,
        price_per_night = EXCLUDED.price_per_night,
        description = EXCLUDED.description,
        updated_at = NOW();

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Delete Function
CREATE OR REPLACE FUNCTION public.delete_room_pricing(p_id UUID)
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
    FROM public.room_pricing 
    WHERE id = p_id;

    IF v_user_role = 'admin' AND v_existing_org_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Admins cannot delete organization-specific room overrides.');
    END IF;

    IF v_user_role = 'org_admin' AND (v_existing_org_id IS NULL OR v_existing_org_id != v_user_org_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Permission denied: Can only delete your own organization''s room pricing.');
    END IF;

    DELETE FROM public.room_pricing WHERE id = p_id;
    
    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permissions
GRANT EXECUTE ON FUNCTION public.upsert_room_pricing(UUID, TEXT, TEXT, DECIMAL, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_room_pricing(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
