/**
 * AUDIT SCRIPT: MODULE 8 (HEALTH NEWS)
 * Verifies health_news table existence, data, and RLS.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function auditHealthNews() {
    console.log('📑 AUDITING MODULE 8: HEALTH NEWS\n');

    // 1. Table Existence & Structure
    console.log('1. Checking health_news reachability...');
    const { data: fetchTest, error: fetchErr } = await supabase
        .from('health_news')
        .select('*')
        .limit(1);

    if (fetchErr) {
        console.error('   ❌ Fetch Error:', fetchErr.message);
    } else {
        console.log('   ✅ Reachable. Row count in sample:', fetchTest.length);
    }

    // 2. Data Check
    const { count, error: countErr } = await supabase
        .from('health_news')
        .select('*', { count: 'exact', head: true });

    if (countErr) {
        console.error('   ❌ Count Error:', countErr.message);
    } else {
        console.log('   📊 Total Rows in Remote:', count);
    }

    // 3. RLS Check (Try to insert as anon)
    console.log('\n2. Testing RLS (Attempting unauthorized insert)...');
    const { error: insErr } = await supabase
        .from('health_news')
        .insert({ title: 'Test', source: 'Test', time: '1m', icon: 'test' });

    if (insErr && insErr.message.includes('row-level security')) {
        console.log('   ✅ RLS is blocking unauthorized inserts.');
    } else if (insErr) {
        console.log('   ⚠️ Insert Error (not necessarily RLS):', insErr.message);
    } else {
        console.log('   ❌ RLS FAIL: Unauthorized insert succeeded.');
    }

    console.log('\n🏁 MODULE 8 HEALTH NEWS AUDIT COMPLETE');
}

auditHealthNews().catch(console.error);
