#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

const ROOT = path.resolve(__dirname, '..', '..', '..');
dotenv.config({ path: path.join(ROOT, '.env.local') });
dotenv.config({ path: path.join(ROOT, '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
const expectedProjectRef = process.argv
  .find((value) => value.startsWith('--project-ref='))
  ?.slice('--project-ref='.length);
const apply = process.argv.includes('--apply');

if (!supabaseUrl || !serviceRoleKey) {
  console.error('[data-room-deployment] Missing Supabase URL or service-role key.');
  process.exit(1);
}

const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
if (!expectedProjectRef || expectedProjectRef !== projectRef) {
  console.error('[data-room-deployment] Refusing to target an unconfirmed project reference.');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const sourceBlocks = [
  ['supabase/migrations/20260219000500_ops_content.sql', 'DATA_ROOM_ACCESS_CONTRACT'],
  ['supabase/migrations/20260219000700_security.sql', 'DATA_ROOM_ACCESS_RLS'],
  ['supabase/migrations/20260219000900_automations.sql', 'DATA_ROOM_ACCESS_AUTOMATIONS'],
  ['supabase/migrations/20260219010000_core_rpcs.sql', 'DATA_ROOM_INVITE_RPC'],
];

function extractMarkedBlock(relativeFile, marker) {
  const source = fs.readFileSync(path.join(ROOT, relativeFile), 'utf8');
  const begin = `-- BEGIN ${marker}`;
  const end = `-- END ${marker}`;
  const start = source.indexOf(begin);
  const finish = source.indexOf(end);
  if (start < 0 || finish <= start) {
    throw new Error(`Invalid ${marker} markers in ${relativeFile}`);
  }
  return source.slice(start + begin.length, finish).trim();
}

function splitSql(source) {
  const statements = [];
  let buffer = '';
  let single = false;
  let double = false;
  let lineComment = false;
  let blockDepth = 0;
  let dollar = null;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (lineComment) {
      buffer += char;
      if (char === '\n') lineComment = false;
      continue;
    }
    if (blockDepth) {
      buffer += char;
      if (char === '/' && next === '*') {
        buffer += next;
        blockDepth += 1;
        index += 1;
      } else if (char === '*' && next === '/') {
        buffer += next;
        blockDepth -= 1;
        index += 1;
      }
      continue;
    }
    if (dollar) {
      if (source.startsWith(dollar, index)) {
        buffer += dollar;
        index += dollar.length - 1;
        dollar = null;
      } else buffer += char;
      continue;
    }
    if (single) {
      buffer += char;
      if (char === "'" && next === "'") {
        buffer += next;
        index += 1;
      } else if (char === "'") single = false;
      continue;
    }
    if (double) {
      buffer += char;
      if (char === '"' && next === '"') {
        buffer += next;
        index += 1;
      } else if (char === '"') double = false;
      continue;
    }
    if (char === '-' && next === '-') {
      buffer += char + next;
      lineComment = true;
      index += 1;
    } else if (char === '/' && next === '*') {
      buffer += char + next;
      blockDepth = 1;
      index += 1;
    } else if (char === "'") {
      buffer += char;
      single = true;
    } else if (char === '"') {
      buffer += char;
      double = true;
    } else if (char === '$') {
      const match = source.slice(index).match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/);
      if (match) {
        dollar = match[0];
        buffer += dollar;
        index += dollar.length - 1;
      } else buffer += char;
    } else if (char === ';') {
      if (buffer.trim()) statements.push(buffer.trim());
      buffer = '';
    } else buffer += char;
  }

  if (buffer.trim()) statements.push(buffer.trim());
  if (single || double || blockDepth || dollar) throw new Error('Unterminated SQL construct');
  return statements;
}

function buildDeployment() {
  const blocks = sourceBlocks.map(([file, marker]) => ({
    file,
    marker,
    sql: extractMarkedBlock(file, marker),
  }));
  const statements = blocks.flatMap((block) => splitSql(block.sql));
  const digest = crypto
    .createHash('sha256')
    .update(blocks.map((block) => `${block.file}:${block.marker}\n${block.sql}`).join('\n'))
    .digest('hex')
    .slice(0, 16);
  const body = statements
    .map((statement, index) => `EXECUTE $data_room_${index}$${statement};$data_room_${index}$;`)
    .join('\n');

  const sql = `DO $data_room_cutover$
DECLARE
    v_documents_before BIGINT;
    v_access_before BIGINT;
    v_invites_before BIGINT;
BEGIN
    IF to_regclass('public.documents') IS NULL
       OR to_regclass('public.access_requests') IS NULL
       OR to_regclass('public.document_invites') IS NULL THEN
        RAISE EXCEPTION 'Data Room tables are missing';
    END IF;
    IF to_regprocedure('public.p_is_admin()') IS NULL
       OR to_regprocedure('public.emit_canonical_notification(text,uuid,text,text,text,text,text,uuid,jsonb,jsonb,text,text)') IS NULL THEN
        RAISE EXCEPTION 'Shared role or notification dependency is missing';
    END IF;
    IF EXISTS (SELECT 1 FROM public.documents WHERE file_path IS NULL) THEN
        RAISE EXCEPTION 'documents.file_path contains NULL rows';
    END IF;

    SELECT COUNT(*) INTO v_documents_before FROM public.documents;
    SELECT COUNT(*) INTO v_access_before FROM public.access_requests;
    SELECT COUNT(*) INTO v_invites_before FROM public.document_invites;
    LOCK TABLE public.documents, public.access_requests, public.document_invites IN SHARE ROW EXCLUSIVE MODE;

${body}

    IF has_column_privilege('authenticated', 'public.documents', 'content', 'SELECT')
       OR has_column_privilege('authenticated', 'public.documents', 'file_path', 'SELECT')
       OR NOT has_column_privilege('authenticated', 'public.documents', 'title', 'SELECT') THEN
        RAISE EXCEPTION 'Document column grants are not fail-closed';
    END IF;
    IF has_table_privilege('authenticated', 'public.access_requests', 'INSERT')
       OR has_table_privilege('authenticated', 'public.access_requests', 'UPDATE')
       OR has_table_privilege('authenticated', 'public.access_requests', 'DELETE') THEN
        RAISE EXCEPTION 'Direct access-request writes remain available';
    END IF;
    IF NOT has_table_privilege('authenticated', 'public.access_requests', 'SELECT') THEN
        RAISE EXCEPTION 'Access-request realtime read grant is missing';
    END IF;
    IF has_table_privilege('authenticated', 'public.document_invites', 'SELECT')
       OR has_table_privilege('anon', 'public.document_invites', 'SELECT') THEN
        RAISE EXCEPTION 'Invite enumeration remains available';
    END IF;
    IF to_regprocedure('public.claim_document_invite(text)') IS NULL
       OR NOT has_function_privilege('authenticated', 'public.claim_document_invite(text)', 'EXECUTE')
       OR has_function_privilege('anon', 'public.claim_document_invite(text)', 'EXECUTE') THEN
        RAISE EXCEPTION 'Invite claim receiver grants are invalid';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'documents'
          AND policyname = 'Users can view eligible document metadata'
    ) OR NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'access_requests'
          AND policyname = 'Users read own access requests'
    ) THEN
        RAISE EXCEPTION 'Canonical Data Room read policies are missing';
    END IF;
    IF EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN ('documents', 'access_requests', 'document_invites')
          AND policyname IN (
              'Anyone can view document metadata',
              'Users can create their own requests',
              'Anyone can view invites by token',
              'Authenticated users can claim invites'
          )
    ) THEN
        RAISE EXCEPTION 'A legacy permissive policy remains';
    END IF;
    IF (SELECT COUNT(*) FROM public.documents) <> v_documents_before
       OR (SELECT COUNT(*) FROM public.access_requests) <> v_access_before
       OR (SELECT COUNT(*) FROM public.document_invites) <> v_invites_before THEN
        RAISE EXCEPTION 'Cutover changed Data Room row counts';
    END IF;

    PERFORM pg_notify('pgrst', 'reload schema');
END
$data_room_cutover$;`;

  return { blocks, statements, digest, sql };
}

async function count(table) {
  const { count: value, error } = await admin
    .from(table)
    .select('*', { count: 'exact', head: true });
  if (error) throw error;
  return value;
}

async function run() {
  const deployment = buildDeployment();
  const before = {
    documents: await count('documents'),
    access_requests: await count('access_requests'),
    document_invites: await count('document_invites'),
  };
  console.log(
    `[data-room-deployment] target=${projectRef} mode=${apply ? 'apply' : 'preview'} ` +
      `statements=${deployment.statements.length} source=${deployment.digest} rows=${JSON.stringify(before)}`
  );
  if (!apply) {
    console.log('[data-room-deployment] Preview complete. Re-run with --apply to execute atomically.');
    return;
  }

  const { data, error } = await admin.rpc('exec_sql', { sql: deployment.sql });
  if (error) throw error;
  if (!data?.success) throw new Error(data?.error || 'Atomic cutover failed');

  const after = {
    documents: await count('documents'),
    access_requests: await count('access_requests'),
    document_invites: await count('document_invites'),
  };
  if (JSON.stringify(before) !== JSON.stringify(after)) {
    throw new Error(`Row-count invariant failed: before=${JSON.stringify(before)} after=${JSON.stringify(after)}`);
  }
  console.log(`[data-room-deployment] Applied atomically; rows=${JSON.stringify(after)}`);
}

run().catch((error) => {
  console.error(`[data-room-deployment] ${error.message}`);
  process.exit(1);
});
