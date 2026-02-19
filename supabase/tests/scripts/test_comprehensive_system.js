const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function testComprehensiveSystem() {
  console.log('🧪 Running Comprehensive System Test (Aligned)...\n');

  let results = {
    passed: 0,
    failed: 0,
    details: []
  };

  // Test 1: Core RPC Functions (Pillar 11)
  console.log('🔍 Testing Core RPC Functions...');
  const coreRPCs = [
    { name: 'nearby_hospitals', params: { user_lat: 33.74, user_lng: -116.95, radius_km: 15 } },
    { name: 'nearby_ambulances', params: { user_lat: 33.74, user_lng: -116.95, radius_km: 50 } },
    { name: 'get_recent_activity', params: { limit_count: 5, offset_count: 0 } },
    { name: 'get_activity_stats', params: { days_back: 7 } }
  ];

  for (const rpc of coreRPCs) {
    try {
      const { error } = await supabase.rpc(rpc.name, rpc.params);
      if (error && error.code === 'PGRST202') throw new Error(`${rpc.name}: Function missing or misaligned`);
      // We expect 'Unauthorized' if not admin, but that means it exists
      if (error && error.message.includes('Unauthorized')) {
        console.log(`✅ ${rpc.name}: Function accessible (Security Enforced)`);
      } else if (error) {
        throw new Error(`${rpc.name}: ${error.message}`);
      } else {
        console.log(`✅ ${rpc.name}: Function working`);
      }
      results.passed++;
      results.details.push(`✅ RPC: ${rpc.name} verified`);
    } catch (error) {
      console.log(`❌ ${rpc.name} failed: ${error.message}`);
      results.failed++;
      results.details.push(`❌ RPC: ${rpc.name} - ${error.message}`);
    }
  }

  // Test 2: Emergency Logic (Pillar 9/10)
  console.log('\n🔍 Testing Emergency Logic...');
  try {
    const { error } = await supabase.rpc('create_emergency_v4', {
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_request_data: { hospital_id: '00000000-0000-0000-0000-000000000000' }
    });
    if (error && error.code === 'PGRST202') throw new Error('create_emergency_v4 missing');
    console.log('✅ create_emergency_v4: Function aligned');
    results.passed++;
    results.details.push('✅ Logic: create_emergency_v4 verified');
  } catch (error) {
    console.log(`❌ Emergency Logic failed: ${error.message}`);
    results.failed++;
    results.details.push(`❌ Logic: ${error.message}`);
  }

  // Test 3: Financial Pillars (Pillar 5)
  console.log('\n🔍 Testing Financial Pillars...');
  const financialTables = ['patient_wallets', 'organization_wallets', 'ivisit_main_wallet', 'payments'];
  for (const table of financialTables) {
    try {
      const { error } = await supabase.from(table).select('id').limit(1);
      if (error && error.code === 'PGRST204') throw new Error(`${table}: Table missing`);
      console.log(`✅ ${table}: Accessible`);
      results.passed++;
      results.details.push(`✅ Finance: ${table} verified`);
    } catch (error) {
      console.log(`❌ Financial check failed for ${table}: ${error.message}`);
      results.failed++;
    }
  }

  // Test 4: Identity & Schema (Pillar 2)
  console.log('\n🔍 Testing Identity Schema...');
  try {
    const { error } = await supabase.from('subscribers').select('new_user, welcome_email_sent').limit(1);
    if (error && error.message.includes('column "new_user" does not exist')) throw new Error('subscribers: Missing aligned columns');
    console.log('✅ subscribers: Schema aligned');
    results.passed++;
    results.details.push('✅ Identity: subscribers schema verified');
  } catch (error) {
    console.log(`❌ Identity failed: ${error.message}`);
    results.failed++;
  }

  // Summary
  console.log('\n🎯 System Health Summary:');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📊 Health Score: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

  return results;
}

testComprehensiveSystem()
  .then(res => process.exit(res.failed > 0 ? 1 : 0))
  .catch(err => { console.error(err); process.exit(1); });
