/**
 * AUDIT SCRIPT: MODULE 1 (IDENTITY & ACCESS)
 * Verifies: Profiles, Roles, RBAC Functions, and Admin Stats.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

// We use the test user ID found in previous logs
const testUserId = '04e905d8-44e3-4300-bc64-741a4f868995';

async function auditIdentityModule() {
  console.log('🛡️  AUDITING MODULE 1: IDENTITY & ACCESS\n');

  // 1. Check profiles schema & RLS (SELECT)
  console.log('1. [READ] Checking public.profiles SELECT...');
  const { data: profile, error: readError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', testUserId)
    .single();

  if (readError) {
    console.error('   ❌ Profile Read Failed:', readError.message);
    if (readError.code === '42P17') console.error('      !!! RECURSION DETECTED !!!');
  } else {
    console.log('   ✅ Profile Read Success:', profile.full_name, `[Role: ${profile.role}]`);
    console.log('      - ID Type:', typeof profile.id === 'string' && profile.id.length === 36 ? 'UUID ✅' : 'TEXT ⚠️');
    console.log('      - Org ID Type:', !profile.organization_id || (typeof profile.organization_id === 'string' && profile.organization_id.length === 36) ? 'UUID ✅' : 'TEXT ⚠️');
  }

  // 2. Check profiles RLS (UPDATE)
  console.log('\n2. [UPDATE] Checking public.profiles UPDATE...');
  const newName = 'Audit Test ' + new Date().getTime();
  const { data: updateData, error: updateError } = await supabase
    .from('profiles')
    .update({ full_name: newName })
    .eq('id', testUserId)
    .select();

  if (updateError) {
    console.error('   ❌ Profile Update Failed:', updateError.message);
  } else {
    console.log('   ✅ Profile Update Success. Rows affected:', updateData?.length);
  }

  // 3. Check RBAC Helper (get_current_user_role)
  console.log('\n3. [RPC] Checking get_current_user_role()...');
  const { data: role, error: roleError } = await supabase.rpc('get_current_user_role');
  if (roleError) {
    console.error('   ❌ RPC Failed:', roleError.message);
  } else {
    console.log('   ✅ RPC Success: current role is', role);
  }

  // 4. Check Admin Listing (get_all_auth_users)
  console.log('\n4. [RPC] Checking get_all_auth_users()...');
  const { data: users, error: usersError } = await supabase.rpc('get_all_auth_users');
  if (usersError) {
    console.error('   ❌ RPC Failed:', usersError.message);
  } else {
    console.log('   ✅ RPC Success: found', users?.length, 'authenticated users.');
  }

  // 5. Check Dashboard Stats (get_user_statistics)
  console.log('\n5. [RPC] Checking get_user_statistics()...');
  const { data: stats, error: statsError } = await supabase.rpc('get_user_statistics');
  if (statsError) {
    console.error('   ❌ RPC Failed:', statsError.message);
  } else {
    console.log('   ✅ RPC Success:', stats?.[0]);
  }

  console.log('\n🏁 MODULE 1 AUDIT COMPLETE');
}

auditIdentityModule().catch(console.error);
