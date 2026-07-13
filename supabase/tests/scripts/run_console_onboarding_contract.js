const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

const appRoot = path.resolve(__dirname, '..', '..', '..');
dotenv.config({ path: path.join(appRoot, '.env.local') });
dotenv.config({ path: path.join(appRoot, '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
const deploymentOutput = process.argv
  .find((arg) => arg.startsWith('--emit-deployment='))
  ?.slice('--emit-deployment='.length);

if (!supabaseUrl || !serviceRoleKey) {
  console.error('[console-onboarding-contract] Missing Supabase URL or service-role key.');
  process.exit(1);
}

const projectRef = new URL(supabaseUrl).hostname.split('.')[0];

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const sourceBlocks = [
  ['supabase/migrations/20260219000200_org_structure.sql', 'CONSOLE_ONBOARDING_ORGANIZATION_SCHEMA'],
  ['supabase/migrations/20260219000200_org_structure.sql', 'CONSOLE_ONBOARDING_EVIDENCE_SCHEMA'],
  ['supabase/migrations/20260219000200_org_structure.sql', 'CONSOLE_PROVIDER_ELIGIBILITY_FUNCTION'],
  ['supabase/migrations/20260219000700_security.sql', 'CONSOLE_ONBOARDING_EVIDENCE_RLS'],
  ['supabase/migrations/20260219000700_security.sql', 'CONSOLE_PROFILE_COLUMN_SECURITY'],
  ['supabase/migrations/20260219000700_security.sql', 'CONSOLE_ONBOARDING_READ_POLICIES'],
  ['supabase/migrations/20260219000700_security.sql', 'CONSOLE_ONBOARDING_STORAGE_POLICIES'],
  ['supabase/migrations/20260219000900_automations.sql', 'CONSOLE_NEW_USER_FUNCTION'],
  ['supabase/migrations/20260219000900_automations.sql', 'CONSOLE_ORG_WALLET_FUNCTION'],
  ['supabase/migrations/20260219010000_core_rpcs.sql', 'CONSOLE_USER_STATISTICS_SCOPE'],
  ['supabase/migrations/20260219010000_core_rpcs.sql', 'CONSOLE_PROFILE_ADMIN_RPC'],
  ['supabase/migrations/20260219010000_core_rpcs.sql', 'CONSOLE_ONBOARDING_RPCS'],
];

const rollbackSourceBlocks = sourceBlocks.filter(
  ([, marker]) => marker !== 'CONSOLE_ONBOARDING_STORAGE_POLICIES'
);

function extractMarkedBlock(relativeFile, marker) {
  const source = fs.readFileSync(path.join(appRoot, relativeFile), 'utf8');
  const begin = `-- BEGIN ${marker}`;
  const end = `-- END ${marker}`;
  const startIndex = source.indexOf(begin);
  const endIndex = source.indexOf(end);

  if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex) {
    throw new Error(`Missing or invalid ${marker} markers in ${relativeFile}`);
  }

  return source.slice(startIndex + begin.length, endIndex).trim();
}

function splitSqlStatements(source) {
  const statements = [];
  let buffer = '';
  let singleQuoted = false;
  let doubleQuoted = false;
  let lineComment = false;
  let blockCommentDepth = 0;
  let dollarTag = null;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (lineComment) {
      buffer += char;
      if (char === '\n') lineComment = false;
      continue;
    }

    if (blockCommentDepth > 0) {
      buffer += char;
      if (char === '/' && next === '*') {
        buffer += next;
        blockCommentDepth += 1;
        index += 1;
      } else if (char === '*' && next === '/') {
        buffer += next;
        blockCommentDepth -= 1;
        index += 1;
      }
      continue;
    }

    if (dollarTag) {
      if (source.startsWith(dollarTag, index)) {
        buffer += dollarTag;
        index += dollarTag.length - 1;
        dollarTag = null;
      } else {
        buffer += char;
      }
      continue;
    }

    if (singleQuoted) {
      buffer += char;
      if (char === "'" && next === "'") {
        buffer += next;
        index += 1;
      } else if (char === "'") {
        singleQuoted = false;
      }
      continue;
    }

    if (doubleQuoted) {
      buffer += char;
      if (char === '"' && next === '"') {
        buffer += next;
        index += 1;
      } else if (char === '"') {
        doubleQuoted = false;
      }
      continue;
    }

    if (char === '-' && next === '-') {
      buffer += char + next;
      lineComment = true;
      index += 1;
      continue;
    }

    if (char === '/' && next === '*') {
      buffer += char + next;
      blockCommentDepth = 1;
      index += 1;
      continue;
    }

    if (char === "'") {
      buffer += char;
      singleQuoted = true;
      continue;
    }

    if (char === '"') {
      buffer += char;
      doubleQuoted = true;
      continue;
    }

    if (char === '$') {
      const match = source.slice(index).match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/);
      if (match) {
        dollarTag = match[0];
        buffer += dollarTag;
        index += dollarTag.length - 1;
        continue;
      }
    }

    if (char === ';') {
      if (buffer.trim()) statements.push(buffer.trim());
      buffer = '';
      continue;
    }

    buffer += char;
  }

  if (buffer.trim()) statements.push(buffer.trim());
  if (singleQuoted || doubleQuoted || blockCommentDepth || dollarTag) {
    throw new Error('SQL splitter reached the end of an unterminated construct');
  }

  return statements;
}

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function executeStatement(statement, index) {
  const tag = `$ivisit_stmt_${index}$`;
  if (statement.includes(tag)) throw new Error(`Unexpected dynamic SQL tag collision at statement ${index}`);
  return `EXECUTE ${tag}${statement};${tag};`;
}

