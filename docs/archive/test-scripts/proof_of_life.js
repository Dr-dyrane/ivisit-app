/**
 * PROOF OF LIFE: NO RECURSION
 * Attempts to update the 'full_name' of a profile.
 * If recursion exists, this will 500/42P17.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

const testUserId = '0f5ab5f8-143d-461f-9bd3-b1018026443d'; // Alexander Udeogaranya

async function proveNoRecursion() {
    console.log(`🧪 PROVING NO RECURSION ON ID: ${testUserId}`);

    // This update triggers the UPDATE policy, which calls get_current_user_role()
    const { data, error } = await supabase
        .from('profiles')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', testUserId)
        .select();

    if (error) {
        if (error.code === '42P17') {
            console.error('❌ FAILURE: INFINITE RECURSION DETECTED!');
        } else {
            console.error('❌ ERROR:', error.message);
        }
        process.exit(1);
    } else {
        console.log('✅ SUCCESS: Profile updated successfully. Recursion is KILLED.');
    }
}

proveNoRecursion().catch(console.error);
