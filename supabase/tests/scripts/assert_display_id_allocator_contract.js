#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const INFRA_FILE = path.join(ROOT, 'supabase', 'migrations', '20260219000000_infra.sql');
const IDENTITY_FILE = path.join(ROOT, 'supabase', 'migrations', '20260219000100_identity.sql');
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

function compact(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function extractFunction(sql, functionName) {
  const marker = new RegExp(
    `CREATE\\s+OR\\s+REPLACE\\s+FUNCTION\\s+public\\.${functionName}\\s*\\(`,
    'i'
  );
  const start = sql.search(marker);
  if (start < 0) return null;
  const bodyStart = sql.indexOf('AS $$', start);
  const bodyEnd = bodyStart < 0 ? -1 : sql.indexOf('$$ LANGUAGE', bodyStart + 5);
  const statementEnd = bodyEnd < 0 ? -1 : sql.indexOf(';', bodyEnd);
  if (bodyStart < 0 || bodyEnd < 0 || statementEnd < 0) return null;
  return {
    body: sql.slice(bodyStart + 5, bodyEnd),
    statement: sql.slice(start, statementEnd + 1),
  };
}

for (const file of [INFRA_FILE, IDENTITY_FILE]) {
  check(fs.existsSync(file), `missing migration file: ${file}`);
}

if (failures.length === 0) {
  const infraSql = fs.readFileSync(INFRA_FILE, 'utf8');
  const identitySql = fs.readFileSync(IDENTITY_FILE, 'utf8');
  const allocator = extractFunction(infraSql, 'generate_display_id');
  const stamp = extractFunction(identitySql, 'stamp_entity_display_id');

  check(Boolean(allocator), 'generate_display_id is missing from the infrastructure pillar');
  check(Boolean(stamp), 'stamp_entity_display_id is missing from the identity pillar');

  if (allocator) {
    const body = compact(allocator.body);
    const statement = compact(allocator.statement);
    check(
      /SECURITY\s+DEFINER\s+SET\s+search_path\s*=\s*pg_catalog\s*,\s*public/i.test(statement),
      'display ID allocator must be SECURITY DEFINER with a pinned search_path'
    );
    check(
      /v_prefix\s*!~\s*'\^\[A-Z0-9\]\{2,8\}\$'/i.test(body),
      'display ID allocator must reject malformed prefixes'
    );
    check(
      /FOR\s+v_attempt\s+IN\s+1\.\.64\s+LOOP/i.test(body),
      'display ID allocator must retry a bounded number of candidates'
    );
    check(
      /SUBSTRING\s*\(\s*MD5\s*\(\s*GEN_RANDOM_UUID\s*\(\s*\)\s*::TEXT\s*\)\s*,\s*1\s*,\s*6\s*\)/i.test(body),
      'display ID allocator must preserve the established six-hex public label'
    );
    check(
      /pg_catalog\.pg_advisory_xact_lock\s*\(/i.test(body) &&
        /pg_catalog\.hashtextextended\s*\(\s*'ivisit-display-id:'\s*\|\|\s*v_candidate\s*,\s*0\s*\)/i.test(body),
      'display ID allocator must transaction-lock each candidate before checking ownership'
    );
    check(
      /IF\s+NOT\s+EXISTS\s*\(\s*SELECT\s+1\s+FROM\s+public\.id_mappings\s+AS\s+mapping\s+WHERE\s+mapping\.display_id\s*=\s*v_candidate\s*\)\s+THEN\s+RETURN\s+v_candidate/i.test(body),
      'display ID allocator must return only an unreserved global registry candidate'
    );
    check(
      /Unable to allocate a unique display ID/i.test(body),
      'display ID allocator must fail closed after exhausting retries'
    );
  }

  if (stamp) {
    const body = compact(stamp.body);
    check(
      /NEW\.display_id\s*:=\s*public\.generate_display_id\s*\(\s*v_prefix\s*\)/i.test(body),
      'the universal stamp trigger must allocate through generate_display_id'
    );
    check(
      /INSERT\s+INTO\s+public\.id_mappings\s*\(\s*entity_id\s*,\s*display_id\s*,\s*entity_type\s*\)/i.test(body),
      'the universal stamp trigger must reserve the allocated label in id_mappings'
    );
  }
}

if (failures.length > 0) {
  console.error('[display-id-allocator-contract] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[display-id-allocator-contract] PASS');
