
-- Migration: Restore Policies for Profiles and Organization Wallets
-- Fixes 406/403 errors and type mismatch in RBAC policies
-- Critical for app functionality after ID type migration

BEGIN;

    -- 1. Restore Policies on PROFILES details
    -- Dropped during dynamic cleanup, must be restored for access.
    
    -- Users can view their own profile
    DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
    CREATE POLICY "Users can view own profile" 
    ON public.profiles FOR SELECT 
    USING ( auth.uid() = id );

    -- Staff can view all profiles (Directory Access)
    -- Requires get_current_user_role() which is SECURITY DEFINER (good)
    DROP POLICY IF EXISTS "Staff can view all profiles for directory" ON public.profiles;
    CREATE POLICY "Staff can view all profiles for directory" 
    ON public.profiles FOR SELECT 
    USING (
      public.get_current_user_role() IN ('admin', 'org_admin', 'provider', 'dispatcher')
    );

    -- Admins can update any profile
    DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
    CREATE POLICY "Admins can update any profile" 
    ON public.profiles FOR UPDATE
    USING ( public.get_current_user_role() = 'admin' );

    -- Users can update own profile
    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE
    USING ( auth.uid() = id );
    
    -- Users can insert own profile (Critical to fix "violates row-level security policy" on insert)
    DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
    CREATE POLICY "Users can insert own profile" 
    ON public.profiles FOR INSERT 
    WITH CHECK ( auth.uid() = id );
    
    
    -- 2. Restore Policy on ORGANIZATION_WALLETS
    -- Fixes type mismatch between profiles.organization_id (TEXT) and wallet.organization_id (UUID)
    -- Logic: Profile -> Hospital -> Organization -> Wallet
    
    DROP POLICY IF EXISTS "Org admins view their own wallet" ON public.organization_wallets;
    CREATE POLICY "Org admins view their own wallet" ON public.organization_wallets
    FOR SELECT USING (
        -- Admin Access
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
        OR
        -- Org Admin Access (via Hospital)
        EXISTS (
            SELECT 1 
            FROM public.profiles p
            JOIN public.hospitals h ON p.organization_id = h.id -- Text join
            WHERE p.id = auth.uid() 
            AND h.organization_id = organization_wallets.organization_id -- UUID match
        )
    );

    -- 3. Restore 'ivisit_main_wallet' policy if it was somehow affected (Just in case)
    -- "Admins manage main wallet"
    DROP POLICY IF EXISTS "Admins manage main wallet" ON public.ivisit_main_wallet;
    CREATE POLICY "Admins manage main wallet" ON public.ivisit_main_wallet
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

    -- 4. Reload Schema Cache
    NOTIFY pgrst, 'reload schema';

COMMIT;
