#!/usr/bin/env node

const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("[edge-smoke] Missing Supabase credentials (.env/.env.local).");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PROVIDER_CATEGORIES = Object.freeze([
  "hospital",
  "pharmacy",
  "lab",
  "radiology",
  "urgent_care",
  "clinic",
  "mental_health",
  "womens_care",
  "pediatrics",
]);

const LOCATIONS = Object.freeze([
  {
    id: "hemet",
    label: "2235 Corinto Ct, Hemet, CA",
    latitude: 33.75147,
    longitude: -116.97175,
    countryCode: "US",
    radiusMeters: 30000,
  },
  {
    id: "festac",
    label: "House 8, G Close, 4th Avenue, Festac, Lagos, Nigeria",
    latitude: 6.4759495,
    longitude: 3.2799113,
    countryCode: "NG",
    radiusMeters: 30000,
  },
]);

const CATEGORY_RULES = Object.freeze({
  hospital: {
    minResults: 1,
    any: [/\bhospital\b/i, /\bmedical cent(re|er)\b/i, /\bhealth cent(re|er)\b/i],
  },
  pharmacy: {
    minResults: 1,
    any: [/\bpharmac(y|ies|ist)\b/i, /\bchemist\b/i, /\bdrug(store)?\b/i],
  },
  lab: {
    minResults: 1,
    any: [/\blab(orator(y|ies))?\b/i, /\bdiagnostic(s)?\b/i, /\bpatholog(y|ies)\b/i],
  },
  radiology: {
    minResults: 1,
    any: [/\bradiolog(y|ist)\b/i, /\bimaging\b/i, /\bx-?ray\b/i, /\bmri\b/i, /\bultrasound\b/i, /\bscan\b/i],
  },
  urgent_care: {
    minResults: 1,
    any: [/\burgent\b/i, /\bwalk.?in\b/i, /\bemergency\b/i, /\bclinic\b/i, /\bhospital\b/i],
  },
  clinic: {
    minResults: 1,
    any: [/\bclinic\b/i, /\bpolyclinic\b/i, /\bmedical\b/i, /\bhealth cent(re|er)\b/i],
  },
  mental_health: {
    minResults: 1,
    any: [/\bmental\b/i, /\bpsychiatr(y|ic|ist)\b/i, /\bpsycholog(y|ist|ical)\b/i, /\btherapy\b/i, /\bcounsel(l)?ing\b/i],
  },
  womens_care: {
    minResults: 1,
    any: [/\bwomen'?s\b/i, /\bgyn(ae|e)?colog(y|ist)\b/i, /\bobstetric(s|ian)?\b/i, /\bmaternit(y|ies)\b/i, /\bfertility\b/i],
  },
  pediatrics: {
    minResults: 1,
    any: [/\bp(ae|e)diatric(s|ian)?\b/i, /\bchildren'?s\b/i, /\bchild\b/i, /\bkids?\b/i],
  },
});

const BLOCKLIST = Object.freeze({
  lab: [/\bdental\b/i, /\bdentist\b/i, /\borthodont/i, /\bveterinar/i],
  radiology: [/\bdental\b/i, /\bdentist\b/i, /\borthodont/i, /\bveterinar/i],
  mental_health: [/\bdental\b/i, /\bdentist\b/i, /\borthodont/i, /\bveterinar/i],
  womens_care: [/\bdental\b/i, /\bdentist\b/i, /\borthodont/i, /\bveterinar/i],
  pediatrics: [/\bdental\b/i, /\bdentist\b/i, /\borthodont/i, /\bveterinar/i],
});

const argv = new Set(process.argv.slice(2));
const strict = argv.has("--strict");
const includeGooglePlaces = !argv.has("--no-google");
const includeMapboxPlaces = !argv.has("--no-mapbox");
const radiusToleranceKm = Number(process.env.EDGE_SMOKE_RADIUS_TOLERANCE_KM || 10);

const toText = (value) => (typeof value === "string" ? value.trim() : "");

const providerName = (row) =>
  toText(row?.name) ||
  toText(row?.provider_name) ||
  toText(row?.display_name) ||
  toText(row?.title) ||
  "(unnamed provider)";

const providerType = (row) =>
  toText(row?.provider_type) || toText(row?.providerType) || toText(row?.category);

const providerDistanceKm = (row) => {
  const candidates = [
    row?.distance_km,
    row?.distanceKm,
    row?.distance,
    row?.distance_meters != null ? Number(row.distance_meters) / 1000 : null,
    row?.distanceMeters != null ? Number(row.distanceMeters) / 1000 : null,
  ];

  for (const value of candidates) {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric >= 0) return numeric;
  }
  return null;
};

const rowSearchText = (row) =>
  [
    providerName(row),
    row?.address,
    row?.vicinity,
    row?.provider_type,
    row?.providerType,
    Array.isArray(row?.features) ? row.features.join(" ") : "",
    Array.isArray(row?.types) ? row.types.join(" ") : "",
    row?.provider_services ? JSON.stringify(row.provider_services) : "",
    row?.provider_specialties ? JSON.stringify(row.provider_specialties) : "",
  ]
    .filter(Boolean)
    .join(" ");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function hasCategorySignal(row, category) {
  const rules = CATEGORY_RULES[category];
  const text = rowSearchText(row);
  const declaredType = providerType(row);

  if (declaredType === category) return true;
  return rules.any.some((pattern) => pattern.test(text));
}

function assertNoBlocklistedNoise(rows, category, context) {
  const patterns = BLOCKLIST[category] || [];
  if (patterns.length === 0) return;

  const noisy = rows.filter((row) => patterns.some((pattern) => pattern.test(rowSearchText(row))));
  assert(
    noisy.length === 0,
    `${context}: blocklisted provider leakage: ${noisy.map(providerName).join(", ")}`
  );
}

function assertDistances(rows, radiusMeters, context) {
  const radiusKm = radiusMeters / 1000;
  const badRows = rows.filter((row) => {
    const distanceKm = providerDistanceKm(row);
    return distanceKm != null && distanceKm > radiusKm + radiusToleranceKm;
  });

  assert(
    badRows.length === 0,
    `${context}: providers outside radius+tolerance: ${badRows
      .map((row) => `${providerName(row)} (${providerDistanceKm(row)}km)`)
      .join(", ")}`
  );
}

async function invokeDiscovery({ location, category }) {
  const { data, error } = await supabase.functions.invoke("discover-hospitals", {
    body: {
      latitude: location.latitude,
      longitude: location.longitude,
      radius: location.radiusMeters,
      mode: "nearby",
      limit: 15,
      providerCategory: category,
      includeProviderDiscovery: true,
      includeMapboxPlaces,
      includeGooglePlaces,
      countryCode: location.countryCode,
      mergeWithDatabase: true,
    },
  });

  if (error) {
    throw new Error(
      `${location.id}/${category}: function invoke failed: ${error.message || JSON.stringify(error)}`
    );
  }

  return {
    rows: Array.isArray(data?.data) ? data.data : [],
    meta: data?.meta || {},
  };
}

async function runCase(location, category) {
  const context = `${location.id}/${category}`;
  const startedAt = Date.now();
  const { rows, meta } = await invokeDiscovery({ location, category });
  const elapsedMs = Date.now() - startedAt;
  const rules = CATEGORY_RULES[category];

  assert(rows.length >= rules.minResults, `${context}: expected at least ${rules.minResults} result(s), got ${rows.length}`);
  assertDistances(rows, location.radiusMeters, context);
  assertNoBlocklistedNoise(rows, category, context);

  const signaled = rows.filter((row) => hasCategorySignal(row, category));
  const signalRatio = rows.length === 0 ? 0 : signaled.length / rows.length;
  const minimumRatio = strict ? 0.8 : 0.5;

  assert(
    signalRatio >= minimumRatio,
    `${context}: category signal too weak (${signaled.length}/${rows.length}); results: ${rows
      .map((row) => `${providerName(row)} [${providerType(row) || "unknown"}]`)
      .join("; ")}`
  );

  return {
    location: location.id,
    category,
    count: rows.length,
    signalCount: signaled.length,
    providerSource: meta.provider_source || "unknown",
    databaseCount: meta.database_count ?? null,
    providerCount: meta.provider_count ?? null,
    mergedCount: meta.merged_count ?? rows.length,
    durationMs: elapsedMs,
    sample: rows.slice(0, 3).map((row) => ({
      name: providerName(row),
      type: providerType(row) || null,
      distanceKm: providerDistanceKm(row),
    })),
  };
}

async function main() {
  console.log("[edge-smoke] Starting discover-hospitals smoke matrix", {
    locations: LOCATIONS.map((location) => location.id),
    categories: PROVIDER_CATEGORIES,
    includeGooglePlaces,
    includeMapboxPlaces,
    strict,
  });

  const failures = [];
  const results = [];

  for (const location of LOCATIONS) {
    for (const category of PROVIDER_CATEGORIES) {
      try {
        const result = await runCase(location, category);
        results.push(result);
        console.log(
          `[edge-smoke] PASS ${location.id}/${category}: ${result.count} result(s), source=${result.providerSource}, ${result.durationMs}ms`
        );
      } catch (error) {
        failures.push({ location: location.id, category, message: error.message });
        console.error(`[edge-smoke] FAIL ${location.id}/${category}: ${error.message}`);
      }
    }
  }

  console.log("[edge-smoke] Summary");
  console.table(
    results.map((result) => ({
      location: result.location,
      category: result.category,
      count: result.count,
      signal: `${result.signalCount}/${result.count}`,
      source: result.providerSource,
      db: result.databaseCount,
      places: result.providerCount,
      ms: result.durationMs,
    }))
  );

  if (failures.length > 0) {
    console.error("[edge-smoke] Failures");
    console.table(failures);
    process.exit(1);
  }

  console.log("[edge-smoke] PASS");
}

main().catch((error) => {
  console.error("[edge-smoke] Fatal:", error);
  process.exit(1);
});
