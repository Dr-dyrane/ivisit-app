const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' }); // Or just .env

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
// Note: Verification script might need service role key for cleanup or checking hidden tables.
// If available, use it. Otherwise, rely on public access (RLS might block some checks).
const serviceRoleKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey || supabaseKey);

async function testProfileCreation() {
    console.log('🧪 Testing Profile Creation Automation...');

    const email = `test_auto_${Date.now()}@ivisit.com`;
    const password = 'TestPassword123!';
    const metaData = {
        full_name: 'Test Automation User',
        avatar_url: 'https://example.com/avatar.png',
        role: 'patient'
    };

    try {
        // 1. Create User
        console.log(`Creating user: ${email}...`);
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: { data: metaData }
        });

        if (authError) throw new Error(`Auth Error: ${authError.message}`);
        const userId = authData.user?.id;
        if (!userId) throw new Error('User created but no ID returned');

        console.log(`✅ User created: ${userId}`);

        // Wait for triggers to fire
        console.log('Waiting for triggers...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 2. Verify Profile
        console.log('Verifying Profile...');
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (profileError) {
            console.error('❌ Profile Check Failed:', profileError.message);
        } else {
            console.log('✅ Profile exists:', profile.id);
            console.log(`   - Name: ${profile.full_name}`);
            console.log(`   - Avatar: ${profile.avatar_url}`);
            console.log(`   - Image URI: ${profile.image_uri}`); // Mobile parity check
        }

        // 3. Verify Patient Wallet
        console.log('Verifying Patient Wallet...');
        const { data: wallet, error: walletError } = await supabase
            .from('patient_wallets')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (walletError && walletError.code !== 'PGRST116') { // Ignore "no rows" if RLS hides it for anon
            console.error('❌ Wallet Check Failed:', walletError.message);
        } else if (wallet) {
            console.log('✅ Patient Wallet exists:', wallet.id);
        } else {
            console.log('⚠️ Wallet not found (likely pending trigger or RLS restricted)');
        }

        // 4. Verify Preferences
        console.log('Verifying Preferences...');
        const { data: prefs, error: prefsError } = await supabase
            .from('preferences')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (prefsError) {
            console.error('❌ Preferences Check Failed:', prefsError.message);
        } else {
            console.log('✅ Preferences exist:', prefs.user_id);
        }

        // Cleanup attempt (only works with Service Role)
        if (serviceRoleKey) {
            console.log('Cleaning up...');
            const { error: delError } = await supabase.auth.admin.deleteUser(userId);
            if (delError) console.error('Cleanup failed:', delError.message);
            else console.log('✅ Test user deleted');
        } else {
            console.log('⚠️ Cleanup skipped (No Service Role Key). Please delete manually.');
        }

    } catch (error) {
        console.error('❌ Test Critical Failure:', error.message);
    }
}

testProfileCreation();
