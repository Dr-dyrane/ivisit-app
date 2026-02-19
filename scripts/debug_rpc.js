const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
);

async function debugFunctions() {
    console.log('🔍 Inspecting remote function signatures for get_trending_searches...');

    // We can't query pg_proc via RPC usually unless there's a helper.
    // Let's try to just call it with different signatures to see which one sticks.

    console.log('Testing signature: (p_limit)');
    const r1 = await supabase.rpc('get_trending_searches', { p_limit: 5 });
    console.log('Result (p_limit):', r1.error ? r1.error.message : 'SUCCESS');

    console.log('Testing signature: (days_back, limit_count)');
    const r2 = await supabase.rpc('get_trending_searches', { days_back: 7, limit_count: 5 });
    console.log('Result (days_back, limit_count):', r2.error ? r2.error.message : 'SUCCESS');

    console.log('Testing signature: (limit_count, days_back)');
    const r3 = await supabase.rpc('get_trending_searches', { limit_count: 5, days_back: 7 });
    console.log('Result (limit_count, days_back):', r3.error ? r3.error.message : 'SUCCESS');
}

debugFunctions();
