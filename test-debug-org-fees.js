// Debug script to test organization fee calculation
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function debugOrgFees() {
  console.log('🔍 Debugging Organization Fee Calculation\n');

  // Test the debug function
  try {
    const { data, error } = await supabase.rpc('debug_organization_fee', {
      p_hospital_id: 'af9b6856-59e3-442d-94af-e39a8a261818' // Known hospital ID
    });

    if (error) {
      console.log('❌ Debug function failed:', error.message);
    } else {
      console.log('✅ Debug function results:');
      data.forEach(row => {
        console.log(`   Hospital: ${row.hospital_name}`);
        console.log(`   Organization ID: ${row.organization_id}`);
        console.log(`   Organization Name: ${row.organization_name}`);
        console.log(`   Fee Percentage: ${row.fee_percentage}%`);
      });
    }
  } catch (err) {
    console.log('❌ Debug error:', err.message);
  }

  // Test direct organization lookup
  console.log('\n2. Testing direct organization lookup...');
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('id, name, ivisit_fee_percentage')
      .eq('id', 'af9b6856-59e3-442d-94af-e39a8a261818')
      .single();

    if (error) {
      console.log('❌ Direct lookup failed:', error.message);
    } else {
      console.log('✅ Direct lookup result:');
      console.log(`   Organization ID: ${data.id}`);
      console.log(`   Organization Name: ${data.name}`);
      console.log(`   Fee Percentage: ${data.ivisit_fee_percentage}%`);
    }
  } catch (err) {
    console.log('❌ Direct lookup error:', err.message);
  }

  // Test hospital-organization join
  console.log('\n3. Testing hospital-organization join...');
  try {
    const { data, error } = await supabase
      .from('hospitals')
      .select(`
        id,
        name,
        organization_id,
        organizations!hospitals_organization_id_fkey (
          id,
          name,
          ivisit_fee_percentage
        )
      `)
      .eq('id', 'af9b6856-59e3-442d-94af-e39a8a261818')
      .single();

    if (error) {
      console.log('❌ Hospital-organization join failed:', error.message);
    } else {
      console.log('✅ Hospital-organization join result:');
      console.log(`   Hospital ID: ${data.id}`);
      console.log(`   Hospital Name: ${data.name}`);
      console.log(`   Organization ID: ${data.organization_id}`);
      if (data.organizations) {
        console.log(`   Organization Name: ${data.organizations.name}`);
        console.log(`   Organization Fee: ${data.organizations.ivisit_fee_percentage}%`);
      } else {
        console.log('   ⚠️ Organization data missing');
      }
    }
  } catch (err) {
    console.log('❌ Hospital-organization join error:', err.message);
  }
}

debugOrgFees().catch(console.error);
