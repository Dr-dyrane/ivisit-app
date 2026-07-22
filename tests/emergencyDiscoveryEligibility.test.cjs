const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const babel = require("@babel/core");

const ROOT = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");

function loadSourceModule(file, mocks = {}) {
  const filename = path.join(ROOT, file);
  const transformed = babel.transformSync(fs.readFileSync(filename, "utf8"), {
    filename,
    presets: [require.resolve("babel-preset-expo")],
    babelrc: false,
    configFile: false,
  });
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));

  const originalLoad = Module._load;
  Module._load = function loadWithMocks(request, parent, isMain) {
    if (Object.prototype.hasOwnProperty.call(mocks, request)) return mocks[request];
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    loaded._compile(transformed.code, filename);
  } finally {
    Module._load = originalLoad;
  }
  return loaded.exports;
}

const originalTypeScriptLoader = require.extensions[".ts"];
require.extensions[".ts"] = (loadedModule, filename) => {
  const transformed = babel.transformSync(fs.readFileSync(filename, "utf8"), {
    filename,
    presets: [require.resolve("babel-preset-expo")],
    babelrc: false,
    configFile: false,
  });
  loadedModule._compile(transformed.code, filename);
};

async function main() {
try {
  const {
    CANONICAL_EMERGENCY_DISCOVERY_SOURCE,
    evaluateProviderDatabaseSufficiency,
    isDispatchableDatabaseRow,
    isExpiredDemoDatabaseRow,
  } = require("../supabase/functions/_shared/domain/providers/rows.ts");
  const {
    fetchNearbyProviderRows,
  } = require("../supabase/functions/_shared/domain/providers/database.ts");
  const {
    mergeProviderDiscoveryRows,
  } = require("../supabase/functions/_shared/domain/providers/response.ts");
  const {
    parseProviderDiscoveryRequest,
  } = require("../supabase/functions/_shared/domain/providers/request.ts");
  const {
    shouldKeepProviderForRequestedCategory,
  } = require("../supabase/functions/_shared/domain/providers/guards.ts");
  const {
    withProviderDefaults,
  } = require("../supabase/functions/_shared/domain/providers/defaults.ts");

  const parseDiscovery = (body) =>
    parseProviderDiscoveryRequest(body, { googlePlacesEnabled: true });
  assert.equal(
    parseDiscovery({ providerCategory: "hospital" }).isEmergencyMode,
    true,
    "older hospital callers must remain fail-closed by default",
  );
  assert.equal(
    parseDiscovery({
      providerCategory: "hospital",
      emergencyMode: false,
    }).isEmergencyMode,
    false,
    "Explore Care must be able to search hospitals without emergency authority",
  );
  assert.equal(
    parseDiscovery({
      providerCategory: "pharmacy",
      emergencyMode: true,
    }).isEmergencyMode,
    false,
    "non-hospital categories can never select the emergency RPC",
  );

	const genericGoogleNavyHospital = {
		place_id: "ChIJLw173O2IOxARmAgfCKa-KSo",
		name: "Nigerian Navy Hospital",
		address: "Nigerian Navy Hospital, Oluti, Lagos 102102, Lagos, Nigeria",
		google_type: "premise",
		google_types: ["premise", "street_address"],
		latitude: 6.452147,
		longitude: 3.2831993,
	};
	assert.equal(
		shouldKeepProviderForRequestedCategory(genericGoogleNavyHospital, "hospital"),
		true,
		"hospital name evidence must recover valid facilities with generic Google types",
	);
	assert.equal(
		withProviderDefaults(genericGoogleNavyHospital, "google", "hospital").provider_type,
		"hospital",
		"generic Google types must not override a positive hospital name match",
	);

  const eligibleHospital = {
    id: "hospital-eligible",
    name: "Commit-ready hospital",
    status: "available",
    provider_type: "hospital",
    emergency_discovery_source: CANONICAL_EMERGENCY_DISCOVERY_SOURCE,
    emergency_eligible: true,
    dispatch_eligible: true,
    latitude: 33.75,
    longitude: -116.97,
    distance_km: 1,
  };
  const verifiedButIneligibleHospital = {
    id: "hospital-unapproved",
    name: "Verified but unapproved hospital",
    status: "available",
    provider_type: "hospital",
    verified: true,
    verification_status: "verified",
    latitude: 33.76,
    longitude: -116.98,
    distance_km: 2,
  };

  assert.equal(isDispatchableDatabaseRow(eligibleHospital), true);
  assert.equal(
    isDispatchableDatabaseRow({
      ...eligibleHospital,
      emergency_discovery_source: undefined,
    }),
    false,
    "eligible-looking rows without canonical RPC provenance must fail closed",
  );
  assert.equal(
    isDispatchableDatabaseRow({
      ...eligibleHospital,
      emergency_discovery_source: "nearby_providers",
    }),
    false,
    "only nearby_hospitals may mark an emergency discovery row as canonical",
  );
  assert.equal(
    isDispatchableDatabaseRow(verifiedButIneligibleHospital),
    false,
    "verification alone must not authorize emergency commitment",
  );
  assert.equal(
    isDispatchableDatabaseRow({
      ...eligibleHospital,
      dispatch_eligible: "true",
    }),
    false,
    "eligibility must be the explicit canonical boolean",
  );
  assert.equal(
    isDispatchableDatabaseRow({
      ...eligibleHospital,
      status: "unavailable",
    }),
    false,
  );

  const fetchArgs = {
    latitude: 33.75,
    longitude: -116.97,
    providerCategory: "hospital",
    radiusKm: 15,
    limit: 10,
  };
  const {
    emergency_discovery_source: _ignoredEmergencyDiscoverySource,
    ...canonicalRpcInput
  } = eligibleHospital;
  const canonicalFetch = await fetchNearbyProviderRows({
    ...fetchArgs,
    isEmergencyMode: true,
    supabaseClient: {
      rpc: async (rpcName) => {
        assert.equal(rpcName, "nearby_hospitals");
        return { data: [canonicalRpcInput], error: null };
      },
    },
  });
  assert.equal(
    canonicalFetch.rows[0]?.emergency_discovery_source,
    CANONICAL_EMERGENCY_DISCOVERY_SOURCE,
    "successful nearby_hospitals rows must carry canonical provenance",
  );
  assert.equal(isDispatchableDatabaseRow(canonicalFetch.rows[0]), true);

  const exploreFetch = await fetchNearbyProviderRows({
    ...fetchArgs,
    isEmergencyMode: false,
    supabaseClient: {
      rpc: async (rpcName) => {
        assert.equal(rpcName, "nearby_providers");
        return { data: [canonicalRpcInput], error: null };
      },
    },
  });
  assert.equal(
    Object.prototype.hasOwnProperty.call(
      exploreFetch.rows[0],
      "emergency_discovery_source",
    ),
    false,
    "Explore Care rows must not receive emergency RPC provenance",
  );

  const failedCanonicalFetch = await fetchNearbyProviderRows({
    ...fetchArgs,
    isEmergencyMode: true,
    supabaseClient: {
      rpc: async () => ({
        data: [canonicalRpcInput],
        error: { message: "rpc failed" },
      }),
    },
  });
  assert.deepEqual(
    failedCanonicalFetch.rows,
    [],
    "failed canonical RPC calls must not produce trusted emergency rows",
  );

  const sufficiency = evaluateProviderDatabaseSufficiency({
    dbRows: [eligibleHospital, verifiedButIneligibleHospital],
    isEmergencyMode: true,
    providerCategory: "hospital",
    mode: "nearby",
    limit: 2,
    mergeWithDatabase: true,
    nearbyComfortThreshold: 2,
    localNearbyComfortThreshold: 2,
  });
  assert.deepEqual(
    sufficiency.dispatchableDbResults.map((row) => row.id),
    [eligibleHospital.id],
  );
  assert.deepEqual(
    sufficiency.categoryFilteredDbResults.map((row) => row.id),
    [eligibleHospital.id],
    "emergency category results must have the same commitment gate",
  );
  assert.equal(
    sufficiency.hasEnoughDbResults,
    false,
    "unapproved database rows must not satisfy emergency coverage",
  );

  const emergencyResponse = mergeProviderDiscoveryRows({
    dbResults: [verifiedButIneligibleHospital, eligibleHospital],
    categoryFilteredDbResults: [verifiedButIneligibleHospital, eligibleHospital],
    normalizedProviderRows: [{
      id: "google-place-1",
      name: "Raw Google hospital",
      latitude: 33.77,
      longitude: -116.99,
    }],
    providerSource: "google",
    isEmergencyMode: true,
    latitude: 33.75,
    longitude: -116.97,
    limit: 10,
  });
  assert.deepEqual(
    emergencyResponse.limitedResults.map((row) => row.id),
    [eligibleHospital.id],
    "emergency responses must expose only canonical commit-eligible hospitals",
  );
  assert.deepEqual(
    emergencyResponse.providerResults,
    [],
    "raw provider rows must never cross the emergency response boundary",
  );

  const exploreResponse = mergeProviderDiscoveryRows({
    dbResults: [],
    categoryFilteredDbResults: [],
    normalizedProviderRows: [{
      id: "google-place-2",
      name: "Raw explore provider",
      latitude: 33.77,
      longitude: -116.99,
    }],
    providerSource: "google",
    isEmergencyMode: false,
    latitude: 33.75,
    longitude: -116.97,
    limit: 10,
  });
  assert.equal(
    exploreResponse.providerResults.length,
    1,
    "the emergency gate must not remove Explore Care provider discovery",
  );

  let rpcRowsByName = {};
  let hydratedRows = [];
  let edgeRows = [];
  let lastDiscoveryBody = null;
  const serviceSupabase = {
    rpc: async (rpcName) => ({
      data: rpcRowsByName[rpcName] || [],
      error: null,
    }),
    from: () => ({
      select: () => ({
        in: async () => ({ data: hydratedRows, error: null }),
      }),
    }),
    functions: {
      invoke: async (_name, options) => {
        lastDiscoveryBody = options?.body || null;
        return { data: { data: edgeRows }, error: null };
      },
    },
  };
  const { hospitalsService } = loadSourceModule("services/hospitalsService.js", {
    "./supabase": { supabase: serviceSupabase },
    "./displayIdService": {
      isValidUUID: () => true,
      resolveEntityId: async (value) => value,
    },
    "./mapApiConfig": { isGooglePlacesEnabled: () => true },
    "./hospitalIdentity": {
      coordinateClusterKey: (value) => String(value ?? ""),
      getHospitalFacilityKey: (hospital) =>
        hospital?.id ? `id:${hospital.id}` : null,
      normalizeFacilityText: (value) => String(value || "").trim().toLowerCase(),
    },
    "../constants/providerTypes": {
      PROVIDER_TYPES: {
        HOSPITAL: "hospital",
        PHARMACY: "pharmacy",
        CLINIC: "clinic",
      },
      EMERGENCY_LEVELS: { GENERAL_HOSPITAL: "General Hospital" },
      ER_ELIGIBLE_LEVELS: [],
      VERIFICATION_STATUS: {},
      DISPATCH_ELIGIBLE_STATUSES: [],
      PROVIDER_SOURCES: { MANUAL_SEED: "manual_seed" },
      normaliseEmergencyLevel: (value) => value || null,
      deriveEmergencyEligible: (providerType) => providerType === "hospital",
      deriveDispatchEligible: (emergencyEligible, verificationStatus) =>
        emergencyEligible && verificationStatus === "verified",
    },
  });

  const organizationBackedHospital = {
    ...eligibleHospital,
    organization_id: "organization-verified",
  };
  assert.equal(
    hospitalsService._mapHospital(organizationBackedHospital).isDispatchReady,
    true,
  );
  assert.equal(
    hospitalsService._mapHospital({
      ...organizationBackedHospital,
      organization_id: null,
    }).isDispatchReady,
    false,
    "canonical-looking rows without a hydrated organization must not be selectable",
  );
  assert.equal(
    hospitalsService._mapHospital({
      ...organizationBackedHospital,
      emergency_discovery_source: undefined,
    }).isDispatchReady,
    false,
    "organization ownership alone must not replace canonical RPC provenance",
  );

  const directRpcHospital = {
    ...canonicalRpcInput,
    id: "direct-rpc-hospital",
  };
  const directRpcOrglessHospital = {
    ...canonicalRpcInput,
    id: "direct-rpc-orgless",
    distance_km: 2,
  };
  rpcRowsByName = {
    nearby_hospitals: [directRpcHospital, directRpcOrglessHospital],
  };
  hydratedRows = [
    { ...directRpcHospital, organization_id: "organization-verified" },
    { ...directRpcOrglessHospital, organization_id: null },
  ];
  const directlyListedHospitals = await hospitalsService.listNearby(33.75, -116.97, 15);
  assert.deepEqual(
    directlyListedHospitals.map((hospital) => hospital.id),
    [directRpcHospital.id],
    "direct nearby_hospitals rows must be canonical and organization-backed after hydration",
  );

  const edgeCanonicalHospital = {
    ...eligibleHospital,
    id: "edge-canonical-hospital",
  };
  const edgeOrglessHospital = {
    ...eligibleHospital,
    id: "edge-orgless-hospital",
    distance_km: 2,
  };
  const edgeUntrustedHospital = {
    ...eligibleHospital,
    id: "edge-untrusted-hospital",
    distance_km: 3,
    emergency_discovery_source: undefined,
  };
  edgeRows = [edgeCanonicalHospital, edgeOrglessHospital, edgeUntrustedHospital];
  hydratedRows = [
    { ...edgeCanonicalHospital, organization_id: "organization-verified" },
    { ...edgeOrglessHospital, organization_id: null },
    { ...edgeUntrustedHospital, organization_id: "organization-verified" },
  ];
  const edgeDiscoveredHospitals = await hospitalsService.discoverNearby(
    33.75,
    -116.97,
    15000,
  );
  assert.deepEqual(
    edgeDiscoveredHospitals.map((hospital) => hospital.id),
    [edgeCanonicalHospital.id],
    "Edge discovery must reject both orgless and untrusted emergency rows",
  );
  assert.equal(
    lastDiscoveryBody?.emergencyMode,
    true,
    "the emergency service must request the fail-closed discovery contract",
  );

  const exploreProvider = {
    id: "explore-pharmacy",
    name: "Explore pharmacy",
    status: "available",
    provider_type: "pharmacy",
    latitude: 33.78,
    longitude: -116.99,
    distance_km: 2,
  };
  rpcRowsByName = { nearby_providers: [exploreProvider] };
  hydratedRows = [exploreProvider];
  const directlyListedExploreProviders = await hospitalsService.listNearbyProviders(
    33.75,
    -116.97,
    "pharmacy",
    15,
  );
  assert.equal(directlyListedExploreProviders.length, 1);
  assert.equal(directlyListedExploreProviders[0].providerType, "pharmacy");
  assert.equal(
    directlyListedExploreProviders[0].isDispatchReady,
    false,
    "Explore Care remains available without becoming emergency-selectable",
  );

  edgeRows = [exploreProvider];
  const edgeExploreProviders = await hospitalsService.discoverNearbyProviders(
    33.75,
    -116.97,
    "pharmacy",
    15000,
  );
  assert.equal(edgeExploreProviders.length, 1);
  assert.equal(
    lastDiscoveryBody?.emergencyMode,
    false,
    "Explore Care must explicitly opt out of emergency discovery",
  );

	edgeRows = [{
		...genericGoogleNavyHospital,
		id: "provider_google_0",
		provider_type: "hospital",
		emergency_eligible: true,
		dispatch_eligible: false,
		verified: false,
		status: "available",
		distance_km: 0.13,
	}];
	const hospitalDirectoryMatches = await hospitalsService.searchNearbyProvidersByText(
		6.45165,
		3.28212,
		"Nigerian Navy Reference Hospital Ojo",
		"hospital",
		50000,
		{ countryCode: "ng" },
	);
	assert.equal(hospitalDirectoryMatches.length, 1);
	assert.equal(hospitalDirectoryMatches[0].name, "Nigerian Navy Hospital");
	assert.equal(hospitalDirectoryMatches[0].isDispatchReady, false);
	assert.equal(lastDiscoveryBody?.mode, "text_search");
	assert.equal(lastDiscoveryBody?.emergencyMode, false);
	assert.equal(lastDiscoveryBody?.mergeWithDatabase, true);
	assert.equal(lastDiscoveryBody?.includeGooglePlaces, true);
	assert.equal(lastDiscoveryBody?.countryCode, "NG");
	assert.equal(
		lastDiscoveryBody?.query,
		"Nigerian Navy Reference Hospital Ojo",
	);

	const mapSearchModel = read(
		"components/map/surfaces/search/useMapSearchSheetModel.js",
	);
	assert.match(
		mapSearchModel,
		/hospitalsService\.searchNearbyProvidersByText\([\s\S]*?"hospital"[\s\S]*?includeGooglePlaces: true/,
		"map search must route hospital-name queries through bounded directory search",
	);

  const nearbyHospitalsRpc = read("supabase/migrations/20260219010000_core_rpcs.sql");
  assert.match(
    nearbyHospitalsRpc,
    /AND h\.emergency_eligible = true\s+AND h\.dispatch_eligible = true/,
    "direct nearby-hospital fallback must use the same dispatch eligibility gate",
  );
  assert.match(
    nearbyHospitalsRpc,
    /FROM public\.hospitals h\s+JOIN public\.organizations organization\s+ON organization\.id = h\.organization_id/,
    "nearby_hospitals must require a real owning organization",
  );
  assert.match(
    nearbyHospitalsRpc,
    /AND organization\.is_active = true\s+AND organization\.verification_status = 'verified'/,
    "nearby_hospitals must match the organization commitment gate",
  );

  const nearbyHospitalsSignature = nearbyHospitalsRpc.match(
    /CREATE OR REPLACE FUNCTION public\.nearby_hospitals[\s\S]*?RETURNS TABLE \(([\s\S]*?)\) AS \$\$/,
  );
  assert.ok(nearbyHospitalsSignature, "nearby_hospitals return signature must be readable");
  const returnColumnNames = nearbyHospitalsSignature[1]
    .split(",")
    .map((column) => column.trim().split(/\s+/)[0]);
  assert.deepEqual(
    returnColumnNames,
    [
      "id",
      "name",
      "address",
      "latitude",
      "longitude",
      "distance",
      "verified",
      "status",
      "display_id",
      "provider_type",
      "emergency_eligible",
      "dispatch_eligible",
      "verification_status",
      "provider_source",
      "category_confidence",
    ],
    "organization eligibility must not change the nearby_hospitals return shape",
  );

  assert.match(
    nearbyHospitalsRpc,
    /CREATE OR REPLACE FUNCTION public\.nearby_hospitals[\s\S]*?SECURITY DEFINER SET search_path = public;/,
    "the canonical emergency discovery function must pin its security-definer search path",
  );

  const deploymentAssertion = read(
    "supabase/tests/scripts/run_emergency_dispatch_contract_deployment.js",
  );
  assert.match(deploymentAssertion, /'JOIN public\.organizations organization'/);
  assert.match(deploymentAssertion, /'organization\.is_active = true'/);
  assert.match(
    deploymentAssertion,
    /'organization\.verification_status = ''verified'''/,
  );

  const emergencyHospitalQuery = read("hooks/emergency/useHospitalsQuery.ts");
  assert.match(
    emergencyHospitalQuery,
    /raw\.filter\(\(h: any\) => h\?\.isDispatchReady === true\)/,
    "the emergency UI must fail closed instead of restoring raw discovery rows",
  );
  const emergencyQueryBlock = emergencyHospitalQuery.match(
    /export function useEmergencyHospitalsQuery\([\s\S]*?^}/m,
  )?.[0];
  assert.ok(
    emergencyQueryBlock,
    "the emergency hospital query contract must remain readable",
  );
  assert.doesNotMatch(
    emergencyQueryBlock,
    /placeholderData\s*:/,
    "a new pickup query must not render hospitals owned by the previous pickup while discovery is pending",
  );

  const mapExploreFlow = read("hooks/map/exploreFlow/useMapExploreFlow.js");
  assert.match(
    mapExploreFlow,
    /useMapLocation\(\{[\s\S]*?sheetPayload,\s*defaultExploreSnapState,\s*setSheetView,/,
    "pickup source-return must receive the canonical explore snap state",
  );

  const expiredDemoHospital = {
    ...eligibleHospital,
    id: "hospital-expired-demo",
    place_id: "demo:expired:hospital",
    features: ["demo_seed", "demo_expires_at:1000"],
  };
  assert.equal(isExpiredDemoDatabaseRow(expiredDemoHospital, 1001), true);
  const expirySufficiency = evaluateProviderDatabaseSufficiency({
    dbRows: [expiredDemoHospital, eligibleHospital],
    isEmergencyMode: true,
    providerCategory: "hospital",
    mode: "nearby",
    limit: 2,
    mergeWithDatabase: true,
    nearbyComfortThreshold: 2,
    localNearbyComfortThreshold: 2,
  });
  assert.deepEqual(
    expirySufficiency.dispatchableDbResults.map((row) => row.id),
    [eligibleHospital.id],
    "expired demo fixtures must not satisfy emergency coverage",
  );
  assert.match(
    mapExploreFlow,
    /isEmergencyCareDiscoveryPending\(\{[\s\S]*?coverageModePreferenceLoaded,[\s\S]*?isLoadingHospitals,/,
    "the map flow must derive emergency CTA readiness from the canonical preference and query owners",
  );
  assert.doesNotMatch(
    mapExploreFlow.match(
      /isEmergencyCareDiscoveryPending\(\{[\s\S]*?\}\);/,
    )?.[0] || "",
    /isBootstrappingDemo/,
    "background demo provisioning must not block an emergency CTA after live discovery settles",
  );

  const mapCallbacks = read("hooks/map/exploreFlow/useMapCallbacks.js");
  assert.match(
    mapCallbacks,
    /isCareDiscoveryPending[\s\S]*?mode === "ambulance"[\s\S]*?mode === "both"[\s\S]*?return;/,
    "the navigation callback must reject early Ambulance and Compare taps while discovery is pending",
  );
  const { isEmergencyCareDiscoveryPending } = loadSourceModule(
    "hooks/map/exploreFlow/mapExploreFlow.loading.js",
  );
  assert.equal(
    isEmergencyCareDiscoveryPending({
      coverageModePreferenceLoaded: false,
      isLoadingHospitals: false,
    }),
    true,
  );
  assert.equal(
    isEmergencyCareDiscoveryPending({
      coverageModePreferenceLoaded: true,
      isLoadingHospitals: true,
    }),
    true,
  );
  assert.equal(
    isEmergencyCareDiscoveryPending({
      coverageModePreferenceLoaded: true,
      isLoadingHospitals: false,
      isBootstrappingDemo: true,
    }),
    false,
    "background demo provisioning cannot hold the patient emergency gate",
  );

  const careSection = read(
    "components/map/views/exploreIntent/MapExploreIntentCareSection.jsx",
  );
  assert.equal(
    (careSection.match(/disabled=\{isCareDiscoveryPending\}/g) || []).length,
    6,
    "Ambulance and Compare must be gated in panel, web-mobile, and canonical layouts",
  );

  for (const migration of ["supabase/migrations/20260219000800_emergency_logic.sql"]) {
    const createEmergency = read(migration);
    assert.match(createEmergency, /hospital\.dispatch_eligible = true/);
    assert.match(createEmergency, /organization\.is_active = true/);
    assert.match(createEmergency, /HOSPITAL_NOT_EMERGENCY_COMMIT_ELIGIBLE/);
  }

  console.log("PASS emergency discovery commitment eligibility");
} finally {
  if (originalTypeScriptLoader) {
    require.extensions[".ts"] = originalTypeScriptLoader;
  } else {
    delete require.extensions[".ts"];
  }
}
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
