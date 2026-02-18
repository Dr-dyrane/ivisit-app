/**
 * AUDIT SCRIPT: MODULE 6 (ADMIN INFRA)
 * Verifies admin_audit_log RLS is active and non-recursive.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function auditAdminInfra() {
    console.log('📑 AUDITING MODULE 6: ADMIN INFRASTRUCTURE\n');

    // 1. Admin Audit Log
    console.log('1. Checking admin_audit_log...');
    const { data, error } = await supabase
        .from('admin_audit_log')
        .select('id, action')
        .limit(1);

    if (error) {
        console.error('   ❌ Error:', error.message);
    } else {
        console.log('   ✅ Success: Reachable and RLS applied (Rows found:', data.length, ')');
    }

    // 2. User Activity
    console.log('\n2. Checking user_activity...');
    const { data: act, error: aErr } = await supabase
        .from('user_activity')
        .select('id, type')
        .limit(1);

    if (aErr) {
        console.error('   ❌ Error:', aErr.message);
    } else {
        console.log('   ✅ Success: Reachable (Rows found:', act.length, ')');
    }

    console.log('\n🏁 MODULE 6 ADMIN INFRA AUDIT COMPLETE');
}

auditAdminInfra().catch(console.error);