function buildAssertionBlock(test) {
  return `
DO $ivisit_assertions$
DECLARE
    v_user_a UUID := ${sqlString(test.userA)}::UUID;
    v_user_b UUID := ${sqlString(test.userB)}::UUID;
    v_user_c UUID := ${sqlString(test.userC)}::UUID;
    v_user_d UUID := ${sqlString(test.userD)}::UUID;
    v_org_id UUID;
    v_facility_id UUID;
    v_ambulance_org_id UUID;
    v_result JSONB;
    v_projection JSONB;
    v_stats JSONB;
    v_denied BOOLEAN;
    v_count INTEGER;
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger trigger_row
        JOIN pg_class relation ON relation.oid = trigger_row.tgrelid
        JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
        JOIN pg_proc receiver ON receiver.oid = trigger_row.tgfoid
        WHERE namespace.nspname = 'auth'
          AND relation.relname = 'users'
          AND trigger_row.tgname = 'on_auth_user_created'
          AND receiver.proname = 'handle_new_user'
          AND NOT trigger_row.tgisinternal
    ) OR NOT EXISTS (
        SELECT 1
        FROM pg_trigger trigger_row
        JOIN pg_class relation ON relation.oid = trigger_row.tgrelid
        JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
        JOIN pg_proc receiver ON receiver.oid = trigger_row.tgfoid
        WHERE namespace.nspname = 'public'
          AND relation.relname = 'organizations'
          AND trigger_row.tgname = 'on_org_created'
          AND receiver.proname = 'handle_new_organization'
          AND NOT trigger_row.tgisinternal
    ) THEN
        RAISE EXCEPTION 'CONTRACT_ASSERTION: onboarding automations are not wired';
    END IF;

    INSERT INTO auth.users (
        id, instance_id, aud, role, email,
        encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new,
        invited_at, is_sso_user
    ) VALUES
    (
        v_user_a, '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated', ${sqlString(test.emailA)},
        crypt('Contract123!', gen_salt('bf')), NOW(),
        '{"provider":"email","providers":["email"]}'::JSONB,
        '{"full_name":"Onboarding Contract A","role":"admin"}'::JSONB,
        NOW(), NOW(), '', '', '', NULL, false
    ),
    (
        v_user_b, '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated', ${sqlString(test.emailB)},
        crypt('Contract123!', gen_salt('bf')), NOW(),
        '{"provider":"email","providers":["email"]}'::JSONB,
        '{"full_name":"Onboarding Contract B","role":"org_admin"}'::JSONB,
        NOW(), NOW(), '', '', '', NULL, false
    ),
    (
        v_user_c, '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated', ${sqlString(test.emailC)},
        crypt('Contract123!', gen_salt('bf')), NOW(),
        '{"provider":"email","providers":["email"]}'::JSONB,
        '{"full_name":"Onboarding Contract C","role":"dispatcher"}'::JSONB,
        NOW(), NOW(), '', '', '', NULL, false
    ),
    (
        v_user_d, '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated', ${sqlString(test.emailD)},
        crypt('Contract123!', gen_salt('bf')), NOW(),
        '{"provider":"email","providers":["email"]}'::JSONB,
        jsonb_build_object(
            'full_name', 'Onboarding Contract Invite',
            'role', 'admin',
            'invited_by', v_user_a::TEXT
        ),
        NOW(), NOW(), '', '', '', NOW(), false
    );

    IF EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id IN (v_user_a, v_user_b, v_user_c, v_user_d)
          AND (role <> 'patient' OR onboarding_status <> 'pending')
    ) THEN
        RAISE EXCEPTION 'CONTRACT_ASSERTION: public Auth metadata elevated a profile';
    END IF;

    IF has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE')
       OR has_column_privilege('authenticated', 'public.profiles', 'organization_id', 'UPDATE')
       OR NOT has_column_privilege('authenticated', 'public.profiles', 'phone', 'UPDATE') THEN
        RAISE EXCEPTION 'CONTRACT_ASSERTION: profile column privileges are unsafe';
    END IF;

    IF has_function_privilege('anon', 'public.get_user_statistics()', 'EXECUTE')
       OR NOT has_function_privilege('authenticated', 'public.get_user_statistics()', 'EXECUTE') THEN
        RAISE EXCEPTION 'CONTRACT_ASSERTION: user statistics execute privileges are unsafe';
    END IF;

    PERFORM set_config(
        'request.jwt.claims',
        jsonb_build_object('sub', v_user_a::TEXT, 'role', 'authenticated')::TEXT,
        true
    );
    PERFORM set_config('request.jwt.claim.sub', v_user_a::TEXT, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    v_result := public.provision_console_organization(jsonb_build_object(
        'organizationType', 'hospital',
        'organizationName', ${sqlString(test.hospitalName)},
        'registrationNumber', ${sqlString(test.registrationNumber)},
        'contactEmail', ${sqlString(test.emailA)},
        'phone', '+1 555 0100',
        'address', '120 Contract Avenue',
        'city', 'Los Angeles',
        'state', 'California',
        'termsAccepted', true,
        'documents', jsonb_build_array(jsonb_build_object(
            'storagePath', ${sqlString(test.storagePath)},
            'documentType', 'license',
            'originalName', 'facility-license.png',
            'mimeType', 'image/png',
            'sizeBytes', 68
        ))
    ));

    IF COALESCE((v_result->>'success')::BOOLEAN, false) IS NOT TRUE
       OR COALESCE((v_result->>'provisioningVerified')::BOOLEAN, false) IS NOT TRUE
       OR v_result->>'role' <> 'org_admin' THEN
        RAISE EXCEPTION 'CONTRACT_ASSERTION: provisioning did not return reflected success';
    END IF;

    v_org_id := (v_result->'organization'->>'id')::UUID;
    v_facility_id := (v_result->'facility'->>'id')::UUID;

    IF v_org_id IS NULL OR v_facility_id IS NULL OR v_org_id = v_facility_id THEN
        RAISE EXCEPTION 'CONTRACT_ASSERTION: organization and facility identity collapsed';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.profiles profile
        WHERE profile.id = v_user_a
          AND profile.organization_id = v_org_id
          AND profile.role = 'org_admin'
          AND profile.onboarding_status = 'complete'
    ) OR NOT EXISTS (
        SELECT 1 FROM public.organizations organization
        WHERE organization.id = v_org_id
          AND organization.created_by = v_user_a
          AND organization.verification_status = 'pending'
          AND organization.organization_type = 'hospital'
    ) OR NOT EXISTS (
        SELECT 1 FROM public.hospitals facility
        WHERE facility.id = v_facility_id
          AND facility.organization_id = v_org_id
          AND facility.org_admin_id = v_user_a
          AND facility.verification_status = 'pending'
    ) OR NOT EXISTS (
        SELECT 1 FROM public.organization_wallets wallet
        WHERE wallet.organization_id = v_org_id
    ) OR NOT EXISTS (
        SELECT 1 FROM public.organization_verification_documents evidence
        WHERE evidence.organization_id = v_org_id
          AND evidence.facility_id = v_facility_id
          AND evidence.uploaded_by = v_user_a
          AND evidence.storage_path = ${sqlString(test.storagePath)}
          AND evidence.review_status = 'pending'
    ) THEN
        RAISE EXCEPTION 'CONTRACT_ASSERTION: provisioning write chain is incomplete';
    END IF;

    v_projection := public.get_console_identity_projection();
    IF v_projection->'organizationScope'->>'state' <> 'ready'
       OR (v_projection->'organizationScope'->>'organizationId')::UUID <> v_org_id
       OR jsonb_array_length(v_projection->'organizationScope'->'facilityIds') <> 1
       OR (v_projection->'organizationScope'->'facilityIds'->>0)::UUID <> v_facility_id
       OR (v_projection->'organizationScope'->>'primaryFacilityId')::UUID <> v_facility_id
       OR COALESCE((v_projection->'organizationScope'->>'walletInitialized')::BOOLEAN, false) IS NOT TRUE THEN
        RAISE EXCEPTION 'CONTRACT_ASSERTION: identity projection is not backend-reflected';
    END IF;

    v_result := public.provision_console_organization(jsonb_build_object(
        'organizationType', 'hospital',
        'organizationName', ${sqlString(test.hospitalName)},
        'registrationNumber', ${sqlString(test.registrationNumber)},
        'contactEmail', ${sqlString(test.emailA)},
        'address', '120 Contract Avenue',
        'city', 'Los Angeles',
        'state', 'California',
        'termsAccepted', true,
        'documents', jsonb_build_array(jsonb_build_object(
            'storagePath', ${sqlString(test.storagePath)},
            'documentType', 'license',
            'originalName', 'facility-license.png'
        ))
    ));

    SELECT COUNT(*)::INTEGER INTO v_count
    FROM public.organizations WHERE created_by = v_user_a;
    IF (v_result->'organization'->>'id')::UUID <> v_org_id OR v_count <> 1 THEN
        RAISE EXCEPTION 'CONTRACT_ASSERTION: provisioning is not idempotent';
    END IF;

    SELECT COUNT(*)::INTEGER INTO v_count
    FROM public.organization_verification_documents WHERE organization_id = v_org_id;
    IF v_count <> 1 THEN
        RAISE EXCEPTION 'CONTRACT_ASSERTION: evidence was duplicated';
    END IF;

    v_denied := false;
    BEGIN
        PERFORM public.update_profile_by_admin(v_user_a, '{"role":"admin"}'::JSONB);
    EXCEPTION WHEN OTHERS THEN
        v_denied := SQLERRM IN ('Platform admin approval is required', 'Unauthorized');
    END;
    IF NOT v_denied THEN
        RAISE EXCEPTION 'CONTRACT_ASSERTION: org admin could promote their own role';
    END IF;

    v_denied := false;
    BEGIN
        PERFORM public.complete_console_user_invitation(
            v_user_d,
            v_user_a,
            v_org_id,
            'viewer',
            NULL
        );
    EXCEPTION WHEN OTHERS THEN
        v_denied := SQLERRM = 'Service receiver required';
    END;
    IF NOT v_denied THEN
        RAISE EXCEPTION 'CONTRACT_ASSERTION: invitation assignment accepted an authenticated caller';
    END IF;

    PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
    PERFORM set_config('request.jwt.claim.sub', '', true);
    v_result := public.complete_console_user_invitation(
        v_user_d,
        v_user_a,
        v_org_id,
        'viewer',
        NULL
    );

    IF COALESCE((v_result->>'success')::BOOLEAN, false) IS NOT TRUE
       OR NOT EXISTS (
           SELECT 1 FROM public.profiles
           WHERE id = v_user_d
             AND role = 'viewer'
             AND organization_id = v_org_id
             AND onboarding_status = 'complete'
       ) THEN
        RAISE EXCEPTION 'CONTRACT_ASSERTION: invitation assignment was not reflected';
    END IF;

    PERFORM set_config(
        'request.jwt.claims',
        jsonb_build_object('sub', v_user_a::TEXT, 'role', 'authenticated')::TEXT,
        true
    );
    PERFORM set_config('request.jwt.claim.sub', v_user_a::TEXT, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    SELECT to_jsonb(statistics) INTO v_stats
    FROM public.get_user_statistics() statistics;

    IF (v_stats->>'total_users')::BIGINT <> 2
       OR (v_stats->>'total_profiles')::BIGINT <> 2
       OR (v_stats->>'provider_count')::BIGINT <> 0
       OR (v_stats->>'viewer_count')::BIGINT <> 1
       OR (v_stats->>'org_admin_count')::BIGINT <> 1 THEN
        RAISE EXCEPTION 'CONTRACT_ASSERTION: organization user statistics escaped caller scope';
    END IF;

    PERFORM set_config(
        'request.jwt.claims',
        jsonb_build_object('sub', v_user_b::TEXT, 'role', 'authenticated')::TEXT,
        true
    );
    PERFORM set_config('request.jwt.claim.sub', v_user_b::TEXT, true);

    v_denied := false;
    BEGIN
        PERFORM * FROM public.get_user_statistics();
    EXCEPTION WHEN OTHERS THEN
        v_denied := SQLERRM = 'USER_STATISTICS_SCOPE_DENIED';
    END;
    IF NOT v_denied THEN
        RAISE EXCEPTION 'CONTRACT_ASSERTION: unscoped actor read user statistics';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.search_onboarding_facilities('Onboarding Contract')
        WHERE id = v_facility_id AND requires_support IS TRUE
    ) THEN
        RAISE EXCEPTION 'CONTRACT_ASSERTION: existing facility search did not require support';
    END IF;

    v_denied := false;
    BEGIN
        PERFORM public.provision_console_organization(jsonb_build_object(
            'organizationType', 'hospital',
            'organizationName', ${sqlString(test.hospitalName)},
            'contactEmail', ${sqlString(test.emailB)},
            'address', '120 Contract Avenue',
            'city', 'Los Angeles',
            'state', 'California',
            'termsAccepted', true
        ));
    EXCEPTION WHEN OTHERS THEN
        v_denied := SQLERRM = 'FACILITY_ALREADY_EXISTS';
    END;
    IF NOT v_denied THEN
        RAISE EXCEPTION 'CONTRACT_ASSERTION: duplicate facility registration was accepted';
    END IF;

    PERFORM set_config(
        'request.jwt.claims',
        jsonb_build_object('sub', v_user_c::TEXT, 'role', 'authenticated')::TEXT,
        true
    );
    PERFORM set_config('request.jwt.claim.sub', v_user_c::TEXT, true);

    v_result := public.provision_console_organization(jsonb_build_object(
        'organizationType', 'ambulance_service',
        'organizationName', ${sqlString(test.ambulanceName)},
        'contactEmail', ${sqlString(test.emailC)},
        'address', '810 Response Road',
        'city', 'Los Angeles',
        'state', 'California',
        'termsAccepted', true
    ));
    v_ambulance_org_id := (v_result->'organization'->>'id')::UUID;

    IF v_result->'facility' IS DISTINCT FROM 'null'::JSONB THEN
        RAISE EXCEPTION 'CONTRACT_ASSERTION: ambulance registration returned a facility';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.hospitals WHERE organization_id = v_ambulance_org_id
    ) THEN
        RAISE EXCEPTION 'CONTRACT_ASSERTION: ambulance registration fabricated a hospital';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.organization_wallets WHERE organization_id = v_ambulance_org_id
    ) THEN
        RAISE EXCEPTION 'CONTRACT_ASSERTION: ambulance registration missed its wallet';
    END IF;

    RAISE EXCEPTION 'IVISIT_ONBOARDING_CONTRACT_OK';
END;
$ivisit_assertions$;
`.trim();
}

