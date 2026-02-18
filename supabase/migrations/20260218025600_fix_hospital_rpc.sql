-- ============================================================================
-- SAFE TYPE FIX (PART 2: HOSPITALS) — 2026-02-18
-- ============================================================================

BEGIN;

-- FIX: update_hospital_by_admin (TEXT Version)
DROP FUNCTION IF EXISTS public.update_hospital_by_admin(uuid, jsonb);
DROP FUNCTION IF EXISTS public.update_hospital_by_admin(text, jsonb);

CREATE OR REPLACE FUNCTION public.update_hospital_by_admin(
    p_hospital_id uuid, -- Renamed parameter to avoid ambiguity
    p_hospital_data jsonb
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    result jsonb;
    v_new_org_id text;
BEGIN
    IF public.get_current_user_role() != 'admin' THEN
        RAISE EXCEPTION 'Access Denied';
    END IF;

    -- Extract org ID first to avoid complex CASE inside UPDATE
    IF p_hospital_data ? 'organization_id' AND (p_hospital_data->>'organization_id') IS NOT NULL THEN
        v_new_org_id := (p_hospital_data->>'organization_id')::text;
    ELSE
        -- Perform a lookup if we need existing value? No, UPDATE handles it by not setting it.
        -- We will use COALESCE Logic inside UPDATE but refer to variable if set?
        -- Actually, standard COALESCE approach:
        v_new_org_id := NULL; -- We'll handle this in UPDATE
    END IF;

    UPDATE public.hospitals
    SET 
        name = COALESCE(p_hospital_data->>'name', name),
        -- Use COALESCE with NULLIF to handle "only update if provided"
        -- But JSONB extraction returns NULL if missing? No, user might send null.
        -- Let's stick to the CASE pattern but be cleaner.
        organization_id = CASE 
            WHEN p_hospital_data ? 'organization_id' THEN (p_hospital_data->>'organization_id')::text 
            ELSE organization_id 
        END,
        status = COALESCE(p_hospital_data->>'status', status),
        is_active = COALESCE((p_hospital_data->>'is_active')::boolean, is_active),
        updated_at = NOW()
    WHERE id = p_hospital_id
    RETURNING to_jsonb(hospitals) INTO result;

    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_hospital_by_admin(uuid, jsonb) TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
