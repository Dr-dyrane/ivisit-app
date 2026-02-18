/**
 * CUMULATIVE AUDIT: MODULE 1 & 2
 * Verifies Identity and Core Operations are clean.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function runCumulativeAudit() {
    console.log('🧪 RUNNING CUMULATIVE AUDIT (MOD 1 & 2)\n');

    // MOD 1: Identity
    console.log('--- MODULE 1: IDENTITY ---');
    const { data: stats, error: sErr } = await supabase.rpc('get_user_statistics');
    if (sErr) console.error('   ❌ Stats Failed:', sErr.message);
    else console.log('   ✅ Stats Success:', stats[0].total_profiles, 'total profiles.');

    // MOD 2: Core
    console.log('\n--- MODULE 2: CORE ---');

    // Recent Activity RPC (The unified one)
    const { data: activity, error: aErr } = await supabase.rpc('get_recent_activity', { p_limit: 5 });
    if (aErr) console.error('   ❌ Activity Feed Failed:', aErr.message);
    else console.log('   ✅ Activity Feed Success:', activity.length, 'records.');

    // Ambulances Schema Check
    const { data: ambulances, error: ambErr } = await supabase
        .from('ambulances')
        .select('id, type, status, call_sign')
        .limit(1);
    if (ambErr) console.error('   ❌ Ambulances Failed:', ambErr.message);
    else console.log('   ✅ Ambulances Success: schema aligned.');

    console.log('\n🏁 CUMULATIVE AUDIT COMPLETE');
}

runCumulativeAudit().catch(console.error);
