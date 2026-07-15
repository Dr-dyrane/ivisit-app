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

async function main() {
  const pricingService = loadSourceModule("services/pricingService.js", {
    "./supabase": { supabase: {} },
  });
  const checkoutCost = await pricingService.augmentEmergencyCostForCheckout({
    base_cost: 100,
    distance_surcharge: 10,
    total_cost: 110,
  });
  assert.equal(checkoutCost.totalCost, 110);
  assert.equal(checkoutCost.total_cost, 110);
  assert.equal(checkoutCost.subtotal, 110);
  assert.equal(checkoutCost.grossTotal, 110);
  assert.equal(
    checkoutCost.breakdown.some((entry) => entry?.type === "fee"),
    false,
    "the client must not add an organization fee to a server-owned price",
  );

  const commitHelpers = loadSourceModule(
    "components/map/views/commitPayment/mapCommitPayment.helpers.js",
    {
      "../../../../services/dispatchService": {
        DispatchService: { calculateDistance: () => 0 },
      },
      "../../surfaces/hospitals/mapHospitalDetail.helpers": {
        getDestinationCoordinate: () => null,
      },
    },
  );
  assert.equal(
    commitHelpers.normalizeCommitPaymentCost({ totalCost: 110, feeAmount: 2.75 })
      .subtotal,
    110,
    "a settlement fee must not change the patient-facing canonical total",
  );

  const costService = read("services/serviceCostService.js");
  assert.match(costService, /requireServerQuote === true/);

  const mapCheckout = read(
    "components/map/views/commitPayment/useMapCommitPaymentController.js",
  );
  assert.match(
    mapCheckout,
    /t\?\.tierKey \|\| t\?\.service_type \|\| t\?\.serviceType/,
    "the selected tier must win over a legacy generic pricing-row type",
  );
  assert.match(mapCheckout, /requireServerQuote: true/);

  const ambulanceCards = read(
    "components/map/surfaces/hospitals/mapHospitalDetail.helpers.js",
  );
  assert.match(ambulanceCards, /const serverQuote = serverQuoteMap\?\.\[tier\.id\]/);
  assert.match(ambulanceCards, /Raw rows indicate which tier can be requested/);

  const quoteHook = read("hooks/emergency/useEmergencyAmbulanceQuoteMap.js");
  assert.match(quoteHook, /requireServerQuote: true/);
  assert.match(quoteHook, /ambulance_advanced/);
  assert.match(quoteHook, /ambulance_critical/);

  const calculator = read("supabase/migrations/20260219010000_core_rpcs.sql");
  assert.match(calculator, /RETURN public\.resolve_emergency_pricing\(/);

  for (const migration of ["supabase/migrations/20260219000800_emergency_logic.sql"]) {
    const source = read(migration);
    assert.match(source, /CREATE OR REPLACE FUNCTION public\.resolve_emergency_pricing\(/);
    assert.match(source, /hospital_generic_ambulance_fallback/);
    assert.match(source, /global_generic_ambulance_fallback/);
    assert.match(source, /default_ambulance_fallback/);
    assert.match(source, /Only ambulance requests may use an ambulance-tier hint/);
    assert.match(
      source,
      /REVOKE EXECUTE ON FUNCTION public\.resolve_emergency_pricing\(TEXT, UUID, TEXT, NUMERIC\)/,
    );
    assert.match(source, /p_ambulance_type => p_request_data->>'ambulance_type'/);
    assert.match(source, /'pricing_is_fallback'/);
  }

  console.log("PASS emergency pricing authority contract");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
