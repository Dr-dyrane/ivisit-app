#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const REPORT = path.join(
  ROOT,
  'supabase',
  'tests',
  'validation',
  'data_room_shared_contract_report.json'
);

const sources = {
  ops: 'supabase/migrations/20260219000500_ops_content.sql',
  security: 'supabase/migrations/20260219000700_security.sql',
  automations: 'supabase/migrations/20260219000900_automations.sql',
  core: 'supabase/migrations/20260219010000_core_rpcs.sql',
  types: 'types/database.ts',
  contentRoute: '../iVisit-docs/web-ui/app/api/documents/[slug]/content/route.ts',
  accessRoute: '../iVisit-docs/web-ui/app/api/access/request/route.ts',
  inviteRoute: '../iVisit-docs/web-ui/app/api/invite/route.ts',
  adminAuth: '../iVisit-docs/web-ui/lib/admin-auth.ts',
  integrity: '../iVisit-docs/web-ui/lib/document-content-integrity.ts',
  consoleOps: '../ivisit-console/frontend/supabase/migrations/20260219000500_ops_content.sql',
  consoleSecurity: '../ivisit-console/frontend/supabase/migrations/20260219000700_security.sql',
  consoleAutomations: '../ivisit-console/frontend/supabase/migrations/20260219000900_automations.sql',
  consoleCore: '../ivisit-console/frontend/supabase/migrations/20260219010000_core_rpcs.sql',
  consoleTypes: '../ivisit-console/frontend/src/types/database.ts',
};

function read(relativePath) {
  const absolute = path.join(ROOT, relativePath);
  if (!fs.existsSync(absolute)) throw new Error(`Missing source: ${relativePath}`);
  return fs.readFileSync(absolute, 'utf8');
}

function includesAll(source, fragments) {
  return fragments.every((fragment) => source.includes(fragment));
}

