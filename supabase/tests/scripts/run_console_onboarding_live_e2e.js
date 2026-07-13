const crypto = require('crypto');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

const appRoot = path.resolve(__dirname, '..', '..', '..');
dotenv.config({ path: path.join(appRoot, '.env.local') });
dotenv.config({ path: path.join(appRoot, '.env') });
dotenv.config({ path: path.resolve(appRoot, '..', 'ivisit-console', 'frontend', '.env') });
dotenv.config({ path: path.resolve(appRoot, '..', 'ivisit-console', 'frontend', '.env.local') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
const inviteTestMailbox = process.env.IVISIT_TEST_ADMIN_EMAIL;
const expectedProjectRef = process.argv
  .find((arg) => arg.startsWith('--project-ref='))
  ?.slice('--project-ref='.length);

if (!supabaseUrl || !anonKey || !serviceRoleKey || !inviteTestMailbox) {
  console.error('[console-onboarding-live-e2e] Missing Supabase credentials.');
  process.exit(1);
}

const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
if (!expectedProjectRef || expectedProjectRef !== projectRef) {
  console.error(
    `[console-onboarding-live-e2e] Refusing live test. Pass --project-ref=${projectRef} to confirm the target.`
  );
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const publicClient = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function buildInviteAlias(email, runId) {
  const at = email.lastIndexOf('@');
  if (at <= 0) throw new Error('The configured invite test mailbox is invalid');
  const local = email.slice(0, at).split('+')[0];
  const domain = email.slice(at + 1);
  return `${local}+console-invite-${runId}@${domain}`;
}

async function describeFunctionError(error) {
  try {
    const body = await error?.context?.clone?.().json();
    if (body?.error) return body.error;
  } catch {
    // Fall back to the SDK message below.
  }
  return error?.message || 'Unknown Edge Function error';
}

async function waitForProfile(userId) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const { data, error } = await admin
      .from('profiles')
      .select('id, role, onboarding_status, organization_id, phone')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    if (data) return data;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Auth trigger did not create the test profile');
}

async function removeStoragePaths(paths) {
  if (!paths.length) return;
  const { error } = await admin.storage.from('documents').remove(paths);
  if (error) throw error;
}

async function cleanup(state) {
  const cleanupErrors = [];
  const safely = async (label, operation) => {
    try {
      await operation();
    } catch (error) {
      cleanupErrors.push(`${label}: ${error.message}`);
    }
  };

  await safely('storage objects', () => removeStoragePaths([...state.storagePaths]));

  await safely('invited profile lookup', async () => {
    if (!state.inviteEmail) return;
    const { data, error } = await admin
      .from('profiles')
      .select('id')
      .eq('email', state.inviteEmail);
    if (error) throw error;
    data.forEach((profile) => state.invitedUserIds.add(profile.id));
  });

  for (const invitedUserId of state.invitedUserIds) {
    await safely(`invited profile scope ${invitedUserId}`, async () => {
      const { error } = await admin
        .from('profiles')
        .update({ organization_id: null, role: 'patient', onboarding_status: 'pending' })
        .eq('id', invitedUserId);
      if (error) throw error;
    });
    await safely(`invited Auth user ${invitedUserId}`, async () => {
      const { error } = await admin.auth.admin.deleteUser(invitedUserId);
      if (error && !/not found/i.test(error.message)) throw error;
    });
  }

  if (state.userId) {
    await safely('verification evidence', async () => {
      const { error } = await admin
        .from('organization_verification_documents')
        .delete()
        .eq('uploaded_by', state.userId);
      if (error) throw error;
    });

    await safely('organization lookup', async () => {
      const { data, error } = await admin
        .from('organizations')
        .select('id')
        .or(`created_by.eq.${state.userId},name.eq.${state.organizationName}`);
      if (error) throw error;
      data.forEach((organization) => state.organizationIds.add(organization.id));
    });

    await safely('profile scope reset', async () => {
      const { error } = await admin
        .from('profiles')
        .update({ organization_id: null, role: 'patient', onboarding_status: 'pending' })
        .eq('id', state.userId);
      if (error) throw error;
    });
  }

  const organizationIds = [...state.organizationIds];
  if (organizationIds.length) {
    await safely('test facilities', async () => {
      const { error } = await admin.from('hospitals').delete().in('organization_id', organizationIds);
      if (error) throw error;
    });
    await safely('test wallets', async () => {
      const { error } = await admin
        .from('organization_wallets')
        .delete()
        .in('organization_id', organizationIds);
      if (error) throw error;
    });
    await safely('test organizations', async () => {
      const { error } = await admin.from('organizations').delete().in('id', organizationIds);
      if (error) throw error;
    });
  }

  if (state.userId) {
    await safely('Auth user', async () => {
      const { error } = await admin.auth.admin.deleteUser(state.userId);
      if (error && !/not found/i.test(error.message)) throw error;
    });
  }

  await safely('database residue check', async () => {
    const [{ data: profiles, error: profileError }, { data: organizations, error: orgError }] =
      await Promise.all([
        state.userId
          ? admin.from('profiles').select('id').eq('id', state.userId)
          : Promise.resolve({ data: [], error: null }),
        admin.from('organizations').select('id').eq('name', state.organizationName),
      ]);
    if (profileError) throw profileError;
    if (orgError) throw orgError;
    if (profiles.length || organizations.length) {
      throw new Error('temporary rows remain');
    }

    if (state.inviteEmail) {
      const { data: invitedProfiles, error: invitedProfileError } = await admin
        .from('profiles')
        .select('id')
        .eq('email', state.inviteEmail);
      if (invitedProfileError) throw invitedProfileError;
      if (invitedProfiles.length) throw new Error('temporary invited profile remains');
    }
  });

  for (const storagePath of state.storagePaths) {
    await safely(`storage residue ${storagePath}`, async () => {
      const slash = storagePath.lastIndexOf('/');
      const folder = storagePath.slice(0, slash);
      const filename = storagePath.slice(slash + 1);
      const { data, error } = await admin.storage.from('documents').list(folder, { search: filename });
      if (error) throw error;
      if (data.some((item) => item.name === filename)) throw new Error('temporary object remains');
    });
  }

  if (cleanupErrors.length) {
    throw new Error(`Cleanup failed: ${cleanupErrors.join('; ')}`);
  }
}

async function main() {
  const runId = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const password = `Contract!${crypto.randomBytes(12).toString('base64url')}`;
  const email = `console-onboarding-live-${runId}@ivisit-e2e.local`;
  const organizationName = `Console Live Contract Hospital ${runId}`;
  const registrationNumber = `LIVE-${runId}`;
  const inviteEmail = buildInviteAlias(inviteTestMailbox, runId);
  const state = {
    userId: null,
    organizationName,
    organizationIds: new Set(),
    storagePaths: new Set(),
    inviteEmail,
    invitedUserIds: new Set(),
  };
  let testError = null;

  console.log(`[console-onboarding-live-e2e] target=${projectRef} run=${runId}`);

  try {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'Console Live Contract', role: 'admin' },
    });
    if (createError) throw createError;
    state.userId = created.user.id;

    const initialProfile = await waitForProfile(state.userId);
    assert(initialProfile.role === 'patient', 'Public Auth metadata elevated the live test user');
    assert(initialProfile.onboarding_status === 'pending', 'New profile is not pending onboarding');
    assert(initialProfile.organization_id === null, 'New profile acquired an organization prematurely');

    const { data: signIn, error: signInError } = await publicClient.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) throw signInError;

    const authenticated = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${signIn.session.access_token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: pendingProjection, error: projectionError } = await authenticated.rpc(
      'get_console_identity_projection'
    );
    if (projectionError) throw projectionError;
    assert(
      pendingProjection?.organizationScope?.state === 'pending_onboarding',
      'Pending account did not receive the pending identity projection'
    );

    const { error: anonymousProvisionError } = await publicClient.rpc(
      'provision_console_organization',
      { p_payload: {} }
    );
    assert(anonymousProvisionError, 'Anonymous provisioning unexpectedly succeeded');

    const ownPath = `onboarding/${state.userId}/${crypto.randomUUID()}.png`;
    const otherPath = `onboarding/${crypto.randomUUID()}/${crypto.randomUUID()}.png`;
    state.storagePaths.add(ownPath);
    state.storagePaths.add(otherPath);
    const tinyPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64'
    );

    const { error: ownUploadError } = await authenticated.storage
      .from('documents')
      .upload(ownPath, tinyPng, { contentType: 'image/png', upsert: false });
    if (ownUploadError) throw new Error(`Own-path upload failed: ${ownUploadError.message}`);

    const { error: crossPathError } = await authenticated.storage
      .from('documents')
      .upload(otherPath, tinyPng, { contentType: 'image/png', upsert: false });
    assert(crossPathError, 'Cross-user onboarding evidence upload unexpectedly succeeded');

    const payload = {
      organizationType: 'hospital',
      organizationName,
      registrationNumber,
      contactEmail: email,
      phone: '+1 555 0199',
      address: '450 Live Contract Way',
      city: 'Los Angeles',
      state: 'California',
      termsAccepted: true,
      documents: [
        {
          storagePath: ownPath,
          documentType: 'license',
          originalName: 'live-contract-license.png',
          mimeType: 'image/png',
          sizeBytes: tinyPng.length,
        },
      ],
    };

    const { data: provisioned, error: provisionError } = await authenticated.rpc(
      'provision_console_organization',
      { p_payload: payload }
    );
    if (provisionError) throw provisionError;
    assert(provisioned?.success === true, 'Live provisioning did not return success');
    assert(provisioned?.provisioningVerified === true, 'Live provisioning was not backend-reflected');
    assert(provisioned?.role === 'org_admin', 'Live provisioning returned the wrong role');
    assert(provisioned?.organization?.walletState === 'ready', 'Organization wallet is not ready');
    assert(provisioned?.organization?.verificationStatus === 'pending', 'Organization skipped review');
    assert(provisioned?.facility?.verificationStatus === 'pending', 'Facility skipped review');
    assert(provisioned?.facility?.dispatchEligible === false, 'Pending facility became dispatch eligible');

    const organizationId = provisioned.organization.id;
    state.organizationIds.add(organizationId);
    assert(
      organizationId !== provisioned.facility.id,
      'Organization and facility identity collapsed in the live receiver'
    );

    const { data: reflected, error: reflectedError } = await authenticated.rpc(
      'get_console_identity_projection'
    );
    if (reflectedError) throw reflectedError;
    assert(reflected?.profile?.role === 'org_admin', 'Identity projection did not reflect the role');
    assert(reflected?.organizationScope?.state === 'ready', 'Identity projection is not ready');
    assert(
      reflected?.organizationScope?.organizationId === organizationId,
      'Identity projection returned the wrong organization'
    );
    assert(
      reflected?.organizationScope?.primaryFacilityId === provisioned.facility.id,
      'Identity projection returned the wrong facility'
    );
    assert(
      Array.isArray(reflected?.organizationScope?.facilityIds)
        && reflected.organizationScope.facilityIds.length === 1
        && reflected.organizationScope.facilityIds[0] === provisioned.facility.id,
      'Identity projection did not return the complete facility scope'
    );
    assert(
      reflected?.organizationScope?.walletInitialized === true,
      'Identity projection did not reflect the wallet'
    );

    const { data: scopedStats, error: scopedStatsError } = await authenticated.rpc(
      'get_user_statistics'
    );
    if (scopedStatsError) throw scopedStatsError;
    assert(scopedStats?.[0]?.total_profiles === 1, 'Organization statistics escaped profile scope');
    assert(scopedStats?.[0]?.provider_count === 0, 'Organization statistics exposed other providers');
    assert(scopedStats?.[0]?.org_admin_count === 1, 'Organization statistics missed its administrator');

    const { error: unsafeProfileError } = await authenticated
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', state.userId);
    assert(unsafeProfileError, 'Direct profile role escalation unexpectedly succeeded');

    const { error: safeProfileError } = await authenticated
      .from('profiles')
      .update({ phone: '+1 555 0188' })
      .eq('id', state.userId);
    if (safeProfileError) throw new Error(`Safe self-service profile edit failed: ${safeProfileError.message}`);

    const { error: rpcEscalationError } = await authenticated.rpc('update_profile_by_admin', {
      target_user_id: state.userId,
      profile_data: { role: 'admin' },
    });
    assert(rpcEscalationError, 'Org-admin self-promotion through the RPC unexpectedly succeeded');

    await authenticated.storage.from('documents').remove([ownPath]);
    const ownSlash = ownPath.lastIndexOf('/');
    const ownFolder = ownPath.slice(0, ownSlash);
    const ownFilename = ownPath.slice(ownSlash + 1);
    const { data: linkedObjects, error: linkedObjectError } = await admin.storage
      .from('documents')
      .list(ownFolder, { search: ownFilename });
    if (linkedObjectError) throw linkedObjectError;
    assert(
      linkedObjects.some((item) => item.name === ownFilename),
      'Submitter deleted evidence after it was linked for review'
    );

    const { data: repeated, error: repeatError } = await authenticated.rpc(
      'provision_console_organization',
      { p_payload: payload }
    );
    if (repeatError) throw repeatError;
    assert(repeated?.organization?.id === organizationId, 'Repeated provisioning created another organization');

    const [orgCountResult, facilityCountResult, evidenceCountResult] = await Promise.all([
      admin.from('organizations').select('id', { count: 'exact', head: true }).eq('created_by', state.userId),
      admin.from('hospitals').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
      admin
        .from('organization_verification_documents')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId),
    ]);
    if (orgCountResult.error) throw orgCountResult.error;
    if (facilityCountResult.error) throw facilityCountResult.error;
    if (evidenceCountResult.error) throw evidenceCountResult.error;
    assert(orgCountResult.count === 1, 'Live provisioning duplicated the organization');
    assert(facilityCountResult.count === 1, 'Live provisioning duplicated the facility');
    assert(evidenceCountResult.count === 1, 'Live provisioning duplicated the evidence record');

    const anonymous = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: anonymousInviteError } = await anonymous.functions.invoke('invite-user', {
      body: { email: inviteEmail, role: 'viewer', organization_id: organizationId },
    });
    assert(anonymousInviteError, 'Anonymous invitation unexpectedly succeeded');

    const { error: privilegedInviteError } = await authenticated.functions.invoke('invite-user', {
      body: {
        email: `console-invite-privileged-${runId}@ivisit-e2e.local`,
        role: 'org_admin',
        organization_id: organizationId,
      },
    });
    assert(privilegedInviteError, 'Organization admin invited another organization admin');

    const { data: invitation, error: invitationError } = await authenticated.functions.invoke(
      'invite-user',
      { body: { email: inviteEmail, role: 'viewer', organization_id: organizationId } }
    );
    if (invitationError) {
      throw new Error(`Invitation receiver failed: ${await describeFunctionError(invitationError)}`);
    }
    assert(invitation?.success === true, 'Invitation receiver did not return success');
    assert(invitation?.delivery?.emailQueued === true, 'Invitation delivery was not queued');
    assert(invitation?.delivery?.roleGranted === true, 'Invitation role was not assigned');
    assert(invitation?.delivery?.organizationLinked === true, 'Invitation organization was not linked');

    const { data: invitedProfile, error: invitedProfileError } = await admin
      .from('profiles')
      .select('id, role, organization_id, onboarding_status')
      .eq('email', inviteEmail)
      .single();
    if (invitedProfileError) throw invitedProfileError;
    state.invitedUserIds.add(invitedProfile.id);
    assert(invitedProfile.role === 'viewer', 'Invited profile received the wrong role');
    assert(invitedProfile.organization_id === organizationId, 'Invited profile received the wrong organization');
    assert(invitedProfile.onboarding_status === 'complete', 'Invited profile was sent through self-registration');

    const { data: invitedAuth, error: invitedAuthError } = await admin.auth.admin.getUserById(invitedProfile.id);
    if (invitedAuthError) throw invitedAuthError;
    assert(
      invitedAuth.user?.user_metadata?.invited_by === state.userId,
      'Invitation Auth proof does not identify the actor'
    );
    assert(
      !Object.prototype.hasOwnProperty.call(invitedAuth.user?.user_metadata || {}, 'role'),
      'Invitation stored an elevated role in public Auth metadata'
    );

    console.log('[console-onboarding-live-e2e] All live Auth, Storage, RPC, invite, and reflection assertions passed.');
  } catch (error) {
    testError = error;
  }

  try {
    await cleanup(state);
    console.log('[console-onboarding-live-e2e] Temporary live data and Storage objects were removed.');
  } catch (cleanupError) {
    if (testError) {
      throw new Error(`${testError.message}; ${cleanupError.message}`);
    }
    throw cleanupError;
  }

  if (testError) throw testError;
}

main().catch((error) => {
  console.error(`[console-onboarding-live-e2e] ${error.message}`);
  process.exit(1);
});
