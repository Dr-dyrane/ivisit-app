const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'migrations');
const REPORT_FILE = path.join(__dirname, '..', 'validation', 'rpc_authority_guard_report.json');

const ALLOWED_CROSS_FILE_DUPLICATES = {
  'approve_cash_payment#2': {
    canonicalOwner: '20260219010000_core_rpcs.sql',
    allowedOwners: ['20260219000800_emergency_logic.sql', '20260219010000_core_rpcs.sql'],
  },
  'decline_cash_payment#2': {
    canonicalOwner: '20260219010000_core_rpcs.sql',
    allowedOwners: ['20260219000800_emergency_logic.sql', '20260219010000_core_rpcs.sql'],
  },
  'assign_ambulance_to_emergency#3': {
    canonicalOwner: '20260219010000_core_rpcs.sql',
    allowedOwners: ['20260219000800_emergency_logic.sql', '20260219010000_core_rpcs.sql'],
  },
  'auto_assign_ambulance#3': {
    canonicalOwner: '20260219010000_core_rpcs.sql',
    allowedOwners: ['20260219000800_emergency_logic.sql', '20260219010000_core_rpcs.sql'],
  },
  'cancel_bed_reservation#1': {
    canonicalOwner: '20260219010000_core_rpcs.sql',
    allowedOwners: ['20260219000800_emergency_logic.sql', '20260219010000_core_rpcs.sql'],
  },
  'cancel_trip#1': {
    canonicalOwner: '20260219010000_core_rpcs.sql',
    allowedOwners: ['20260219000800_emergency_logic.sql', '20260219010000_core_rpcs.sql'],
  },
  'complete_trip#1': {
    canonicalOwner: '20260219010000_core_rpcs.sql',
    allowedOwners: ['20260219000800_emergency_logic.sql', '20260219010000_core_rpcs.sql'],
  },
  'discharge_patient#1': {
    canonicalOwner: '20260219010000_core_rpcs.sql',
    allowedOwners: ['20260219000800_emergency_logic.sql', '20260219010000_core_rpcs.sql'],
  },
  'retry_payment_with_different_method#3': {
    canonicalOwner: '20260306000200_retry_payment_rpc_runtime_sync.sql',
    allowedOwners: ['20260219000400_finance.sql', '20260306000200_retry_payment_rpc_runtime_sync.sql'],
  },
};

const ALLOWED_SAME_FILE_DUPLICATES = new Set([
  'auto_assign_driver#0@20260219000900_automations.sql',
  'update_resource_availability#0@20260219000900_automations.sql',
  'update_ambulance_status#5@20260219000800_emergency_logic.sql',
  'discharge_patient#1@20260219000800_emergency_logic.sql',
]);

function splitTopLevelArgs(argsRaw) {
  const args = [];
  let current = '';
  let depth = 0;
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < argsRaw.length; i += 1) {
    const ch = argsRaw[i];
    const prev = i > 0 ? argsRaw[i - 1] : '';

    if (ch === "'" && !inDouble && prev !== '\\') {
      inSingle = !inSingle;
      current += ch;
      continue;
    }

    if (ch === '"' && !inSingle && prev !== '\\') {
      inDouble = !inDouble;
      current += ch;
      continue;
    }

    if (!inSingle && !inDouble) {
      if (ch === '(') depth += 1;
      if (ch === ')') depth = Math.max(depth - 1, 0);

      if (ch === ',' && depth === 0) {
        if (current.trim()) args.push(current.trim());
        current = '';
        continue;
      }
    }

    current += ch;
  }

  if (current.trim()) args.push(current.trim());
  return args;
}

function getLineNumber(source, index) {
  return source.slice(0, index).split('\n').length;
}

function parseMigrationFunctions(fileName, sql) {
  const functions = [];
  const regex =
    /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\)\s*RETURNS/gim;
  let match;
  while ((match = regex.exec(sql))) {
    const name = match[1];
    const rawArgs = (match[2] || '').trim();
    const args = rawArgs ? splitTopLevelArgs(rawArgs) : [];
    const arity = args.length;
    const line = getLineNumber(sql, match.index);
    functions.push({
      key: `${name}#${arity}`,
      name,
      arity,
      file: fileName,
      line,
    });
  }
  return functions;
}

function fail(message, report) {
  fs.mkdirSync(path.dirname(REPORT_FILE), { recursive: true });
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
  console.error(`[rpc-authority-guard] FAIL: ${message}`);
  console.error(`[rpc-authority-guard] Report written: ${REPORT_FILE}`);
  process.exit(1);
}

