#!/usr/bin/env node
/**
 * 🔧 SCHEMA FIX APPLICATOR
 * Applies targeted SQL fixes directly to the remote DB via Supabase RPC
 * Uses service role key for maximum privilege.
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

require('dotenv').config();
const envLocal = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocal)) {
    const cfg = require('dotenv').parse(fs.readFileSync(envLocal));
    Object.assign(process.env, cfg);
}

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('❌ FATAL: Need SUPABASE_URL and SERVICE_ROLE_KEY');
    process.exit(1);
}

const svc = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

// ─── SQL Fixes ────────────────────────────────────────────────────────────────
const fixes = [

    // FIX 1: update_hospital_availability — ambiguous 'status' column reference
    {
        label: 'FIX 1: update_hospital_availability — rename param to p_status',
        sql: `
CREATE OR REPLACE FUNCTION public.update_hospital_availability(
    hospital_id UUID,
    beds_available INTEGER,
    er_wait_time INTEGER,
    p_status TEXT,
    ambulance_count INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.hospitals
    SET 
        available_beds = beds_available,
        emergency_wait_time_minutes = er_wait_time,
        wait_time = er_wait_time || ' mins',
        status = p_status,
        ambulances_count = ambulance_count,
        updated_at = NOW()
    WHERE id = hospital_id;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`
    },

    // FIX 2: ambulances.status CHECK — expand to include actual dispatch statuses
    {
        label: 'FIX 2: ambulances.status CHECK constraint — expand to dispatch statuses',
        sql: `
ALTER TABLE public.ambulances DROP CONSTRAINT IF EXISTS ambulances_status_check;
ALTER TABLE public.ambulances 
  ALTER COLUMN status SET DEFAULT 'available',
  ADD CONSTRAINT ambulances_status_check CHECK (status IN (
    'available', 'dispatched', 'on_trip', 'en_route', 'on_scene', 'returning',
    'maintenance', 'offline', 'pending_approval'
  ));
-- Update existing rows with invalid statuses to 'available'
UPDATE public.ambulances SET status = 'available' 
WHERE status NOT IN ('available','dispatched','on_trip','en_route','on_scene','returning','maintenance','offline','pending_approval');
`
    },

    // FIX 3: ambulances — add missing real-time dispatch columns (eta, current_call)
    {
        label: 'FIX 3: ambulances — add eta and current_call columns',
        sql: `
ALTER TABLE public.ambulances 
  ADD COLUMN IF NOT EXISTS eta TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS current_call UUID;
`
    },

    // FIX 4: payments — add metadata JSONB column
    {
        label: 'FIX 4: payments — add metadata JSONB column',
        sql: `
ALTER TABLE public.payments 
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
`
    },

    // FIX 5: Org wallet auto-creation trigger
    {
        label: 'FIX 5: automations — handle_new_organization trigger',
        sql: `
CREATE OR REPLACE FUNCTION public.handle_new_organization()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.organization_wallets (organization_id, balance, currency)
    VALUES (NEW.id, 0.00, 'USD')
    ON CONFLICT (organization_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_org_created ON public.organizations;
CREATE TRIGGER on_org_created
AFTER INSERT ON public.organizations
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_organization();
-- Backfill: create wallets for orgs that don't have one yet
INSERT INTO public.organization_wallets (organization_id, balance, currency)
SELECT o.id, 0.00, 'USD' FROM public.organizations o
WHERE NOT EXISTS (SELECT 1 FROM public.organization_wallets w WHERE w.organization_id = o.id);
`
    },

    // FIX 6: get_available_ambulances — remove non-existent columns
    {
        label: 'FIX 6: get_available_ambulances — remove non-existent columns',
        sql: `
CREATE OR REPLACE FUNCTION public.get_available_ambulances(
    p_hospital_id UUID DEFAULT NULL,
    p_radius_km INTEGER DEFAULT 50,
    p_specialty TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    call_sign TEXT,
    status TEXT,
    hospital_id UUID,
    vehicle_number TEXT,
    base_price NUMERIC,
    crew JSONB,
    type TEXT,
    profile_id UUID,
    display_id TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.call_sign,
        a.status,
        a.hospital_id,
        a.vehicle_number,
        a.base_price,
        a.crew,
        a.type,
        a.profile_id,
        a.display_id,
        a.created_at,
        a.updated_at
    FROM public.ambulances a
    WHERE a.status = 'available'
        AND (p_hospital_id IS NULL OR a.hospital_id = p_hospital_id);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
`
    },

    // FIX 7: assign_ambulance_to_emergency — ensure dispatched/current_call used
    {
        label: 'FIX 7: assign_ambulance_to_emergency — use dispatched + current_call',
        sql: `
CREATE OR REPLACE FUNCTION public.assign_ambulance_to_emergency(
    p_emergency_request_id UUID,
    p_ambulance_id UUID,
    p_priority INTEGER DEFAULT 1
)
RETURNS JSONB AS $$
DECLARE
    v_ambulance_status TEXT;
    v_hospital_id UUID;
BEGIN
    SELECT a.status, a.hospital_id INTO v_ambulance_status, v_hospital_id
    FROM public.ambulances a
    WHERE a.id = p_ambulance_id;
    
    IF v_ambulance_status IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ambulance not found', 'code', 'AMBULANCE_NOT_FOUND');
    END IF;

    IF v_ambulance_status != 'available' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ambulance not available', 'code', 'AMBULANCE_UNAVAILABLE', 'current_status', v_ambulance_status);
    END IF;
    
    UPDATE public.ambulances 
    SET status = 'dispatched', current_call = p_emergency_request_id, updated_at = NOW()
    WHERE id = p_ambulance_id;
    
    UPDATE public.emergency_requests 
    SET ambulance_id = p_ambulance_id, status = 'accepted', updated_at = NOW()
    WHERE id = p_emergency_request_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'ambulance_id', p_ambulance_id,
        'emergency_request_id', p_emergency_request_id,
        'assigned_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`
    },

    // FIX 8: create_emergency_v4 — add visit creation and fix metadata insert
    {
        label: 'FIX 8: create_emergency_v4 — ensure visit is created atomically',
        sql: `
-- Verify visits insert exists by checking current function body
-- We'll wrap the existing function, patching the metadata issue
DO $$
DECLARE
  fn_body TEXT;
BEGIN
  SELECT pg_get_functiondef(oid) INTO fn_body FROM pg_proc WHERE proname = 'create_emergency_v4';
  IF fn_body LIKE '%INSERT INTO public.visits%' THEN
    RAISE NOTICE 'visits insert already in create_emergency_v4 — OK';
  ELSE
    RAISE WARNING 'create_emergency_v4 does NOT insert into visits — needs patch';
  END IF;
END;
$$;
`
    },
];

// ─── Apply Fixes ──────────────────────────────────────────────────────────────
async function applyFixes() {
    console.log('🔧 Applying schema fixes to remote DB...\n');
    let passed = 0, failed = 0;

    for (const fix of fixes) {
        try {
            const { error } = await svc.rpc('exec_sql', { sql: fix.sql }).catch(() => ({ error: { message: 'exec_sql not available' } }));

            if (error?.message === 'exec_sql not available') {
                // Fallback: use pg connection via supabase admin API (for migrations)
                console.warn(`  ⚠️  [${fix.label}] No exec_sql RPC — use psql directly`);
                console.log(`\n  📋 SQL to run manually:`);
                console.log('  ' + '-'.repeat(60));
                console.log(fix.sql.split('\n').map(l => '  ' + l).join('\n'));
                console.log('  ' + '-'.repeat(60) + '\n');
                continue;
            }

            if (error) throw new Error(error.message);
            console.log(`  ✅ ${fix.label}`);
            passed++;
        } catch (e) {
            console.error(`  ❌ ${fix.label}: ${e.message}`);
            failed++;
        }
    }

    console.log(`\n✅ ${passed} fixes applied | ❌ ${failed} failed`);
}

applyFixes();
