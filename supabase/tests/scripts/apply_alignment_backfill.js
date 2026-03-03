const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials. Expected EXPO_PUBLIC_SUPABASE_URL and service role key.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

const APPLY = process.argv.includes('--apply');
const CHUNK_SIZE = 50;

function nowIso() {
  return new Date().toISOString();
}

function chunk(array, size = CHUNK_SIZE) {
  const out = [];
  for (let i = 0; i < array.length; i += size) {
    out.push(array.slice(i, i + size));
  }
  return out;
}

function formatDateParts(iso) {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) {
    const fallback = new Date();
    return {
      date: fallback.toISOString().slice(0, 10),
      time: fallback.toISOString().slice(11, 19)
    };
  }
  return {
    date: d.toISOString().slice(0, 10),
    time: d.toISOString().slice(11, 19)
  };
}

async function fetchAll(table, selectClause) {
  const { data, error } = await supabase.from(table).select(selectClause);
  if (error) throw new Error(`[${table}] select failed: ${error.message || error.code}`);
  return data || [];
}

async function insertMany(table, rows, { onConflict } = {}) {
  if (!rows.length) return { count: 0 };
  let total = 0;
  for (const batch of chunk(rows)) {
    let query = supabase.from(table).insert(batch);
    if (onConflict) {
      query = supabase.from(table).upsert(batch, { onConflict });
    }
    const { error, data } = await query.select('id');
    if (error) throw new Error(`[${table}] insert/upsert failed: ${error.message || error.code}`);
    total += (data || []).length;
  }
  return { count: total };
}

async function updateRow(table, id, payload, idField = 'id') {
  const { error } = await supabase.from(table).update(payload).eq(idField, id);
  if (error) throw new Error(`[${table}] update failed for ${id}: ${error.message || error.code}`);
}

async function countRows(table) {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
  if (error) throw new Error(`[${table}] count failed: ${error.message || error.code}`);
  return count || 0;
}

async function execSql(sql) {
  const { error } = await supabase.rpc('exec_sql', { sql });
  if (error) throw new Error(`[exec_sql] failed: ${error.message || error.code}`);
}

