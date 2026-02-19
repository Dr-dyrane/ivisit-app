const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Use ANON key for verification, but SERVICE_ROLE would be needed for seeding auth.users
const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

/**
 * Platform Setup & Verification Script
 * This script verifies the new schema fixes and can be used to seed data.
 */
async function verifyAndSeed() {
    console.log('🧪 Verifying iVisit Platform Setup...\n');

    let results = {
        passed: 0,
        failed: 0,
        details: []
    };

    // --- 1. VERIFY SUBSCRIBERS SCHEMA ---
    console.log('🔍 Checking Subscribers table schema...');
    try {
        const { error } = await supabase
            .from('subscribers')
            .select('new_user, welcome_email_sent, subscription_date')
            .limit(1);

        if (error && error.message.includes('column "new_user" does not exist')) {
            throw new Error('❌ subscribers.new_user column is missing!');
        } else if (error && !error.message.includes('No rows returned') && !error.message.includes('PGRST116')) {
            // Ignore "no rows" errors as table might be empty
            throw new Error(`Subscribers schema error: ${error.message}`);
        }

        console.log('✅ Subscribers table has correct columns (new_user, welcome_email_sent, subscription_date)');
        results.passed++;
    } catch (error) {
        console.log(`❌ Subscribers schema check failed: ${error.message}`);
        results.failed++;
    }

    // --- 2. VERIFY RPC ALIGNMENT ---
    console.log('\n🔍 Checking Activity RPCs...');
    try {
        // Test get_recent_activity with new param names
        const { error: activityError } = await supabase.rpc('get_recent_activity', {
            limit_count: 1,
            offset_count: 0
        });

        // We expect "Unauthorized" if not admin, or success. 
        // We DON'T expect "Could not find the function" (404/PGRST202).
        if (activityError && activityError.code === 'PGRST202') {
            throw new Error('❌ RPC get_recent_activity is missing or has incorrect parameters!');
        }

        console.log('✅ RPC get_recent_activity is correctly defined with limit_count/offset_count');
        results.passed++;

        // Test get_activity_stats with new param name
        const { error: statsError } = await supabase.rpc('get_activity_stats', {
            days_back: 7
        });

        if (statsError && statsError.code === 'PGRST202') {
            throw new Error('❌ RPC get_activity_stats is missing or has incorrect parameters!');
        }

        console.log('✅ RPC get_activity_stats is correctly defined with days_back');
        results.passed++;

    } catch (error) {
        console.log(`❌ RPC verification failed: ${error.message}`);
        results.failed++;
    }

    // --- 3. CHECK SEED DATA ---
    console.log('\n🔍 Checking Seeded Data...');
    try {
        // A. Platform Wallet
        const { data: wallet, error: walletError } = await supabase
            .from('ivisit_main_wallet')
            .select('*')
            .limit(1);

        if (walletError && walletError.code !== 'PGRST116') {
            throw new Error(`Main wallet check failed: ${walletError.message}`);
        }

        if (!wallet || wallet.length === 0) {
            console.log('⚠️  ivisit_main_wallet is empty. Attempting to seed...');
            const { error: seedError } = await supabase
                .from('ivisit_main_wallet')
                .insert({ balance: 0, currency: 'USD' });

            if (seedError) {
                console.log(`❌ Failed to seed main wallet: ${seedError.message}`);
            } else {
                console.log('✅ ivisit_main_wallet seeded successfully');
                results.passed++;
            }
        } else {
            console.log(`✅ ivisit_main_wallet exists (Balance: ${wallet[0].balance} ${wallet[0].currency})`);
            results.passed++;
        }

        // B. Admin Profile (halodyrane)
        const { data: admin, error: adminError } = await supabase
            .from('profiles')
            .select('id, role, onboarding_status')
            .eq('id', '2fdaa45f-787d-45a6-a476-8a71c24c1b8b')
            .maybeSingle();

        if (adminError) {
            throw new Error(`Admin profile check failed: ${adminError.message}`);
        }

        if (!admin) {
            console.log('⚠️  Admin profile (halodyrane) not found. This requires SQL promotion or Service Role.');
        } else if (admin.role !== 'admin' || admin.onboarding_status !== 'completed') {
            console.log(`⚠️  Admin status is incorrect. Attempting to update...`);
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ role: 'admin', onboarding_status: 'completed' })
                .eq('id', '2fdaa45f-787d-45a6-a476-8a71c24c1b8b');

            if (updateError) {
                console.log(`❌ Failed to update admin status: ${updateError.message}`);
            } else {
                console.log('✅ Admin profile updated to completed status');
                results.passed++;
            }
        } else {
            console.log('✅ Admin profile (halodyrane) verified');
            results.passed++;
        }

        // C. Organization (iVisit)
        const { data: org, error: orgError } = await supabase
            .from('organizations')
            .select('id, name')
            .eq('id', 'a0000000-0000-0000-0000-000000000001')
            .maybeSingle();

        if (orgError) throw new Error(`Org check error: ${orgError.message}`);

        if (!org) {
            console.log('⚠️  iVisit Organization missing. Attempting to seed...');
            const { error: seedError } = await supabase
                .from('organizations')
                .insert({
                    id: 'a0000000-0000-0000-0000-000000000001',
                    name: 'iVisit Medical Services',
                    contact_email: 'halodyrane@gmail.com',
                    is_active: true
                });

            if (seedError) {
                console.log(`❌ Failed to seed organization: ${seedError.message}`);
            } else {
                console.log('✅ iVisit Organization seeded');
                results.passed++;
            }
        } else {
            console.log(`✅ iVisit Organization verified: ${org.name}`);
            results.passed++;
        }

        // D. Hospital (Hemet)
        const { data: hospital, error: hospError } = await supabase
            .from('hospitals')
            .select('id, name')
            .eq('id', 'b0000000-0000-0000-0000-000000000001')
            .maybeSingle();

        if (hospError) throw new Error(`Hospital check error: ${hospError.message}`);

        if (!hospital) {
            console.log('⚠️  Hospital missing. Attempting to seed Hemet Valley...');
            const { error: seedError } = await supabase
                .from('hospitals')
                .insert({
                    id: 'b0000000-0000-0000-0000-000000000001',
                    name: 'Hemet Valley Medical Center',
                    address: '1117 E Devonshire Ave, Hemet, CA 92543',
                    phone: '+19517919811',
                    latitude: 33.7394,
                    longitude: -116.9719,
                    verified: true,
                    status: 'available',
                    organization_id: 'a0000000-0000-0000-0000-000000000001',
                    org_admin_id: '2fdaa45f-787d-45a6-a476-8a71c24c1b8b'
                });

            if (seedError) {
                console.log(`❌ Failed to seed hospital: ${seedError.message}`);
            } else {
                console.log('✅ Hemet Valley Medical Center seeded');
                results.passed++;
            }
        } else {
            console.log(`✅ Hospital verified: ${hospital.name}`);
            results.passed++;
        }

    } catch (error) {
        console.log(`❌ Seed data check failed: ${error.message}`);
        results.failed++;
    }

    // Final Summary
    console.log('\n🎯 Setup Verification Summary:');
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);

    if (results.failed > 0) {
        console.log('\n🚨 ACTION REQUIRED: Apply the fixes in 0001_identity.sql and 0100_core_rpcs.sql');
    } else {
        console.log('\n🎉 System is ready! All schema fixes and core RPCs are verified.');
    }

    return results;
}

// Run the script
if (require.main === module) {
    verifyAndSeed()
        .then(results => {
            process.exit(results.failed > 0 ? 1 : 0);
        })
        .catch(error => {
            console.error('❌ Script execution failed:', error);
            process.exit(1);
        });
}

module.exports = { verifyAndSeed };