function readSourceBlocks(blockList) {
  return blockList.map(([file, marker]) => ({
    file,
    marker,
    sql: extractMarkedBlock(file, marker),
  }));
}

function buildSql(test) {
  const blocks = readSourceBlocks(rollbackSourceBlocks);
  const statements = blocks.flatMap((block) => splitSqlStatements(block.sql));
  const sourceDigest = crypto
    .createHash('sha256')
    .update(blocks.map((block) => `${block.file}:${block.marker}\n${block.sql}`).join('\n'))
    .digest('hex')
    .slice(0, 16);

  const body = statements.map(executeStatement).join('\n');
  const assertionSql = `\nEXECUTE $ivisit_test$${buildAssertionBlock(test)}$ivisit_test$;`;

  return {
    sql: `DO $ivisit_bundle$\nBEGIN\n${body}${assertionSql}\nEND\n$ivisit_bundle$;`,
    statementCount: statements.length,
    sourceDigest,
  };
}

function emitDeployment(outputPath) {
  const blocks = readSourceBlocks(sourceBlocks);
  const absoluteOutput = path.resolve(appRoot, outputPath);
  const deploymentSql = [
    '-- Generated from canonical pillar markers by run_console_onboarding_contract.js.',
    '-- This operational migration is temporary: apply, delete, then repair its remote history entry.',
    ...blocks.map(
      (block) =>
        `\n-- Source: ${block.file} (${block.marker})\n${block.sql.trim()}\n`
    ),
  ].join('\n');

  fs.writeFileSync(absoluteOutput, deploymentSql, 'utf8');
  console.log(`[console-onboarding-contract] Wrote exact-source deployment SQL to ${absoluteOutput}`);
}

