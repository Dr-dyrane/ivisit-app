const crypto = require('crypto');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const {
  createDemoRunManifest,
  defaultManifestPath,
  markCleanupAttempt,
  registerResource,
  saveManifest,
} = require('./demo_run_manifest');

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

function persistManifest(state) {
  if (!state.manifest || !state.manifestPath) return;
  saveManifest(state.manifest, state.manifestPath);
}

function trackResource(state, setKey, manifestKey, value) {
  if (!value) throw new Error(`Cannot track empty ${manifestKey}`);
  state[setKey].add(value);
  registerResource(state.manifest, manifestKey, value);
  persistManifest(state);
  return value;
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

  for (const onboardingUserId of state.additionalOnboardingUserIds) {
    await safely(`verification evidence ${onboardingUserId}`, async () => {
      const { error } = await admin
        .from('organization_verification_documents')
        .delete()
        .eq('uploaded_by', onboardingUserId);
      if (error) throw error;
    });
    await safely(`organization lookup ${onboardingUserId}`, async () => {
      const { data, error } = await admin
        .from('organizations')
        .select('id')
        .eq('created_by', onboardingUserId);
      if (error) throw error;
      data.forEach((organization) => state.organizationIds.add(organization.id));
    });
    await safely(`profile scope reset ${onboardingUserId}`, async () => {
      const { error } = await admin
        .from('profiles')
        .update({ organization_id: null, role: 'patient', onboarding_status: 'pending' })
        .eq('id', onboardingUserId);
      if (error) throw error;
    });
  }

  const organizationIds = [...state.organizationIds];
  if (organizationIds.length) {
    await safely('test facility claims', async () => {
      const { error } = await admin
        .from('organization_facility_claims')
        .delete()
        .in('organization_id', organizationIds);
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

  for (const createdFacilityId of state.createdFacilityIds) {
    await safely(`test-created facility ${createdFacilityId}`, async () => {
      const { error } = await admin.from('hospitals').delete().eq('id', createdFacilityId);
      if (error) throw error;
    });
  }

  if (state.userId) {
    await safely('Auth user', async () => {
      const { error } = await admin.auth.admin.deleteUser(state.userId);
      if (error && !/not found/i.test(error.message)) throw error;
    });
  }

  for (const authUserId of state.additionalAuthUserIds) {
    await safely(`Auth user ${authUserId}`, async () => {
      const { error } = await admin.auth.admin.deleteUser(authUserId);
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

    for (const createdFacilityId of state.createdFacilityIds) {
      const { data: createdFacilities, error: createdFacilityError } = await admin
        .from('hospitals')
        .select('id')
        .eq('id', createdFacilityId);
      if (createdFacilityError) throw createdFacilityError;
      if (createdFacilities.length) {
        throw new Error(`temporary facility ${createdFacilityId} remains`);
      }
    }

    for (const authUserId of state.additionalAuthUserIds) {
      const { data: additionalProfiles, error: additionalProfileError } = await admin
        .from('profiles')
        .select('id')
        .eq('id', authUserId);
      if (additionalProfileError) throw additionalProfileError;
      if (additionalProfiles.length) throw new Error(`temporary profile ${authUserId} remains`);
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

async function createAuthenticatedTestClient({ email, password, fullName, state, onboardingUser = false }) {
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: 'admin' },
  });
  if (createError) throw createError;
  trackResource(state, 'additionalAuthUserIds', 'authUserIds', created.user.id);
  if (onboardingUser) state.additionalOnboardingUserIds.add(created.user.id);

  const profile = await waitForProfile(created.user.id);
  assert(profile.role === 'patient', `${fullName} inherited authority from public metadata`);

  const { data: signIn, error: signInError } = await publicClient.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) throw signInError;

  return {
    userId: created.user.id,
    client: createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${signIn.session.access_token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  };
}

async function runClaimVerificationFlow({ runId, state, tinyPng }) {
  const runLabel = runId.slice(-8);
  const claimantPassword = `Claimant!${crypto.randomBytes(12).toString('base64url')}`;
  const reviewerPassword = `Reviewer!${crypto.randomBytes(12).toString('base64url')}`;
  const claimantEmail = `console-claimant-live-${runId}@ivisit-e2e.local`;
  const reviewerEmail = `console-reviewer-live-${runId}@ivisit-e2e.local`;
  const claimOrganizationName = `[DEMO ${runLabel}] Console Claim Organization`;
  const claimFacilityName = `[DEMO ${runLabel}] Console Claim Facility`;
  const claimLatitude = 34.05;
  const claimLongitude = -118.25;

  const claimant = await createAuthenticatedTestClient({
    email: claimantEmail,
    password: claimantPassword,
    fullName: 'Console Live Claimant',
    state,
    onboardingUser: true,
  });
  const reviewer = await createAuthenticatedTestClient({
    email: reviewerEmail,
    password: reviewerPassword,
    fullName: 'Console Live Reviewer',
    state,
  });

  const { error: reviewerRoleError } = await admin
    .from('profiles')
    .update({ role: 'admin', onboarding_status: 'complete' })
    .eq('id', reviewer.userId);
  if (reviewerRoleError) throw reviewerRoleError;

  const { data: claimFacility, error: claimFacilityError } = await admin
    .from('hospitals')
    .insert({
      name: claimFacilityName,
      address: '700 Live Claim Avenue, Los Angeles, California',
      latitude: claimLatitude,
      longitude: claimLongitude,
      coordinates: `SRID=4326;POINT(${claimLongitude} ${claimLatitude})`,
      verified: false,
      verification_status: 'pending',
      status: 'available',
      organization_id: null,
      provider_type: 'hospital',
      emergency_eligible: true,
      booking_eligible: true,
      provider_source: 'manual_seed',
      place_id: `e2e:${runId}:facility:claim`,
      features: [
        `demo_scope:${runId}`,
        `demo_owner:${state.manifest.owner.id}`,
        `demo_expires_at:${Date.parse(state.manifest.expiresAt)}`,
      ],
    })
    .select('id')
    .single();
  if (claimFacilityError) throw claimFacilityError;
  trackResource(state, 'createdFacilityIds', 'createdFacilityIds', claimFacility.id);

  const { data: searchResults, error: searchError } = await claimant.client.rpc(
    'search_onboarding_facilities',
    { p_query: claimFacilityName }
  );
  if (searchError) throw searchError;
  const discovered = searchResults.find((facility) => facility.id === claimFacility.id);
  assert(discovered?.ownership_state === 'unowned', 'Unowned facility search state was not reflected');
  assert(discovered?.claimable === true, 'Unowned facility was not claimable');
  assert(discovered?.requires_support === true, 'Claim correctly requiring review was hidden');

  const initialPath = `onboarding/${claimant.userId}/${crypto.randomUUID()}.png`;
  const correctedPath = `onboarding/${claimant.userId}/${crypto.randomUUID()}.png`;
  trackResource(state, 'storagePaths', 'storagePaths', initialPath);
  trackResource(state, 'storagePaths', 'storagePaths', correctedPath);
  const { error: initialUploadError } = await claimant.client.storage
    .from('documents')
    .upload(initialPath, tinyPng, { contentType: 'image/png', upsert: false });
  if (initialUploadError) throw initialUploadError;

  const basePayload = {
    organizationType: 'hospital',
    organizationName: claimOrganizationName,
    registrationNumber: `LIVE-CLAIM-${runId}`,
    contactEmail: claimantEmail,
    phone: '+1 555 0177',
    address: '702 Live Claim Avenue',
    city: 'Los Angeles',
    state: 'California',
    termsAccepted: true,
    existingFacilityId: claimFacility.id,
    claimNote: 'Disposable live ownership claim contract.',
  };
  const { data: provisioned, error: provisionError } = await claimant.client.rpc(
    'provision_console_organization',
    {
      p_payload: {
        ...basePayload,
        documents: [{
          storagePath: initialPath,
          documentType: 'registration',
          originalName: 'claim-registration.png',
          mimeType: 'image/png',
          sizeBytes: tinyPng.length,
        }],
      },
    }
  );
  if (provisionError) throw provisionError;
  const claimOrganizationId = provisioned?.organization?.id;
  const claimId = provisioned?.claim?.id;
  trackResource(state, 'organizationIds', 'organizationIds', claimOrganizationId);
  registerResource(state.manifest, 'claimIds', claimId);
  persistManifest(state);
  assert(provisioned?.claim?.status === 'pending', 'Ownership claim skipped review');
  assert(provisioned?.facility?.ownershipState === 'claim_pending', 'Claim pending state was not reflected');

  const { data: initialEvidence, error: initialEvidenceError } = await admin
    .from('organization_verification_documents')
    .select('id, review_status')
    .eq('organization_id', claimOrganizationId)
    .eq('facility_claim_id', claimId)
    .eq('storage_path', initialPath)
    .single();
  if (initialEvidenceError) throw initialEvidenceError;
  registerResource(state.manifest, 'evidenceIds', initialEvidence.id);
  persistManifest(state);

  const { data: preLinkFacility, error: preLinkError } = await admin
    .from('hospitals')
    .select('organization_id, verified, dispatch_eligible')
    .eq('id', claimFacility.id)
    .single();
  if (preLinkError) throw preLinkError;
  assert(preLinkFacility.organization_id === null, 'Claim submission transferred ownership prematurely');
  assert(preLinkFacility.verified === false, 'Claim submission verified the facility prematurely');
  assert(preLinkFacility.dispatch_eligible === false, 'Claim submission enabled dispatch prematurely');

  const { error: prematureClaimApproval } = await reviewer.client.rpc(
    'review_console_facility_claim',
    { p_claim_id: claimId, p_decision: 'approve' }
  );
  assert(prematureClaimApproval, 'Claim approval bypassed accepted evidence');

  for (const [rpc, args] of [
    ['review_organization_verification_document', {
      p_document_id: initialEvidence.id,
      p_decision: 'request_changes',
      p_note: 'Upload the current registration page.',
    }],
    ['review_console_facility_claim', {
      p_claim_id: claimId,
      p_decision: 'request_changes',
      p_note: 'Current ownership evidence is required.',
    }],
    ['review_console_organization', {
      p_organization_id: claimOrganizationId,
      p_decision: 'request_changes',
      p_note: 'Complete the requested evidence update.',
    }],
  ]) {
    const { error } = await reviewer.client.rpc(rpc, args);
    if (error) throw error;
  }

  const { error: correctedUploadError } = await claimant.client.storage
    .from('documents')
    .upload(correctedPath, tinyPng, { contentType: 'image/png', upsert: false });
  if (correctedUploadError) throw correctedUploadError;
  const { data: requeued, error: requeueError } = await claimant.client.rpc(
    'provision_console_organization',
    {
      p_payload: {
        ...basePayload,
        documents: [{
          storagePath: correctedPath,
          documentType: 'registration',
          originalName: 'claim-registration-current.png',
          mimeType: 'image/png',
          sizeBytes: tinyPng.length,
        }],
      },
    }
  );
  if (requeueError) throw requeueError;
  assert(requeued?.organization?.id === claimOrganizationId, 'Correction duplicated the organization');
  assert(requeued?.claim?.id === claimId, 'Correction duplicated the ownership claim');
  assert(requeued?.claim?.status === 'pending', 'Corrected evidence did not requeue the claim');

  const { data: correctedEvidence, error: correctedEvidenceError } = await admin
    .from('organization_verification_documents')
    .select('id')
    .eq('organization_id', claimOrganizationId)
    .eq('facility_claim_id', claimId)
    .eq('storage_path', correctedPath)
    .single();
  if (correctedEvidenceError) throw correctedEvidenceError;
  registerResource(state.manifest, 'evidenceIds', correctedEvidence.id);
  persistManifest(state);

  const { error: evidenceApprovalError } = await reviewer.client.rpc(
    'review_organization_verification_document',
    { p_document_id: correctedEvidence.id, p_decision: 'accept' }
  );
  if (evidenceApprovalError) throw evidenceApprovalError;
  const { data: approvedClaim, error: claimApprovalError } = await reviewer.client.rpc(
    'review_console_facility_claim',
    { p_claim_id: claimId, p_decision: 'approve' }
  );
  if (claimApprovalError) throw claimApprovalError;
  assert(approvedClaim?.facilityOwnershipLinked === true, 'Claim approval did not link ownership');

  const readNearby = async () => {
    const { data, error } = await publicClient.rpc('nearby_hospitals', {
      user_lat: claimLatitude,
      user_lng: claimLongitude,
      radius_km: 5,
    });
    if (error) throw error;
    return data.some((facility) => facility.id === claimFacility.id);
  };
  assert(!(await readNearby()), 'Ownership approval bypassed App emergency eligibility');

  const { error: organizationApprovalError } = await reviewer.client.rpc(
    'review_console_organization',
    { p_organization_id: claimOrganizationId, p_decision: 'approve' }
  );
  if (organizationApprovalError) throw organizationApprovalError;
  assert(!(await readNearby()), 'Organization approval bypassed facility verification');

  const { error: facilityApprovalError } = await reviewer.client.rpc(
    'update_hospital_by_admin',
    {
      target_hospital_id: claimFacility.id,
      payload: { verified: true, verification_status: 'verified' },
    }
  );
  if (facilityApprovalError) throw facilityApprovalError;
  assert(await readNearby(), 'Fully approved facility did not enter App emergency eligibility');

  console.log(
    '[console-onboarding-live-e2e] Claim, evidence correction, ownership, organization, facility, and App eligibility assertions passed.'
  );
}

async function main() {
  const runId = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const runLabel = runId.slice(-8);
  const password = `Contract!${crypto.randomBytes(12).toString('base64url')}`;
  const email = `console-onboarding-live-${runId}@ivisit-e2e.local`;
  const organizationName = `[DEMO ${runLabel}] Console Contract Hospital`;
  const registrationNumber = `LIVE-${runId}`;
  const inviteEmail = buildInviteAlias(inviteTestMailbox, runId);
  const manifest = createDemoRunManifest({
    runId,
    suite: 'console-onboarding-live-e2e',
    projectRef,
  });
  const manifestPath = defaultManifestPath(appRoot, runId);
  const state = {
    manifest,
    manifestPath,
    userId: null,
    organizationName,
    organizationIds: new Set(),
    storagePaths: new Set(),
    inviteEmail,
    invitedUserIds: new Set(),
    additionalOnboardingUserIds: new Set(),
    additionalAuthUserIds: new Set(),
    createdFacilityIds: new Set(),
  };
  registerResource(manifest, 'invitedEmails', inviteEmail);
  persistManifest(state);
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
    registerResource(manifest, 'authUserIds', state.userId);
    persistManifest(state);

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
    trackResource(state, 'storagePaths', 'storagePaths', ownPath);
    trackResource(state, 'storagePaths', 'storagePaths', otherPath);
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
    const organizationId = provisioned?.organization?.id;
    const facilityId = provisioned?.facility?.id;
    trackResource(state, 'organizationIds', 'organizationIds', organizationId);
    trackResource(state, 'createdFacilityIds', 'createdFacilityIds', facilityId);
    assert(provisioned?.success === true, 'Live provisioning did not return success');
    assert(provisioned?.provisioningVerified === true, 'Live provisioning was not backend-reflected');
    assert(provisioned?.role === 'org_admin', 'Live provisioning returned the wrong role');
    assert(provisioned?.organization?.walletState === 'ready', 'Organization wallet is not ready');
    assert(provisioned?.organization?.verificationStatus === 'pending', 'Organization skipped review');
    assert(provisioned?.facility?.verificationStatus === 'pending', 'Facility skipped review');
    assert(provisioned?.facility?.dispatchEligible === false, 'Pending facility became dispatch eligible');

    assert(
      organizationId !== facilityId,
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
    registerResource(manifest, 'authUserIds', invitedProfile.id);
    persistManifest(state);
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

    await runClaimVerificationFlow({ runId, state, tinyPng });

    console.log(
      '[console-onboarding-live-e2e] All live Auth, Storage, RPC, invite, claim, verification, App eligibility, and reflection assertions passed.'
    );
  } catch (error) {
    testError = error;
  }

  try {
    await cleanup(state);
    markCleanupAttempt(manifest);
    persistManifest(state);
    await cleanup(state);
    markCleanupAttempt(manifest);
    persistManifest(state);
    console.log(
      `[console-onboarding-live-e2e] Temporary live data and Storage objects were removed twice; manifest=${manifestPath}.`
    );
  } catch (cleanupError) {
    markCleanupAttempt(manifest, cleanupError);
    persistManifest(state);
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
