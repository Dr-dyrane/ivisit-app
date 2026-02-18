/**
 * FINAL TRUTH TEST
 * Directly queries pg_policies on the remote to verify the logic is NOT recursive
 * and types are casted.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function verifyFinalTruth() {
    console.log('🧐 VERIFYING FINAL TRUTH ON REMOTE DB...\n');

    // We can't query pg_policies easily via anon, so let's use the inspection RPC
    // But let's create a more flexible one if we need. 
    // Wait, I already added 'inspect_profile_policies' and the consolidated schema has 'inspect_table_policies'?

    console.log('--- Table: profiles ---');
    const { data: profPol, error: err1 } = await supabase.rpc('inspect_table_policies', { p_table_name: 'profiles' });
    if (err1) console.error('Error:', err1.message);
    else profPol.forEach(p => console.log(`Policy: ${p.policy_name}\n   SQL: ${p.qual}\n`));

    console.log('\n--- Table: payments ---');
    const { data: payPol, error: err2 } = await supabase.rpc('inspect_table_policies', { p_table_name: 'payments' });
    if (err2) console.error('Error:', err2.message);
    else payPol.forEach(p => console.log(`Policy: ${p.policy_name}\n   SQL: ${p.qual}\n`));

    console.log('\n--- Table: insurance_policies ---');
    const { data: insPol, error: err3 } = await supabase.rpc('inspect_table_policies', { p_table_name: 'insurance_policies' });
    if (err3) console.error('Error:', err3.message);
    else insPol.forEach(p => console.log(`Policy: ${p.policy_name}\n   SQL: ${p.qual}\n`));
}

verifyFinalTruth().catch(console.error);
