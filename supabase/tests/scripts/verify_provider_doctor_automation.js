#!/usr/bin/env node

const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  console.error('[verify-provider-doctor-automation] Missing Supabase credentials (.env/.env.local).');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PASSWORD = 'TempPass123!';
const TAG = `provider-doctor-sync-${Date.now()}`;

const adminEmail = `${TAG}-admin@ivisit-e2e.local`;
const viewerEmail = `${TAG}-viewer@ivisit-e2e.local`;

let tempAdminUserId = null;
let tempViewerUserId = null;
let tempOrgId = null;
let tempHospitalId = null;

async function cleanup() {
  const warnings = [];

  try {
    if (tempViewerUserId) {
      await admin.from('doctors').delete().eq('profile_id', tempViewerUserId);
    }
  } catch (error) {
    warnings.push(`doctor cleanup failed: ${error.message}`);
  }

  try {
    if (tempHospitalId) {
      await admin.from('hospitals').delete().eq('id', tempHospitalId);
    }
  } catch (error) {
    warnings.push(`hospital cleanup failed: ${error.message}`);
  }

  try {
    if (tempOrgId) {
      await admin.from('organization_wallets').delete().eq('organization_id', tempOrgId);
      await admin.from('organizations').delete().eq('id', tempOrgId);
    }
  } catch (error) {
    warnings.push(`organization cleanup failed: ${error.message}`);
  }

  try {
    if (tempViewerUserId) {
      await admin.auth.admin.deleteUser(tempViewerUserId);
    }
    if (tempAdminUserId) {
      await admin.auth.admin.deleteUser(tempAdminUserId);
    }
  } catch (error) {
    warnings.push(`auth cleanup failed: ${error.message}`);
  }

  if (warnings.length > 0) {
    console.warn('[verify-provider-doctor-automation] Cleanup warnings:');
    for (const warning of warnings) {
      console.warn(`  - ${warning}`);
    }
  }
}

async function createTempUser({ email, role, fullName }) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { role, full_name: fullName },
  });

  if (error) {
    throw new Error(`createUser(${email}) failed: ${error.message}`);
  }

  return data.user.id;
}

async function signInAsTempAdmin() {
  const anon = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await anon.auth.signInWithPassword({
    email: adminEmail,
    password: PASSWORD,
  });

  if (error) {
    throw new Error(`admin sign-in failed: ${error.message}`);
  }

  return createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
      },
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function run() {
  try {
    tempAdminUserId = await createTempUser({
      email: adminEmail,
      role: 'admin',
      fullName: 'Temp Automation Admin',
    });

    tempViewerUserId = await createTempUser({
      email: viewerEmail,
      role: 'viewer',
      fullName: 'Temp Viewer User',
    });

    const { data: org, error: orgError } = await admin
      .from('organizations')
      .insert({
        name: `Test Automation Org ${TAG}`,
      })
      .select('id')
      .single();

    if (orgError) {
      throw new Error(`organization insert failed: ${orgError.message}`);
    }
    tempOrgId = org.id;

    const { data: hospital, error: hospitalError } = await admin
      .from('hospitals')
      .insert({
        organization_id: tempOrgId,
        name: `Test Automation Hospital ${TAG}`,
        address: '1 Test Lane',
        verified: true,
        verification_status: 'verified',
        status: 'available',
      })
      .select('id')
      .single();

    if (hospitalError) {
      throw new Error(`hospital insert failed: ${hospitalError.message}`);
    }
    tempHospitalId = hospital.id;

    const adminSessionClient = await signInAsTempAdmin();

    const { error: roleOnlyError } = await adminSessionClient.rpc('update_profile_by_admin', {
      target_user_id: tempViewerUserId,
      profile_data: {
        role: 'provider',
        organization_id: tempOrgId,
        full_name: 'Dr Temp Automation',
      },
    });
    if (roleOnlyError) {
      throw new Error(`role-only update failed: ${roleOnlyError.message}`);
    }

    const { data: preDoctorRows, error: preDoctorError } = await admin
      .from('doctors')
      .select('id')
      .eq('profile_id', tempViewerUserId);

    if (preDoctorError) {
      throw new Error(`pre-doctor query failed: ${preDoctorError.message}`);
    }

    const { error: doctorUpgradeError } = await adminSessionClient.rpc('update_profile_by_admin', {
      target_user_id: tempViewerUserId,
      profile_data: {
        role: 'provider',
        provider_type: 'doctor',
        organization_id: tempOrgId,
        full_name: 'Dr Temp Automation',
      },
    });
    if (doctorUpgradeError) {
      throw new Error(`doctor upgrade update failed: ${doctorUpgradeError.message}`);
    }

    const { data: postDoctorRows, error: postDoctorError } = await admin
      .from('doctors')
      .select('id, profile_id, hospital_id, name, email, status, created_at')
      .eq('profile_id', tempViewerUserId)
      .order('created_at', { ascending: true });

    if (postDoctorError) {
      throw new Error(`post-doctor query failed: ${postDoctorError.message}`);
    }

    const { data: orgHospitals, error: orgHospitalsError } = await admin
      .from('hospitals')
      .select('id, created_at')
      .eq('organization_id', tempOrgId)
      .order('created_at', { ascending: true });

    if (orgHospitalsError) {
      throw new Error(`org hospitals query failed: ${orgHospitalsError.message}`);
    }

    const expectedHospitalId = orgHospitals?.[0]?.id || null;
    const createdDoctor = postDoctorRows?.[0] || null;

    const assertions = {
      noDoctorOnRoleOnlyUpdate: (preDoctorRows || []).length === 0,
      exactlyOneDoctorAfterTypeUpgrade: (postDoctorRows || []).length === 1,
      doctorHospitalMatchesOrgHospital:
        createdDoctor?.hospital_id && createdDoctor.hospital_id === expectedHospitalId,
    };

    const ok = Object.values(assertions).every(Boolean);

    const result = {
      ok,
      assertions,
      expectedHospitalId,
      createdDoctor,
      tempIds: {
        adminUserId: tempAdminUserId,
        viewerUserId: tempViewerUserId,
        organizationId: tempOrgId,
        hospitalId: tempHospitalId,
      },
    };

    console.log(JSON.stringify(result, null, 2));

    if (!ok) {
      throw new Error('one or more automation assertions failed');
    }

    console.log('[verify-provider-doctor-automation] PASS');
  } finally {
    await cleanup();
  }
}

run().catch((error) => {
  console.error('[verify-provider-doctor-automation] FAIL:', error.message);
  process.exit(1);
});
