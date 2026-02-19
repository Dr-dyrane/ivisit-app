/**
 * TEST SCRIPT: PROVIDER TYPE TRANSITION
 * Verifies if changing provider type correctly manages records in doctors/ambulances tables.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testTransition() {
    console.log('🧪 TESTING PROVIDER TYPE TRANSITION\n');

    const testUserId = 'f15b1b48-f962-48d1-9fc0-2492ec0e6e21'; // Dr Dyrane Profile

    // 1. Ensure starting state is Doctor
    console.log('1. Setting profile to provider_type: doctor...');
    await supabase
        .from('profiles')
        .update({ role: 'provider', provider_type: 'doctor' })
        .eq('id', testUserId);

    const { data: doc1 } = await supabase.from('doctors').select('id').eq('profile_id', testUserId).single();
    console.log('   Doctor record exists:', !!doc1);

    // 2. Transition to Ambulance
    console.log('\n2. Transitioning profile to provider_type: ambulance...');
    await supabase
        .from('profiles')
        .update({ provider_type: 'ambulance' })
        .eq('id', testUserId);

    const { data: amb2 } = await supabase.from('ambulances').select('id').eq('profile_id', testUserId).single();
    const { data: doc2 } = await supabase.from('doctors').select('id').eq('profile_id', testUserId).single();

    console.log('   Ambulance record exists:', !!amb2);
    console.log('   Doctor record still exists (GHOST DATA?):', !!doc2);

    if (doc2) {
        console.log('   ❌ FAIL: Doctor record should have been cleaned up.');
    } else {
        console.log('   ✅ SUCCESS: Doctor record cleaned up.');
    }

    // 3. Revert to Doctor
    console.log('\n3. Reverting back to doctor...');
    await supabase
        .from('profiles')
        .update({ provider_type: 'doctor' })
        .eq('id', testUserId);

    const { data: doc3 } = await supabase.from('doctors').select('id').eq('profile_id', testUserId).single();
    const { data: amb3 } = await supabase.from('ambulances').select('id').eq('profile_id', testUserId).single();

    console.log('   Doctor record exists:', !!doc3);
    console.log('   Ambulance record still exists (GHOST DATA?):', !!amb3);

    console.log('\n🏁 TRANSITION TEST COMPLETE');
}

testTransition().catch(console.error);
