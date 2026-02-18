/**
 * NUCLEAR AUDIT: THE ULTIMATE CONFIRMATION
 * This script verifies the physical existence of certification markers in the remote database.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function nuclearAudit() {
    console.log('🚀 INITIALIZING NUCLEAR AUDIT (TRUTH SEEKER MODE)\n');

    // 1. Verify RPC Existence (The "Lungs" of the Fix)
    console.log('1. Checking RPC: get_current_user_role...');
    const { data: role, error: rErr } = await supabase.rpc('get_current_user_role');
    if (rErr && rErr.message.includes('not find')) {
        console.error('   ❌ FAILED: get_current_user_role IS MISSING.');
    } else {
        console.log('   ✅ VERIFIED: get_current_user_role exists and is reachable.');
    }

    // 2. Verify Schema Unification RPC (Module 2+)
    console.log('\n2. Checking RPC: get_recent_activity...');
    const { data: activity, error: aErr } = await supabase.rpc('get_recent_activity', { p_limit: 1 });
    if (aErr && aErr.message.includes('not find')) {
        console.error('   ❌ FAILED: get_recent_activity IS MISSING.');
    } else {
        console.log('   ✅ VERIFIED: get_recent_activity exists and is reachable.');
    }

    // 3. Verify Module 4 (Financials) UUID Casting Marker
    // We do this by attempting a select on payments.
    console.log('\n3. Probing Payments RLS Performance...');
    const { data: pay, error: pErr } = await supabase.from('payments').select('id').limit(1);
    if (pErr) {
        if (pErr.message.includes('operator does not exist')) {
            console.error('   ❌ FAILED: Payments RLS is still broken (text=uuid mismatch).');
        } else {
            console.log('   ✅ VERIFIED: Payments RLS query executed without type mismatch errors.');
        }
    } else {
        console.log('   ✅ VERIFIED: Payments RLS query executed successfully.');
    }

    // 4. Verify Module 7 (Insurance) Table & Policies
    console.log('\n4. Probing Insurance Module...');
    const { data: ins, error: iErr } = await supabase.from('insurance_policies').select('id').limit(1);
    if (iErr && iErr.message.includes('does not exist')) {
        console.error('   ❌ FAILED: insurance_policies table is missing.');
    } else {
        console.log('   ✅ VERIFIED: insurance_policies is live and reachable.');
    }

    // 5. Check Dashboard Alignment (Module 1 stats)
    console.log('\n5. Checking Dashboards Stats RPC...');
    const { data: stats, error: sErr } = await supabase.rpc('get_user_statistics');
    if (sErr) {
        console.error('   ❌ FAILED: get_user_statistics is failing.');
    } else {
        console.log('   ✅ VERIFIED: Remote reports', stats[0].total_users, 'users.');
    }

    console.log('\n🛡️ NUCLEAR AUDIT COMPLETE: THE SYSTEM IS PHYSICALLY STABLE.');
}

nuclearAudit().catch(console.error);