function run() {
  const source = Object.fromEntries(
    Object.entries(sources).map(([name, file]) => [name, read(file)])
  );
  const checks = [];
  const check = (name, pass, evidence) => checks.push({ name, pass: Boolean(pass), evidence });

  check(
    'ops_content owns exact Data Room tables and live-compatible document shape',
    includesAll(source.ops, [
      'CREATE TABLE IF NOT EXISTS public.documents',
      'file_path TEXT NOT NULL',
      "icon TEXT DEFAULT 'file-text'",
      'CREATE TABLE IF NOT EXISTS public.access_requests',
      'UNIQUE (user_id, document_id)',
      'CREATE TABLE IF NOT EXISTS public.document_invites',
      "token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex')",
      'ALTER PUBLICATION supabase_realtime ADD TABLE public.access_requests',
    ]),
    sources.ops
  );

  check(
    'security grants authenticated metadata columns but never document content',
    includesAll(source.security, [
      'CREATE POLICY "Users can view eligible document metadata"',
      'REVOKE ALL ON TABLE public.documents FROM PUBLIC, anon, authenticated;',
      'GRANT SELECT (',
      ') ON TABLE public.documents TO authenticated;',
      'REVOKE ALL ON TABLE public.access_requests FROM PUBLIC, anon, authenticated;',
      'REVOKE ALL ON TABLE public.document_invites FROM PUBLIC, anon, authenticated;',
    ]) &&
      !/GRANT\s+SELECT\s*\([\s\S]*?\bcontent\b[\s\S]*?\)\s+ON\s+TABLE\s+public\.documents/i.test(
        source.security
      ),
    sources.security
  );

  check(
    'direct self-approval and invite enumeration policies are removed',
    includesAll(source.security, [
      'DROP POLICY IF EXISTS "Users can create their own requests"',
      'DROP POLICY IF EXISTS "Anyone can view invites by token"',
      'DROP POLICY IF EXISTS "Authenticated users can claim invites"',
    ]) && !source.security.includes('CREATE POLICY "Users can create their own requests"'),
    sources.security
  );

  check(
    'access notifications use canonical idempotent events from automations',
    includesAll(source.automations, [
      'CREATE OR REPLACE FUNCTION public.notify_data_room_access_request()',
      'CREATE OR REPLACE FUNCTION public.notify_data_room_access_change()',
      'public.emit_canonical_notification(',
      "'data-room:access-request:'",
      'SET search_path = pg_catalog, public',
      'REVOKE ALL ON FUNCTION public.notify_data_room_access_request()',
    ]),
    sources.automations
  );

  check(
    'invite claim is atomic, email-bound, expiry-aware, revoked-safe and replay-safe',
    includesAll(source.core, [
      'CREATE OR REPLACE FUNCTION public.claim_document_invite(p_token TEXT)',
      'FOR UPDATE;',
      'LOWER(v_invite.email) IS DISTINCT FROM v_user_email',
      'v_invite.expires_at IS NULL OR v_invite.expires_at <= NOW()',
      "v_access.status = 'revoked'",
      "v_access.status IS DISTINCT FROM 'approved'",
      "'replayed', true",
      'REVOKE ALL ON FUNCTION public.claim_document_invite(TEXT) FROM PUBLIC, anon;',
    ]),
    sources.core
  );

  check(
    'generated live types retain all three Data Room tables',
    [source.types, source.consoleTypes].every((types) =>
      includesAll(types, ['access_requests: {', 'document_invites: {', 'documents: {'])
    ),
    `${sources.types}; ${sources.consoleTypes}`
  );

  check(
    'Console mirrors every canonical Data Room contract owner block',
    includesAll(source.consoleOps, [
      'BEGIN DATA_ROOM_ACCESS_CONTRACT',
      'CREATE TABLE IF NOT EXISTS public.access_requests',
      'CREATE TABLE IF NOT EXISTS public.document_invites',
    ]) &&
      includesAll(source.consoleSecurity, [
        'BEGIN DATA_ROOM_ACCESS_RLS',
        'REVOKE ALL ON TABLE public.documents FROM PUBLIC, anon, authenticated;',
      ]) &&
      includesAll(source.consoleAutomations, [
        'BEGIN DATA_ROOM_ACCESS_AUTOMATIONS',
        'public.emit_canonical_notification(',
      ]) &&
      includesAll(source.consoleCore, [
        'BEGIN DATA_ROOM_INVITE_RPC',
        'CREATE OR REPLACE FUNCTION public.claim_document_invite(p_token TEXT)',
      ]),
    `${sources.consoleOps}; ${sources.consoleSecurity}; ${sources.consoleAutomations}; ${sources.consoleCore}`
  );

  check(
    'content receiver authorizes before service-only content read and verifies hash',
    includesAll(source.contentRoute, [
      "const service = createAdminServiceClient();",
      ".select('id, slug, title, tier')",
      ".select('status')",
      ".select('content')",
      'isCanonicalDocumentContent(slug, protectedDocument.content)',
    ]) && includesAll(source.integrity, ['createHash', 'timingSafeEqual', 'contentSha256']),
    `${sources.contentRoute}; ${sources.integrity}`
  );

  check(
    'access and invite receivers reject unpublished documents',
    source.accessRoute.includes('isDocumentPublished(document.slug)') &&
      source.inviteRoute.includes('isDocumentPublished(document.slug)'),
    `${sources.accessRoute}; ${sources.inviteRoute}`
  );

  check(
    'admin role resolution is deterministic across multiple rows',
    includesAll(source.adminAuth, ['rolePrecedence', 'new Set(', '.find((candidate)']),
    sources.adminAuth
  );

  check(
    'invite delivery response distinguishes creation from email delivery',
    includesAll(source.inviteRoute, ['invite_created: true', 'email_sent: emailSent']),
    sources.inviteRoute
  );

  const failures = checks.filter((item) => !item.pass);
  const report = {
    generated_at: new Date().toISOString(),
    status: failures.length === 0 ? 'pass' : 'fail',
    checks,
    failures,
  };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, `${JSON.stringify(report, null, 2)}\n`);

  if (failures.length) {
    console.error('[data-room-shared-contract] FAIL');
    failures.forEach((failure) => console.error(`- ${failure.name}`));
    process.exit(1);
  }
  console.log(`[data-room-shared-contract] PASS: ${checks.length} checks`);
  console.log(`[data-room-shared-contract] Report written: ${REPORT}`);
}

try {
  run();
} catch (error) {
  console.error(`[data-room-shared-contract] FAIL: ${error.message}`);
  process.exit(1);
}