async function run() {
  const startedAt = nowIso();
  console.log(`[alignment-backfill] Starting at ${startedAt}`);
  console.log(`[alignment-backfill] Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'} (pass --apply to write changes)`);
  console.log(`[alignment-backfill] Target: ${supabaseUrl}`);

  const report = {
    startedAt,
    completedAt: null,
    mode: APPLY ? 'apply' : 'dry-run',
    supabaseUrl,
    steps: {},
    warnings: [],
    errors: []
  };

  const preflight = {
    organizations: await countRows('organizations'),
    organization_wallets: await countRows('organization_wallets'),
    ivisit_main_wallet: await countRows('ivisit_main_wallet'),
    emergency_requests: await countRows('emergency_requests'),
    visits: await countRows('visits'),
    payments: await countRows('payments')
  };
  report.preflight = preflight;

  const [organizations, orgWallets] = await Promise.all([
    fetchAll('organizations', 'id'),
    fetchAll('organization_wallets', 'organization_id')
  ]);

  const orgWalletSet = new Set(orgWallets.map((w) => w.organization_id).filter(Boolean));
  const missingOrgWalletRows = organizations
    .filter((o) => !orgWalletSet.has(o.id))
    .map((o) => ({ organization_id: o.id, balance: 0, currency: 'USD' }));

  report.steps.org_wallet_backfill = {
    missingCount: missingOrgWalletRows.length,
    insertedCount: 0
  };

  if (APPLY && missingOrgWalletRows.length > 0) {
    const result = await insertMany('organization_wallets', missingOrgWalletRows, { onConflict: 'organization_id' });
    report.steps.org_wallet_backfill.insertedCount = result.count;
  }

  const platformWalletCount = preflight.ivisit_main_wallet;
  report.steps.platform_wallet_backfill = {
    needed: platformWalletCount === 0,
    insertedCount: 0
  };
  if (APPLY && platformWalletCount === 0) {
    const result = await insertMany('ivisit_main_wallet', [{
      balance: 0,
      currency: 'USD',
      last_updated: nowIso()
    }]);
    report.steps.platform_wallet_backfill.insertedCount = result.count;
  }

  const [hospitals, profiles, doctors, emergencies, visits, payments] = await Promise.all([
    fetchAll('hospitals', 'id,name,organization_id'),
    fetchAll('profiles', 'id,full_name,username,phone'),
    fetchAll('doctors', 'id,name'),
    fetchAll('emergency_requests', 'id,display_id,user_id,hospital_id,status,service_type,hospital_name,specialty,assigned_doctor_id,responder_id,responder_name,responder_phone,total_cost,created_at,completed_at'),
    fetchAll('visits', 'id,request_id'),
    fetchAll('payments', 'id,emergency_request_id,organization_id')
  ]);

  const hospitalById = new Map(hospitals.map((h) => [h.id, h]));
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const doctorById = new Map(doctors.map((d) => [d.id, d]));
  const visitRequestIds = new Set(visits.map((v) => v.request_id).filter(Boolean));
  const emergencyById = new Map(emergencies.map((e) => [e.id, e]));

  const emergencyHospitalNameUpdates = [];
  const emergencyResponderUpdates = [];

  for (const er of emergencies) {
    const hospital = er.hospital_id ? hospitalById.get(er.hospital_id) : null;
    if ((!er.hospital_name || !String(er.hospital_name).trim()) && hospital?.name) {
      emergencyHospitalNameUpdates.push({
        id: er.id,
        payload: { hospital_name: hospital.name, updated_at: nowIso() }
      });
    }

    const responder = er.responder_id ? profileById.get(er.responder_id) : null;
    if (responder) {
      const desiredName = er.responder_name || responder.full_name || responder.username || null;
      const desiredPhone = er.responder_phone || responder.phone || null;
      const needsName = !er.responder_name && desiredName;
      const needsPhone = !er.responder_phone && desiredPhone;
      if (needsName || needsPhone) {
        emergencyResponderUpdates.push({
          id: er.id,
          payload: {
            ...(needsName ? { responder_name: desiredName } : {}),
            ...(needsPhone ? { responder_phone: desiredPhone } : {}),
            updated_at: nowIso()
          }
        });
      }
    }
  }

  report.steps.emergency_hospital_name_backfill = {
    candidateUpdates: emergencyHospitalNameUpdates.length,
    updatedCount: 0
  };
  report.steps.emergency_responder_snapshot_backfill = {
    candidateUpdates: emergencyResponderUpdates.length,
    updatedCount: 0
  };

  if (APPLY) {
    for (const row of emergencyHospitalNameUpdates) {
      await updateRow('emergency_requests', row.id, row.payload);
      report.steps.emergency_hospital_name_backfill.updatedCount += 1;
    }
    for (const row of emergencyResponderUpdates) {
      await updateRow('emergency_requests', row.id, row.payload);
      report.steps.emergency_responder_snapshot_backfill.updatedCount += 1;
    }
  }

  const missingEmergencyVisits = emergencies.filter((er) => !visitRequestIds.has(er.id));
  const visitInserts = missingEmergencyVisits.map((er) => {
    const hospital = er.hospital_id ? hospitalById.get(er.hospital_id) : null;
    const doctor = er.assigned_doctor_id ? doctorById.get(er.assigned_doctor_id) : null;
    const stamp = er.completed_at || er.created_at || nowIso();
    const parts = formatDateParts(stamp);
    const mappedType =
      er.service_type === 'ambulance' ? 'emergency' :
      er.service_type === 'bed' ? 'bed' :
      er.service_type === 'booking' ? 'booking' :
      (er.service_type || 'emergency');
    const mappedStatus =
      er.status === 'completed' ? 'completed' :
      (er.status === 'cancelled' || er.status === 'payment_declined') ? 'cancelled' :
      (er.status === 'accepted' || er.status === 'arrived' || er.status === 'in_progress') ? 'active' :
      'pending';

    return {
      user_id: er.user_id || null,
      hospital_id: er.hospital_id || null,
      request_id: er.id,
      hospital_name: er.hospital_name || hospital?.name || null,
      doctor_name: doctor?.name || null,
      specialty: er.specialty || null,
      date: parts.date,
      time: parts.time,
      type: mappedType,
      status: mappedStatus,
      notes: 'Backfilled from emergency_requests for 1:1 alignment remediation',
      cost: er.total_cost ? String(er.total_cost) : null,
      lifecycle_state: 'backfilled_from_emergency',
      lifecycle_updated_at: nowIso()
    };
  });

  report.steps.visit_backfill_from_emergencies = {
    missingEmergencyCount: missingEmergencyVisits.length,
    insertedCount: 0
  };

  if (APPLY && visitInserts.length > 0) {
    const result = await insertMany('visits', visitInserts);
    report.steps.visit_backfill_from_emergencies.insertedCount = result.count;
  }

  // Refresh visits after insertion to sync canonical snapshots/status safely.
  const refreshedVisits = await fetchAll(
    'visits',
    'id,request_id,user_id,hospital_id,hospital_name,doctor_name,specialty,date,time,type,status,cost,lifecycle_state'
  );

  const visitSyncUpdates = [];
  for (const v of refreshedVisits) {
    if (!v.request_id) continue;
    const er = emergencyById.get(v.request_id);
    if (!er) continue;
    const hospital = er.hospital_id ? hospitalById.get(er.hospital_id) : null;
    const doctor = er.assigned_doctor_id ? doctorById.get(er.assigned_doctor_id) : null;

    const mappedType =
      er.service_type === 'ambulance' ? 'emergency' :
      er.service_type === 'bed' ? 'bed' :
      er.service_type === 'booking' ? 'booking' :
      er.service_type;
    const mappedStatus =
      er.status === 'completed' ? 'completed' :
      (er.status === 'cancelled' || er.status === 'payment_declined') ? 'cancelled' :
      (er.status === 'accepted' || er.status === 'arrived' || er.status === 'in_progress') ? 'active' :
      (v.status || 'pending');

    const payload = {};
    if (!v.user_id && er.user_id) payload.user_id = er.user_id;
    if (!v.hospital_id && er.hospital_id) payload.hospital_id = er.hospital_id;
    if ((!v.hospital_name || !String(v.hospital_name).trim()) && (er.hospital_name || hospital?.name)) {
      payload.hospital_name = er.hospital_name || hospital?.name;
    }
    if ((!v.specialty || !String(v.specialty).trim()) && er.specialty) payload.specialty = er.specialty;
    if ((!v.type || !String(v.type).trim()) && mappedType) payload.type = mappedType;
    if ((!v.doctor_name || !String(v.doctor_name).trim()) && doctor?.name) payload.doctor_name = doctor.name;
    if ((!v.cost || !String(v.cost).trim()) && er.total_cost) payload.cost = String(er.total_cost);
    if ((v.status || '') !== mappedStatus) payload.status = mappedStatus;
    if (!v.lifecycle_state) payload.lifecycle_state = 'synced_from_emergency';

    if (Object.keys(payload).length > 0) {
      payload.lifecycle_updated_at = nowIso();
      payload.updated_at = nowIso();
      visitSyncUpdates.push({ id: v.id, payload });
    }
  }

  report.steps.visit_sync_from_emergency = {
    candidateUpdates: visitSyncUpdates.length,
    updatedCount: 0
  };

  if (APPLY) {
    for (const row of visitSyncUpdates) {
      await updateRow('visits', row.id, row.payload);
      report.steps.visit_sync_from_emergency.updatedCount += 1;
    }
  }

  const paymentOrgUpdates = [];
  for (const p of payments) {
    if (!p.emergency_request_id || p.organization_id) continue;
    const er = emergencyById.get(p.emergency_request_id);
    const hospital = er?.hospital_id ? hospitalById.get(er.hospital_id) : null;
    if (hospital?.organization_id) {
      paymentOrgUpdates.push({
        id: p.id,
        payload: { organization_id: hospital.organization_id, updated_at: nowIso() }
      });
    }
  }

  report.steps.payment_org_backfill_from_emergency_hospital = {
    candidateUpdates: paymentOrgUpdates.length,
    updatedCount: 0
  };

  if (APPLY) {
    for (const row of paymentOrgUpdates) {
      await updateRow('payments', row.id, row.payload);
      report.steps.payment_org_backfill_from_emergency_hospital.updatedCount += 1;
    }
  }

  const invalidDispatchPhaseAmbulanceRequests = emergencies.filter((er) =>
    er.service_type === 'ambulance'
    && (er.status === 'accepted' || er.status === 'arrived')
    && (!er.hospital_id || !er.ambulance_id || !er.responder_id)
  );

  report.steps.ambulance_invalid_dispatch_phase_cancelled = {
    candidateCount: invalidDispatchPhaseAmbulanceRequests.length,
    updatedCount: 0
  };

  if (APPLY && invalidDispatchPhaseAmbulanceRequests.length > 0) {
    await execSql(`
DO $$
BEGIN
  PERFORM set_config('ivisit.allow_emergency_status_write', '1', true);
  PERFORM set_config('ivisit.transition_source', 'alignment_backfill', true);
  PERFORM set_config('ivisit.transition_reason', 'invalid_dispatch_phase_ambulance_assignment', true);
  PERFORM set_config('ivisit.transition_actor_role', 'automation', true);

  UPDATE public.emergency_requests er
  SET status = 'cancelled',
      cancelled_at = COALESCE(er.cancelled_at, NOW()),
      updated_at = NOW()
  WHERE er.service_type = 'ambulance'
    AND er.status IN ('accepted', 'arrived')
    AND (
      er.hospital_id IS NULL
      OR er.ambulance_id IS NULL
      OR er.responder_id IS NULL
    );
END;
$$;
    `);
    report.steps.ambulance_invalid_dispatch_phase_cancelled.updatedCount =
      invalidDispatchPhaseAmbulanceRequests.length;
  }

  report.postflight = {
    organizations: await countRows('organizations'),
    organization_wallets: await countRows('organization_wallets'),
    ivisit_main_wallet: await countRows('ivisit_main_wallet'),
    emergency_requests: await countRows('emergency_requests'),
    visits: await countRows('visits'),
    payments: await countRows('payments')
  };
  report.completedAt = nowIso();

  const outDir = path.join(__dirname, '..', 'validation');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'e2e_alignment_backfill_report.json');
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));

  console.log('[alignment-backfill] Report written:', outFile);
  console.log('[alignment-backfill] org wallets missing -> inserted:',
    report.steps.org_wallet_backfill.missingCount, '->', report.steps.org_wallet_backfill.insertedCount);
  console.log('[alignment-backfill] visits missing -> inserted:',
    report.steps.visit_backfill_from_emergencies.missingEmergencyCount, '->', report.steps.visit_backfill_from_emergencies.insertedCount);
  console.log('[alignment-backfill] payment org links updated:',
    report.steps.payment_org_backfill_from_emergency_hospital.updatedCount);
  console.log('[alignment-backfill] invalid dispatch-phase ambulance requests cancelled:',
    report.steps.ambulance_invalid_dispatch_phase_cancelled.updatedCount);

  if (!APPLY) {
    console.log('[alignment-backfill] Dry-run only. Re-run with --apply to execute writes.');
  }
}

run().catch((error) => {
  console.error('[alignment-backfill] Failed:', error);
  process.exit(1);
});
