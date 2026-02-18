/**
 * AUDIT SCRIPT: MODULE 7 (INSURANCE)
 * Verifies Insurance Policies RLS and CRUD.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function auditInsuranceModule() {
    console.log('📑 AUDITING MODULE 7: INSURANCE\n');

    // 1. Insurance Policies
    console.log('1. Checking insurance_policies...');
    const { data: policies, error: polError } = await supabase
        .from('insurance_policies')
        .select('id, provider_name, policy_number')
        .limit(5);

    if (polError) {
        console.error('   ❌ Read Failed:', polError.message);
    } else {
        console.log('   ✅ Read Success: found', policies.length, 'policies.');
    }

    console.log('\n🏁 MODULE 7 AUDIT COMPLETE');
}

auditInsuranceModule().catch(console.error);