function run() {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort();

  const allFunctions = [];
  for (const fileName of files) {
    const fullPath = path.join(MIGRATIONS_DIR, fileName);
    const sql = fs.readFileSync(fullPath, 'utf8');
    allFunctions.push(...parseMigrationFunctions(fileName, sql));
  }

  const bySignature = new Map();
  for (const fn of allFunctions) {
    if (!bySignature.has(fn.key)) bySignature.set(fn.key, []);
    bySignature.get(fn.key).push(fn);
  }

  const crossFileDuplicates = [];
  const sameFileDuplicates = [];

  for (const [key, defs] of bySignature.entries()) {
    const groupedByFile = new Map();
    for (const def of defs) {
      if (!groupedByFile.has(def.file)) groupedByFile.set(def.file, []);
      groupedByFile.get(def.file).push(def);
    }
    const owners = [...groupedByFile.keys()].sort();
    if (owners.length > 1) {
      crossFileDuplicates.push({
        signature: key,
        owners,
        definitions: defs.map((d) => ({ file: d.file, line: d.line })),
      });
    }
    for (const [file, fileDefs] of groupedByFile.entries()) {
      if (fileDefs.length > 1) {
        sameFileDuplicates.push({
          signature: key,
          file,
          count: fileDefs.length,
          lines: fileDefs.map((d) => d.line),
        });
      }
    }
  }

  crossFileDuplicates.sort((a, b) => a.signature.localeCompare(b.signature));
  sameFileDuplicates.sort((a, b) =>
    `${a.signature}@${a.file}`.localeCompare(`${b.signature}@${b.file}`)
  );

  const report = {
    generated_at: new Date().toISOString(),
    source: 'supabase/tests/scripts/assert_rpc_authority_map.js',
    totals: {
      signatures_scanned: bySignature.size,
      cross_file_duplicates: crossFileDuplicates.length,
      same_file_duplicates: sameFileDuplicates.length,
    },
    cross_file_duplicates: crossFileDuplicates,
    same_file_duplicates: sameFileDuplicates,
    allowed_cross_file_duplicates: ALLOWED_CROSS_FILE_DUPLICATES,
    allowed_same_file_duplicates: [...ALLOWED_SAME_FILE_DUPLICATES].sort(),
    warnings: [],
  };

  for (const duplicate of crossFileDuplicates) {
    const policy = ALLOWED_CROSS_FILE_DUPLICATES[duplicate.signature];
    if (!policy) {
      fail(`Unmapped cross-file duplicate signature: ${duplicate.signature}`, report);
    }

    const expectedOwners = [...policy.allowedOwners].sort();
    const actualOwners = [...duplicate.owners].sort();
    if (expectedOwners.join('|') !== actualOwners.join('|')) {
      fail(
        `Owner drift for ${duplicate.signature}. expected=${expectedOwners.join(',')} actual=${actualOwners.join(',')}`,
        report
      );
    }

    const canonicalOwner = duplicate.owners[duplicate.owners.length - 1];
    if (canonicalOwner !== policy.canonicalOwner) {
      fail(
        `Canonical owner mismatch for ${duplicate.signature}. expected=${policy.canonicalOwner} actual=${canonicalOwner}`,
        report
      );
    }
  }

  for (const duplicate of sameFileDuplicates) {
    const dupKey = `${duplicate.signature}@${duplicate.file}`;
    if (!ALLOWED_SAME_FILE_DUPLICATES.has(dupKey)) {
      fail(`Unmapped same-file duplicate signature: ${dupKey}`, report);
    }
  }

  for (const signature of Object.keys(ALLOWED_CROSS_FILE_DUPLICATES)) {
    const found = crossFileDuplicates.some((dup) => dup.signature === signature);
    if (!found) {
      report.warnings.push(`Allowlist signature not currently duplicated: ${signature}`);
    }
  }

  fs.mkdirSync(path.dirname(REPORT_FILE), { recursive: true });
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));

  console.log(
    `[rpc-authority-guard] PASS: cross-file duplicates=${crossFileDuplicates.length}, same-file duplicates=${sameFileDuplicates.length}`
  );
  if (report.warnings.length > 0) {
    console.log(`[rpc-authority-guard] warnings=${report.warnings.length}`);
  }
  console.log(`[rpc-authority-guard] Report written: ${REPORT_FILE}`);
}

run();
