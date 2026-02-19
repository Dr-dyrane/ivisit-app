/**
 * VERIFICATION SCRIPT: MODULE 9 (DOCTORS CRUD & AUTO-LINK)
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Using Service Role to simulate system/admin actions for the trigger test
const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyDoctorsIntegration() {
    console.log('🧪 VERIFYING DOCTORS INTEGRATION & CRUD\n');

    // 1. Test Auto-Link Trigger
    console.log('1. Testing Profile -> Doctor Auto-Link...');
    const testUserId = 'f15b1b48-f962-48d1-9fc0-2492ec0e6e21'; // Dr Dyrane Profile

    console.log('   Updating profile to trigger sync...');
    const { error: upError } = await supabase
        .from('profiles')
        .update({
            role: 'provider',
            provider_type: 'doctor',
            full_name: 'Dr. Dyrane (Verified)'
        })
        .eq('id', testUserId);

    if (upError) {
        console.error('   ❌ Profile Update Error:', upError.message);
    } else {
        console.log('   ✅ Profile updated.');

        // Check if doctor record was updated
        const { data: docData, error: docError } = await supabase
            .from('doctors')
            .select('name, updated_at')
            .eq('profile_id', testUserId)
            .single();

        if (docError) {
            console.error('   ❌ Doctor Sync Error:', docError.message);
        } else if (docData.name === 'Dr. Dyrane (Verified)') {
            console.log('   ✅ Doctor record synced successfully.');
        } else {
            console.log('   ❌ Doctor record mismatch:', docData.name);
        }
    }

    // 2. Individual Field Updates (CRUD)
    console.log('\n2. Testing Individual Field Updates (CRUD)...');
    const doctorId = '5d849da3-f3e6-4543-a413-20db6314184a';

    // Update Specialization
    console.log('   Updating specialization...');
    const { error: specErr } = await supabase
        .from('doctors')
        .update({ specialization: 'Neurology' })
        .eq('id', doctorId);
    if (!specErr) console.log('   ✅ Specialization updated.');

    // Update Status
    console.log('   Updating status...');
    const { error: statErr } = await supabase
        .from('doctors')
        .update({ status: 'busy' })
        .eq('id', doctorId);
    if (!statErr) console.log('   ✅ Status updated.');

    // Final check
    const { data: finalDoc } = await supabase
        .from('doctors')
        .select('specialization, status')
        .eq('id', doctorId)
        .single();

    console.log('   Final State:', finalDoc);

    // 3. Revert for cleanliness
    await supabase
        .from('doctors')
        .update({ specialization: 'General Practice', status: 'available', name: 'Dr dyrane' })
        .eq('id', doctorId);

    console.log('\n🏁 DOCTORS VERIFICATION COMPLETE');
}

verifyDoctorsIntegration().catch(console.error);
