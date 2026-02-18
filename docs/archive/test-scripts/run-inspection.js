const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function runInspection() {
    console.log('🧐 FETCHING LIVE POLICIES FOR profiles...\n');
    const { data, error } = await supabase.rpc('inspect_profile_policies');
    if (error) {
        console.error('❌ RPC FAILED:', error.message);
    } else {
        data.forEach((p, i) => {
            console.log(`[${i}] NAME: ${p.policy_name}`);
            console.log(`    QUAL: ${p.qual}`);
            console.log(`    CHECK: ${p.with_check}\n`);
        });
    }
}

runInspection().catch(console.error);
