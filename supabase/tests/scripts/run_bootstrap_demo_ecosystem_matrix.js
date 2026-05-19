#!/usr/bin/env node

const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

const argv = new Set(process.argv.slice(2));
const apply = argv.has("--apply");
const locationFilter = [...argv]
  .find((arg) => arg.startsWith("--location="))
  ?.split("=")[1]
  ?.trim();

const LOCATIONS = Object.freeze([
  {
    id: "hemet",
    latitude: 33.75147,
    longitude: -116.97175,
    radiusKm: 30,
  },
  {
    id: "festac",
    latitude: 6.4759495,
    longitude: 3.2799113,
    radiusKm: 30,
  },
  {
    id: "london",
    latitude: 51.4983,
    longitude: -0.1186,
    radiusKm: 30,
  },
  {
    id: "nairobi",
    latitude: -1.3004,
    longitude: 36.8076,
    radiusKm: 30,
  },
  {
    id: "delhi",
    latitude: 28.5672,
    longitude: 77.21,
    radiusKm: 30,
  },
]);

const PHASES = Object.freeze(["prepare", "hospitals", "staff", "pricing", "summary"]);

const selectedLocations = locationFilter
  ? LOCATIONS.filter((location) => location.id === locationFilter)
  : LOCATIONS;

if (selectedLocations.length === 0) {
  console.error(`[bootstrap-matrix] Unknown --location=${locationFilter}`);
  process.exit(1);
}

let supabase = null;

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const assertSummaryReady = (summary, context) => {
  assert(summary && typeof summary === "object", `${context}: missing summary`);
  assert(summary.coverage_ready === true, `${context}: coverage_ready was not true`);
  assert(summary.clean_cycle_ready === true, `${context}: clean_cycle_ready was not true`);
};

const invokePhase = async (location, phase) => {
  const userId = `edge_matrix_${location.id}`;
  const { data, error } = await supabase.functions.invoke("bootstrap-demo-ecosystem", {
    body: {
      phase,
      userId,
      latitude: location.latitude,
      longitude: location.longitude,
      radiusKm: location.radiusKm,
    },
  });

  if (error) {
    throw new Error(`${location.id}/${phase}: ${error.message || "invoke failed"}`);
  }
  if (!data?.ok) {
    throw new Error(`${location.id}/${phase}: ${data?.error || "response ok=false"}`);
  }

  assert(Array.isArray(data.timeline), `${location.id}/${phase}: timeline missing`);
  assert(data.organization_id, `${location.id}/${phase}: organization_id missing`);

  if (phase === "prepare") {
    assert(data.preview, `${location.id}/${phase}: preview missing`);
    assert(
      Number(data.preview.candidate_count) >= 0,
      `${location.id}/${phase}: candidate_count missing`,
    );
    return data;
  }

  assertSummaryReady(data.summary, `${location.id}/${phase}`);

  if (phase !== "summary") {
    assert(Array.isArray(data.hospitals), `${location.id}/${phase}: hospitals missing`);
    assert(data.hospitals.length > 0, `${location.id}/${phase}: expected demo hospitals`);
  }

  if (phase === "staff" || phase === "pricing") {
    assert(data.summary.staffing_ready === true, `${location.id}/${phase}: staffing not ready`);
  }

  if (phase === "pricing") {
    assert(data.summary.pricing_ready === true, `${location.id}/${phase}: pricing not ready`);
    assert(data.summary.dispatch_ready === true, `${location.id}/${phase}: dispatch not ready`);
  }

  return data;
};

const main = async () => {
  console.log("[bootstrap-matrix] Starting", {
    apply,
    locations: selectedLocations.map((location) => location.id),
    phases: PHASES,
  });

  if (!apply) {
    console.log("[bootstrap-matrix] Dry run only. Pass --apply to invoke bootstrap-demo-ecosystem.");
    return;
  }

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[bootstrap-matrix] Missing Supabase credentials (.env/.env.local).");
    process.exit(1);
  }

  supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const rows = [];
  for (const location of selectedLocations) {
    for (const phase of PHASES) {
      const startedAt = Date.now();
      const data = await invokePhase(location, phase);
      rows.push({
        location: location.id,
        phase,
        ms: Date.now() - startedAt,
        organization_id: data.organization_id,
        hospitals: Array.isArray(data.hospitals) ? data.hospitals.length : 0,
        clean_cycle_ready: data.summary?.clean_cycle_ready ?? null,
      });
      console.log(`[bootstrap-matrix] PASS ${location.id}/${phase}`);
    }
  }

  console.table(rows);
  console.log("[bootstrap-matrix] PASS");
};

main().catch((error) => {
  console.error("[bootstrap-matrix] FAIL", error);
  process.exit(1);
});
