-- 1. Ensure schema supports organization overrides
ALTER TABLE public.service_pricing ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.room_pricing ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- 2. Seed Organizations for existing IDs found in the logs
INSERT INTO public.organizations (id, name, is_active)
VALUES 
    ('af9b6856-59e3-442d-94af-e39a8a261818', 'Hemet Health Network', true),
    ('8c7481ef-345a-4083-a9f1-9aae57e13d18', 'Verified Partner A', true),
    ('75855dbd-2cb0-4309-bbae-232cb5b40be9', 'Verified Partner B', true),
    ('fe73f827-35e5-4f85-a059-0fbca019bfe7', 'Random Partner X', true),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a10', 'iVisit Network', true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 2. Clean Redeclaration of get_all_auth_users
DROP FUNCTION IF EXISTS public.get_all_auth_users();
DROP FUNCTION IF EXISTS public.get_all_auth_users(UUID);

CREATE OR REPLACE FUNCTION public.get_all_auth_users(p_organization_id UUID DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    email TEXT,
    phone TEXT,
    username TEXT,
    role TEXT,
    first_name TEXT,
    last_name TEXT,
    full_name TEXT,
    image_uri TEXT,
    avatar_url TEXT,
    organization_id UUID,
    organization_name TEXT,
    hospital_id UUID,
    hospital_name TEXT,
    provider_type TEXT,
    bvn_verified BOOLEAN,
    display_id TEXT,
    created_at TIMESTAMPTZ,
    last_sign_in_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        au.id,
        au.email::TEXT,
        au.phone::TEXT,
        p.username,
        p.role,
        p.first_name,
        p.last_name,
        p.full_name,
        p.image_uri,
        p.image_uri as avatar_url,
        COALESCE(p.organization_id, h.organization_id) as organization_id,
        COALESCE(org.name, h_org.name, 'Independent') as organization_name,
        h.id as hospital_id,
        h.name as hospital_name,
        p.provider_type,
        p.bvn_verified,
        p.display_id,
        au.created_at,
        au.last_sign_in_at
    FROM auth.users au
    LEFT JOIN public.profiles p ON au.id = p.id
    -- Direct organization link
    LEFT JOIN public.organizations org ON p.organization_id = org.id
    -- Hospital link for scoping
    LEFT JOIN public.hospitals h ON p.id = h.org_admin_id
    -- Organization name via hospital link
    LEFT JOIN public.organizations h_org ON h.organization_id = h_org.id
    WHERE 
        (p_organization_id IS NULL OR 
         p.organization_id = p_organization_id OR 
         h.organization_id = p_organization_id)
    ORDER BY au.created_at DESC;
END;
$$;

NOTIFY pgrst, 'reload schema';
