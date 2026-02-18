/**
 * SCHEMA VERIFIER
 * Checks the actual data types of columns in the remote DB.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function verifySchema() {
    console.log('🧐 VERIFYING SCHEMA TYPES ON REMOTE...\n');

    // We can't query information_schema, but we can try to insert a TEXT value into a UUID column.
    // If it fails with "invalid input syntax for type uuid", then the column IS a UUID.

    console.log('1. Testing Payments.user_id type...');
    const { error: pErr } = await supabase
        .from('payments')
        .insert({ user_id: 'NOT-A-UUID' });

    if (pErr && pErr.message.includes('invalid input syntax for type uuid')) {
        console.log('   ✅ verified: payments.user_id is UUID type.');
    } else {
        console.log('   ⚠️ warning: payments.user_id might not be UUID or check failed:', pErr?.message);
    }

    console.log('\n2. Testing Profiles.organization_id type...');
    const { error: oErr } = await supabase
        .from('profiles')
        .insert({ id: '00000000-0000-0000-0000-000000000000', organization_id: 'NOT-A-UUID' });

    if (oErr && oErr.message.includes('invalid input syntax for type uuid')) {
        console.log('   ✅ verified: profiles.organization_id is UUID type.');
    } else {
        console.log('   ⚠️ warning: profiles.organization_id might not be UUID or check failed:', oErr?.message);
    }
}

verifySchema().catch(console.error);