async function assertNoDatabaseResidue(test) {
  const [{ data: organizations, error: organizationError }, { data: profiles, error: profileError }] =
    await Promise.all([
      admin.from('organizations').select('id').eq('name', test.hospitalName),
      admin.from('profiles').select('id').in('id', [test.userA, test.userB, test.userC, test.userD]),
    ]);

  if (organizationError) throw organizationError;
  if (profileError) throw profileError;
  if (organizations.length || profiles.length) {
    throw new Error('Rollback contract left database rows behind');
  }
}

async function removeEvidenceObject(storagePath) {
  const { error: removeError } = await admin.storage.from('documents').remove([storagePath]);
  if (removeError) throw removeError;

  const slash = storagePath.lastIndexOf('/');
  const folder = storagePath.slice(0, slash);
  const filename = storagePath.slice(slash + 1);
  const { data, error } = await admin.storage.from('documents').list(folder, { search: filename });
  if (error) throw error;
  if (data.some((entry) => entry.name === filename)) {
    throw new Error('Temporary onboarding evidence object was not removed');
  }
}

async function main() {
  const runId = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const test = {
    userA: crypto.randomUUID(),
    userB: crypto.randomUUID(),
    userC: crypto.randomUUID(),
    userD: crypto.randomUUID(),
    emailA: `console-onboarding-a-${runId}@ivisit-e2e.local`,
    emailB: `console-onboarding-b-${runId}@ivisit-e2e.local`,
    emailC: `console-onboarding-c-${runId}@ivisit-e2e.local`,
    emailD: `console-onboarding-d-${runId}@ivisit-e2e.local`,
    hospitalName: `Onboarding Contract Hospital ${runId}`,
    ambulanceName: `Onboarding Contract Ambulance ${runId}`,
    registrationNumber: `ONBOARD-${runId}`,
  };
  test.storagePath = `onboarding/${test.userA}/${crypto.randomUUID()}.png`;

  if (deploymentOutput) {
    emitDeployment(deploymentOutput);
    return;
  }

  const bundle = buildSql(test);
  console.log(
    `[console-onboarding-contract] target=${projectRef} mode=rollback statements=${bundle.statementCount} source=${bundle.sourceDigest}`
  );

  const tinyPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64'
  );

  try {
    const { error: uploadError } = await admin.storage
      .from('documents')
      .upload(test.storagePath, tinyPng, { contentType: 'image/png', upsert: false });
    if (uploadError) throw uploadError;

    const { data, error } = await admin.rpc('exec_sql', { sql: bundle.sql });
    if (error) throw error;
    if (data?.success !== false || !String(data?.error).includes('IVISIT_ONBOARDING_CONTRACT_OK')) {
      throw new Error(`Rollback proof failed: ${data?.error || 'expected success marker was not raised'}`);
    }

    await assertNoDatabaseResidue(test);
    console.log('[console-onboarding-contract] All assertions passed and database changes rolled back.');
  } finally {
    await removeEvidenceObject(test.storagePath);
  }
}

main().catch((error) => {
  console.error(`[console-onboarding-contract] ${error.message}`);
  process.exit(1);
});
