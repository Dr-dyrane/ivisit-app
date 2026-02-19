/**
 * AUDIT SCRIPT: MODULE 9 (DOCTORS)
 * Verifies doctors table existence, structure, and RLS.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function auditDoctors() {
    console.log('📑 AUDITING MODULE 9: DOCTORS\n');

    // 1. Table Existence & Fetch Test
    console.log('1. Checking doctors reachability...');
    const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .limit(1);

    if (error) {
        console.error('   ❌ Fetch Error:', error.message);
        if (error.message.includes('RLS')) console.log('   💡 Suggestion: RLS is blocking access.');
    } else {
        console.log('   ✅ Reachable. Row count in sample:', data.length);
    }

    // 2. Schema Check (Select some of the new columns)
    console.log('\n2. Checking advanced schema columns...');
    const { data: schemaTest, error: sErr } = await supabase
        .from('doctors')
        .select('profile_id, status, license_number, display_id')
        .limit(1);

    if (sErr) {
        console.error('   ❌ Schema Mismatch:', sErr.message);
    } else {
        console.log('   ✅ Advanced columns found.');
    }

    // 3. RLS Check (Attempt unauthorized insert)
    console.log('\n3. Testing RLS security...');
    const { error: insErr } = await supabase
        .from('doctors')
        .insert({ name: 'Unauthorized Test', specialization: 'Hackers' });

    if (insErr && insErr.message.includes('row-level security')) {
        console.log('   ✅ RLS is blocking unauthorized inserts.');
    } else if (insErr) {
        console.log('   ⚠️ Insert Error:', insErr.message);
    } else {
        console.log('   ❌ RLS FAIL: Unauthorized insert succeeded.');
    }

    console.log('\n🏁 MODULE 9 DOCTORS AUDIT COMPLETE');
}

auditDoctors().catch(console.error);
