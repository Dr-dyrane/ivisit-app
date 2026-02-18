const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

const testUserId = '0f5ab5f8-143d-461f-9bd3-b1018026443d';

async function verifyRealUpdate() {
    console.log(`🧪 VERIFYING REAL UPDATE ON ID: ${testUserId}`);

    const { data, error } = await supabase
        .from('profiles')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', testUserId)
        .select();

    if (error) {
        console.error('❌ ERROR:', error.message);
    } else if (data && data.length > 0) {
        console.log('✅ SUCCESS: 1 row actually updated.');
    } else {
        console.error('❌ FAILURE: 0 rows updated. (RLS is blocking you!)');
    }
}

verifyRealUpdate().catch(console.error);
