/**
 * AUDIT SCRIPT: MODULE 2 (CORE OPERATIONS)
 * Verifies: Emergency Requests, Ambulances, and Visits.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function auditCoreModule() {
    console.log('🚑 AUDITING MODULE 2: CORE OPERATIONS\n');

    // 1. Emergency Requests
    console.log('1. Checking emergency_requests...');
    const { data: requests, error: reqError } = await supabase
        .from('emergency_requests')
        .select('id, status, created_at')
        .limit(5);

    if (reqError) {
        console.error('   ❌ Read Failed:', reqError.message);
    } else {
        console.log('   ✅ Read Success: found', requests.length, 'requests.');
    }

    // 2. Ambulances
    console.log('\n2. Checking ambulances...');
    const { data: ambulances, error: ambError } = await supabase
        .from('ambulances')
        .select('id, brand, status')
        .limit(5);

    if (ambError) {
        console.error('   ❌ Read Failed:', ambError.message);
    } else {
        console.log('   ✅ Read Success: found', ambulances.length, 'ambulances.');
    }

    // 3. Visits
    console.log('\n3. Checking visits...');
    const { data: visits, error: visError } = await supabase
        .from('visits')
        .select('id, user_id, date')
        .limit(5);

    if (visError) {
        console.error('   ❌ Read Failed:', visError.message);
    } else {
        console.log('   ✅ Read Success: found', visits.length, 'visits.');
    }

    // 4. Activity Feed RPC
    console.log('\n4. Checking get_recent_activity()...');
    const { data: activity, error: actError } = await supabase.rpc('get_recent_activity');
    if (actError) {
        console.error('   ❌ RPC Failed:', actError.message);
    } else {
        console.log('   ✅ RPC Success: received activity feed.');
    }

    console.log('\n🏁 MODULE 2 AUDIT COMPLETE');
}

auditCoreModule().catch(console.error);
