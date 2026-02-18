/**
 * TEST SCRIPT: RECURSION & TYPE MISMATCH FIX
 * Verifies that profiles can be fetched without infinite recursion 
 * and that RPCs work with UUID parameters.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function verifyFixes() {
    console.log('🧪 VERIFYING NUCLEAR DE-RECURSION & UUID ALIGNMENT\n');

    const testUserId = '04e905d8-44e3-4300-bc64-741a4f868995'; // From error logs

    // 1. Test Profile Fetch (Triggering RLS)
    console.log('1. Testing Profile Fetch (RLS Check)...');
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, role, full_name')
            .eq('id', testUserId)
            .single();

        if (error) {
            if (error.code === '42P17') {
                console.log('❌ RECURSION DETECTED: Fetch failed with 42P17');
            } else {
                console.log('❌ Fetch failed:', error.message);
            }
        } else {
            console.log('✅ PROFILE FETCH SUCCESSFUL:', data.full_name, `(${data.role})`);
        }
    } catch (err) {
        console.log('❌ Error during profile fetch:', err.message);
    }

    // 2. Test get_all_auth_users RPC (UUID Alignment)
    console.log('\n2. Testing get_all_auth_users RPC (UUID Check)...');
    try {
        const { data, error } = await supabase.rpc('get_all_auth_users', {
            p_organization_id: null // Passing null should work for admin/global
        });

        if (error) {
            console.log('❌ RPC FAILED:', error.message);
        } else {
            console.log('✅ RPC SUCCESSFUL: Received', data.length, 'users');
        }
    } catch (err) {
        console.log('❌ Error during RPC call:', err.message);
    }

    // 3. Test get_user_statistics RPC
    console.log('\n3. Testing get_user_statistics RPC...');
    try {
        const { data, error } = await supabase.rpc('get_user_statistics');

        if (error) {
            console.log('❌ Statistics RPC FAILED:', error.message);
        } else {
            console.log('✅ Statistics RPC SUCCESSFUL:', data[0]);
        }
    } catch (err) {
        console.log('❌ Error during Stats RPC call:', err.message);
    }

    console.log('\n🎯 VERIFICATION COMPLETE');
}

verifyFixes().catch(console.error);
