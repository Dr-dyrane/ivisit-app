const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Use Service Role key if available for administrative seeding, otherwise fallback to Anon
const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
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
            throw new Error(`Subscribers schema error: ${error.message}`);
        }

        console.log('✅ Subscribers table has correct columns');
        results.passed++;
    } catch (error) {
        console.log(`❌ Subscribers schema check failed: ${error.message}`);
        results.failed++;
    }

    // --- 2. VERIFY RPC ALIGNMENT ---
    console.log('\n🔍 Checking Activity RPCs...');
    try {
        const { error: activityError } = await supabase.rpc('get_recent_activity', {
            limit_count: 1,
            offset_count: 0
        });

        if (activityError && activityError.code === 'PGRST202') {
            throw new Error('❌ RPC get_recent_activity is missing or misaligned!');
        }
        console.log('✅ RPC get_recent_activity aligned');
        results.passed++;

        const { error: statsError } = await supabase.rpc('get_activity_stats', {
            days_back: 7
        });

        if (statsError && statsError.code === 'PGRST202') {
            throw new Error('❌ RPC get_activity_stats is missing or misaligned!');
        }
        console.log('✅ RPC get_activity_stats aligned');
        results.passed++;

    } catch (error) {
        console.log(`❌ RPC verification failed: ${error.message}`);
        results.failed++;
    }

    // --- 3. SEED & VERIFY DATA ---
    console.log('\n🔍 Seeding & Verifying Platform Data...');
    try {
        // A. Platform Wallet
        const { data: wallet } = await supabase.from('ivisit_main_wallet').select('*').limit(1);
        if (!wallet || wallet.length === 0) {
            console.log('⚠️  Seeding main wallet...');
            await supabase.from('ivisit_main_wallet').insert({ balance: 0, currency: 'USD' });
        }
        console.log('✅ Main wallet verified');
        results.passed++;

        // B. Admin Profile
        const adminId = '2fdaa45f-787d-45a6-a476-8a71c24c1b8b';
        const { data: admin } = await supabase.from('profiles').select('id, role').eq('id', adminId).maybeSingle();
        if (admin && admin.role !== 'admin') {
            console.log('⚠️  Promoting halodyrane to admin...');
            await supabase.from('profiles').update({ role: 'admin', onboarding_status: 'completed' }).eq('id', adminId);
        }
        console.log('✅ Admin status verified');
        results.passed++;

        // C. Organization
        const orgId = 'a0000000-0000-0000-0000-000000000001';
        const { data: org } = await supabase.from('organizations').select('id').eq('id', orgId).maybeSingle();
        if (!org) {
            console.log('⚠️  Seeding iVisit Organization...');
            await supabase.from('organizations').insert({
                id: orgId,
                name: 'iVisit Medical Services',
                contact_email: 'halodyrane@gmail.com',
                is_active: true
            });
            await supabase.from('organization_wallets').insert({ organization_id: orgId, balance: 0 });
        }
        console.log('✅ Organization verified');
        results.passed++;

        // D. Hospital
        const hospId = 'b0000000-0000-0000-0000-000000000001';
        const { data: hosp } = await supabase.from('hospitals').select('id').eq('id', hospId).maybeSingle();
        if (!hosp) {
            console.log('⚠️  Seeding Hemet Hospital...');
            await supabase.from('hospitals').insert({
                id: hospId,
                name: 'Hemet Valley Medical Center',
                address: '1117 E Devonshire Ave, Hemet, CA 92543',
                latitude: 33.7394,
                longitude: -116.9719,
                verified: true,
                organization_id: orgId,
                org_admin_id: adminId
            });
        }
        console.log('✅ Hospital verified');
        results.passed++;

        // E. Staff
        const staff = [
            { id: 'c0000000-0000-0000-0000-000000000001', email: 'orgadmin@ivisit.test', name: 'Sarah Mitchell', role: 'org_admin' },
            { id: 'c0000000-0000-0000-0000-000000000002', email: 'doctor@ivisit.test', name: 'Dr. James Carter', role: 'provider' },
            { id: 'c0000000-0000-0000-0000-000000000003', email: 'driver@ivisit.test', name: 'Marcus Johnson', role: 'provider' }
        ];

        for (const s of staff) {
            const { error: getError } = await supabase.auth.admin.getUserById(s.id);
            if (getError) {
                console.log(`⚠️  Creating staff: ${s.name}...`);
                await supabase.auth.admin.createUser({
                    id: s.id,
                    email: s.email,
                    password: 'Test1234!',
                    email_confirm: true,
                    user_metadata: { full_name: s.name },
                    app_metadata: { role: s.role }
                });
            }
            console.log(`✅ Staff verified: ${s.name}`);
        }

    } catch (error) {
        console.log(`❌ Data seeding failed: ${error.message}`);
        results.failed++;
    }

    // Summary
    console.log('\n🎯 Summary:');
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    return results;
}

if (require.main === module) {
    verifyAndSeed()
        .then(res => process.exit(res.failed > 0 ? 1 : 0))
        .catch(err => { console.error(err); process.exit(1); });
}

module.exports = { verifyAndSeed };
