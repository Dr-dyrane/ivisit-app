#!/usr/bin/env node

const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('[display-id-registry-live] Missing Supabase URL or service-role key');
  process.exit(1);
}

const db = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TABLES = [
  { name: 'profiles', select: 'id,display_id,role', entityType: (row) => row.role },
  { name: 'organizations', select: 'id,display_id', entityType: () => 'organization' },
  { name: 'hospitals', select: 'id,display_id', entityType: () => 'hospital' },
  { name: 'doctors', select: 'id,display_id', entityType: () => 'doctor' },
  { name: 'ambulances', select: 'id,display_id', entityType: () => 'ambulance' },
  { name: 'emergency_requests', select: 'id,display_id', entityType: () => 'emergency_request' },
  { name: 'visits', select: 'id,display_id', entityType: () => 'visit' },
  { name: 'payments', select: 'id,display_id', entityType: () => 'payment' },
  { name: 'notifications', select: 'id,display_id', entityType: () => 'notification' },
  { name: 'patient_wallets', select: 'id,display_id', entityType: () => 'wallet' },
  { name: 'organization_wallets', select: 'id,display_id', entityType: () => 'wallet' },
  { name: 'emergency_contacts', select: 'id,display_id', entityType: () => 'patient' },
];

async function fetchAll(table, select) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(table).select(select).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

function chunks(values, size) {
  const result = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

async function main() {
  const rowSets = await Promise.all(TABLES.map((table) => fetchAll(table.name, table.select)));
  const current = [];
  const failures = [];

  TABLES.forEach((table, index) => {
    for (const row of rowSets[index]) {
      if (!row.display_id) {
        failures.push(`${table.name}:${row.id} has no display_id`);
        continue;
      }
      current.push({
        table: table.name,
        entityId: row.id,
        displayId: row.display_id,
        entityType: table.entityType(row),
      });
    }
  });

  const currentOwners = new Map();
  for (const row of current) {
    const existing = currentOwners.get(row.displayId);
    if (existing && existing.entityId !== row.entityId) {
      failures.push(
        `${row.displayId} is shared by ${existing.table}:${existing.entityId} and ${row.table}:${row.entityId}`
      );
    } else {
      currentOwners.set(row.displayId, row);
    }
  }

  const mappingChunks = await Promise.all(
    chunks(current.map((row) => row.displayId), 100).map(async (displayIds) => {
      const { data, error } = await db
        .from('id_mappings')
        .select('entity_id,display_id,entity_type')
        .in('display_id', displayIds);
      if (error) throw new Error(`id_mappings: ${error.message}`);
      return data;
    })
  );
  const mappings = new Map(mappingChunks.flat().map((row) => [row.display_id, row]));

  for (const row of current) {
    const mapping = mappings.get(row.displayId);
    if (!mapping) {
      failures.push(`${row.table}:${row.entityId} is missing registry label ${row.displayId}`);
      continue;
    }
    if (mapping.entity_id !== row.entityId) {
      failures.push(
        `${row.displayId} resolves to stale entity ${mapping.entity_id}, expected ${row.entityId}`
      );
    }
    if (mapping.entity_type !== row.entityType) {
      failures.push(
        `${row.displayId} has registry type ${mapping.entity_type}, expected ${row.entityType}`
      );
    }
  }

  const { data: sample, error: sampleError } = await db.rpc('generate_display_id', { prefix: 'TST' });
  if (sampleError || !/^TST-[A-F0-9]{6}$/.test(sample || '')) {
    failures.push(`live allocator sample failed: ${sampleError?.message || sample || 'empty result'}`);
  }

  const { error: invalidPrefixError } = await db.rpc('generate_display_id', {
    prefix: 'invalid prefix',
  });
  if (!invalidPrefixError) failures.push('live allocator accepted an invalid prefix');

  if (failures.length > 0) {
    console.error('[display-id-registry-live] FAIL');
    for (const failure of failures.slice(0, 30)) console.error(`- ${failure}`);
    if (failures.length > 30) console.error(`- ${failures.length - 30} more failures`);
    process.exit(1);
  }

  console.log(
    `[display-id-registry-live] PASS: ${current.length} current entities resolve to canonical registry owners`
  );
}

main().catch((error) => {
  console.error('[display-id-registry-live] FAIL:', error.message);
  process.exit(1);
});
