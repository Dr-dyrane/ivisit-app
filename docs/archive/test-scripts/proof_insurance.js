/**
 * PROOF OF LIFE: INSURANCE MODULE
 * Verifies Module 7 is live on remote.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

const testUserId = '0f5ab5f8-143d-461f-9bd3-b1018026443d';

async function proveInsurance() {
    console.log(`🧪 VERIFYING INSURANCE MODULE ON ID: ${testUserId}`);

    // Create a policy
    const { data: insert, error: iErr } = await supabase
        .from('insurance_policies')
        .insert({
            user_id: testUserId,
            provider_name: 'Audit Test',
            policy_number: 'AUDIT-123'
        })
        .select();

    if (iErr) {
        console.error('❌ INSERT FAILED:', iErr.message);
        process.exit(1);
    }
    console.log('✅ INSERT SUCCESS');

    // Delete it
    const { error: dErr } = await supabase
        .from('insurance_policies')
        .delete()
        .eq('id', insert[0].id);

    if (dErr) {
        console.error('❌ DELETE FAILED:', dErr.message);
        process.exit(1);
    }
    console.log('✅ DELETE SUCCESS. Module 7 is LIVE and VERIFIED.');
}

proveInsurance().catch(console.error);
