import type { DemoContext } from "./context.ts";
import {
  choosePreferredImage,
  resolveSeedImage,
} from "./media.ts";
import {
  dedupeSeedHospitals,
  getProviderSeedHospitals,
} from "./providerSeeds.ts";
import {
  exactLocationKey,
  haversineDistanceKm,
  normalizeFacilityText,
  normalizeHospitalName,
  nowIso,
  toFiniteNumber,
  toGeometryPoint,
  toNonNegativeInt,
  toSafeString,
  toSafeStringArray,
  toStableIdFragment,
  uniqueStrings,
} from "./utils.ts";

const DEMO_HOSPITAL_OFFSETS = [
  { lat: 0.0064, lng: 0.0048 },
  { lat: -0.0051, lng: 0.0062 },
  { lat: 0.0042, lng: -0.0068 },
  { lat: -0.0068, lng: -0.0046 },
  { lat: 0.0081, lng: -0.0027 },
  { lat: -0.0029, lng: 0.0084 },
];

const LAGOS_REFERENCE_POINT = {
  latitude: 6.5244,
  longitude: 3.3792,
};

const LAGOS_DEMO_HOSPITAL_TEMPLATES = [
  {
    name: "Shepherd Specialist Hospital",
    address: "4th Avenue, E Close, Plot 1619, Festac Town, Lagos",
    latitude: 6.4669,
    longitude: 3.2841,
    phone: "",
    rating: 4.3,
    type: "standard",
    image: "",
    specialties: ["Emergency Medicine", "Internal Medicine", "Family Medicine"],
    service_types: ["standard", "premium"],
    features: ["lagos_demo", "festac_coverage", "district:festac"],
    emergency_level: "Level 2",
    wait_time: "10 min",
    price_range: "Accessible",
  },
  {
    name: "Outreach Hospital Festac",
    address: "4th Avenue by 3rd Avenue Bus Stop, Festac Town, Lagos",
    latitude: 6.4676,
    longitude: 3.2862,
    phone: "",
    rating: 4.2,
    type: "standard",
    image: "",
    specialties: ["Emergency Medicine", "Pediatrics", "Diagnostics"],
    service_types: ["standard", "premium"],
    features: ["lagos_demo", "festac_coverage", "district:festac"],
    emergency_level: "Level 2",
    wait_time: "11 min",
    price_range: "Accessible",
  },
  {
    name: "Lagos Island General Hospital",
    address: "1-3 Broad St, Lagos Island, Lagos",
    latitude: 6.4548,
    longitude: 3.3928,
    phone: "+234 1 234 5678",
    rating: 4.5,
    type: "standard",
    image: "",
    specialties: ["Emergency Medicine", "Internal Medicine", "Cardiology"],
    service_types: ["standard", "premium"],
    features: ["lagos_demo", "island_coverage", "district:lagos_island"],
    emergency_level: "Level 1",
    wait_time: "9 min",
    price_range: "Flexible",
  },
  {
    name: "St. Nicholas Hospital",
    address: "57 Campbell St, Lagos Island, Lagos",
    latitude: 6.4516,
    longitude: 3.3936,
    phone: "+234 1 227 2953",
    rating: 4.4,
    type: "premium",
    image: "",
    specialties: ["Emergency Medicine", "Cardiology", "Critical Care"],
    service_types: ["premium", "standard"],
    features: ["lagos_demo", "island_coverage", "district:lagos_island"],
    emergency_level: "Level 1",
    wait_time: "10 min",
    price_range: "Premium",
  },
  {
    name: "Victoria Island Emergency Centre",
    address: "Ozumba Mbadiwe Ave, Victoria Island, Lagos",
    latitude: 6.4281,
    longitude: 3.4219,
    phone: "+234 1 700 4400",
    rating: 4.4,
    type: "premium",
    image: "",
    specialties: ["Emergency Medicine", "Trauma Care", "Orthopedics"],
    service_types: ["premium", "standard"],
    features: ["lagos_demo", "island_coverage", "district:victoria_island"],
    emergency_level: "Level 1",
    wait_time: "11 min",
    price_range: "Premium",
  },
  {
    name: "First Consultant Medical Centre",
    address: "1 Road 16, Ikoyi, Lagos",
    latitude: 6.4465,
    longitude: 3.4342,
    phone: "+234 1 271 0272",
    rating: 4.3,
    type: "premium",
    image: "",
    specialties: ["Emergency Medicine", "Internal Medicine", "Diagnostics"],
    service_types: ["premium", "standard"],
    features: ["lagos_demo", "island_coverage", "district:ikoyi"],
    emergency_level: "Level 1",
    wait_time: "11 min",
    price_range: "Premium",
  },
  {
    name: "Yaba Community Hospital",
    address: "Herbert Macaulay Way, Yaba, Lagos",
    latitude: 6.5095,
    longitude: 3.3711,
    phone: "+234 1 515 2121",
    rating: 4.3,
    type: "standard",
    image: "",
    specialties: ["Emergency Medicine", "Pediatrics", "Family Medicine"],
    service_types: ["standard", "premium"],
    features: ["lagos_demo", "mainland_coverage", "district:yaba"],
    emergency_level: "Level 2",
    wait_time: "12 min",
    price_range: "Accessible",
  },
  {
    name: "Federal Medical Centre Ebute Metta",
    address: "Point Rd, Ebute Metta, Lagos",
    latitude: 6.4815,
    longitude: 3.3809,
    phone: "+234 1 774 6512",
    rating: 4.2,
    type: "standard",
    image: "",
    specialties: ["Emergency Medicine", "Surgery", "Family Medicine"],
    service_types: ["standard", "premium"],
    features: ["lagos_demo", "mainland_coverage", "district:ebute_metta"],
    emergency_level: "Level 2",
    wait_time: "13 min",
    price_range: "Accessible",
  },
  {
    name: "Surulere Emergency Hospital",
    address: "Bode Thomas St, Surulere, Lagos",
    latitude: 6.5012,
    longitude: 3.3537,
    phone: "+234 1 734 2000",
    rating: 4.2,
    type: "standard",
    image: "",
    specialties: ["Emergency Medicine", "Family Medicine", "Orthopedics"],
    service_types: ["standard", "premium"],
    features: ["lagos_demo", "mainland_coverage", "district:surulere"],
    emergency_level: "Level 2",
    wait_time: "13 min",
    price_range: "Accessible",
  },
  {
    name: "Lagos University Teaching Hospital",
    address: "Idi-Araba, Mushin, Lagos",
    latitude: 6.5178,
    longitude: 3.3559,
    phone: "+234 1 774 4087",
    rating: 4.5,
    type: "standard",
    image: "",
    specialties: ["Emergency Medicine", "Trauma Care", "Critical Care"],
    service_types: ["standard", "premium"],
    features: ["lagos_demo", "mainland_coverage", "district:mushin"],
    emergency_level: "Level 1",
    wait_time: "12 min",
    price_range: "Flexible",
  },
  {
    name: "Gbagada General Hospital",
    address: "1 Hospital Rd, Gbagada, Lagos",
    latitude: 6.5566,
    longitude: 3.3915,
    phone: "+234 1 271 5522",
    rating: 4.2,
    type: "standard",
    image: "",
    specialties: ["Emergency Medicine", "Pediatrics", "Orthopedics"],
    service_types: ["standard", "premium"],
    features: ["lagos_demo", "mainland_coverage", "district:gbagada"],
    emergency_level: "Level 2",
    wait_time: "14 min",
    price_range: "Accessible",
  },
  {
    name: "General Hospital Ikeja",
    address: "1 Oba Akinjobi Way, Ikeja, Lagos",
    latitude: 6.6018,
    longitude: 3.3515,
    phone: "+234 1 493 3380",
    rating: 4.1,
    type: "standard",
    image: "",
    specialties: ["Emergency Medicine", "Internal Medicine", "Surgery"],
    service_types: ["standard", "premium"],
    features: ["lagos_demo", "mainland_coverage", "district:ikeja"],
    emergency_level: "Level 2",
    wait_time: "15 min",
    price_range: "Accessible",
  },
  {
    name: "Lagos State University Teaching Hospital",
    address: "1-5 Oba Akinjobi Way, Ikeja, Lagos",
    latitude: 6.593,
    longitude: 3.3401,
    phone: "+234 1 497 7700",
    rating: 4.3,
    type: "standard",
    image: "",
    specialties: ["Emergency Medicine", "Trauma Care", "Internal Medicine"],
    service_types: ["standard", "premium"],
    features: ["lagos_demo", "mainland_coverage", "district:ikeja"],
    emergency_level: "Level 1",
    wait_time: "14 min",
    price_range: "Flexible",
  },
  {
    name: "Lekki Coast Medical Centre",
    address: "Admiralty Way, Lekki Phase 1, Lagos",
    latitude: 6.4474,
    longitude: 3.4722,
    phone: "+234 1 820 1100",
    rating: 4.4,
    type: "premium",
    image: "",
    specialties: ["Emergency Medicine", "Trauma Care", "Cardiology"],
    service_types: ["premium", "standard"],
    features: ["lagos_demo", "coastal_coverage", "district:lekki"],
    emergency_level: "Level 1",
    wait_time: "10 min",
    price_range: "Premium",
  },
  {
    name: "Reddington Hospital",
    address: "12 Idowu Martins St, Victoria Island, Lagos",
    latitude: 6.4314,
    longitude: 3.4212,
    phone: "+234 1 448 0088",
    rating: 4.4,
    type: "premium",
    image: "",
    specialties: ["Emergency Medicine", "Critical Care", "Cardiology"],
    service_types: ["premium", "standard"],
    features: ["lagos_demo", "island_coverage", "district:victoria_island"],
    emergency_level: "Level 1",
    wait_time: "10 min",
    price_range: "Premium",
  },
];

const CITY_DEMO_FALLBACK_CATALOGS = [
  {
    key: "lagos",
    radiusKm: 120,
    referencePoint: LAGOS_REFERENCE_POINT,
    hospitals: LAGOS_DEMO_HOSPITAL_TEMPLATES,
  },
];

const DEMO_FEATURE_FLAGS = [
  "demo_seed",
  "demo_verified",
  "demo_complete",
  "ivisit_demo",
];
const DEMO_SHARED_FLAG = "demo_shared";
const NON_HOSPITAL_SEED_PATTERN =
  /\b(blood bank|blood center|blood centre|blood donation|plasma|donor center|donation center|laboratory|lab\b|pharmacy|veterinary|animal hospital|dental|dentist|optical|optometry)\b/i;

const DEMO_MIN_HOSPITALS = 5;
const DEMO_MAX_HOSPITALS = 6;

type DemoFallbackHospital = {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
  rating?: number;
  type?: string;
  image?: string;
  specialties?: string[];
  service_types?: string[];
  features?: string[];
  emergency_level?: string;
  wait_time?: string;
  price_range?: string;
};

type DemoFallbackCatalog = {
  key: string;
  radiusKm: number;
  referencePoint: {
    latitude: number;
    longitude: number;
  };
  hospitals: DemoFallbackHospital[];
};

const isBootstrapDemoFeature = (feature: string) => {
  const normalized = String(feature || "")
    .trim()
    .toLowerCase();
  return (
    normalized === DEMO_SHARED_FLAG ||
    normalized === "demo_seed" ||
    normalized === "demo_complete" ||
    normalized === "demo_verified" ||
    normalized === "ivisit_demo" ||
    normalized.startsWith("demo_owner:") ||
    normalized.startsWith("demo_scope:")
  );
};

const isDemoSeedRow = (row: any) => {
  const placeId = toSafeString(row?.place_id, "").toLowerCase();
  const verificationStatus = toSafeString(
    row?.verification_status,
    "",
  ).toLowerCase();
  const featureList = toSafeStringArray(row?.features).map((feature) =>
    feature.toLowerCase(),
  );
  const name = toSafeString(row?.name, "").toLowerCase();
  const address = toSafeString(row?.address, "").toLowerCase();

  return (
    placeId.startsWith("demo:") ||
    verificationStatus.startsWith("demo") ||
    featureList.some((feature) => feature.includes("demo")) ||
    /\(demo\)/i.test(name) ||
    /^emergency care center\s+\d+$/i.test(name) ||
    /^coverage(?:\s+[a-z0-9_:-]+)?\s+zone\s+\d+$/i.test(address)
  );
};

const isLikelyHospitalSeed = (row: any) => {
  const text = [
    row?.name,
    row?.address,
    row?.formattedAddress,
    row?.place_formatted,
  ]
    .map((value) => toSafeString(value, ""))
    .filter(Boolean)
    .join(" ");
  return !NON_HOSPITAL_SEED_PATTERN.test(text);
};

const nudgeDemoLocation = (
  latitude: number,
  longitude: number,
  slotIndex: number,
) => {
  const offset = 0.00008 * (slotIndex + 1);
  return {
    latitude: Number((latitude + offset).toFixed(6)),
    longitude: Number((longitude + offset).toFixed(6)),
  };
};

const parseHospitalCoordinates = (
  row: any,
): { latitude: number | null; longitude: number | null } => {
  const lat = toFiniteNumber(row?.latitude);
  const lng = toFiniteNumber(row?.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { latitude: lat, longitude: lng };
  }

  const geoLat = toFiniteNumber(row?.coordinates?.coordinates?.[1]);
  const geoLng = toFiniteNumber(row?.coordinates?.coordinates?.[0]);
  if (Number.isFinite(geoLat) && Number.isFinite(geoLng)) {
    return { latitude: geoLat, longitude: geoLng };
  }

  return { latitude: null, longitude: null };
};

const toDemoPlaceId = (
  ctx: DemoContext,
  seed: any,
  slotIndex: number,
): string => {
  const seedScopeKey = resolveDemoSeedScopeKey(ctx);
  const sourcePlaceId = toSafeString(
    seed?.source_place_id || seed?.place_id,
    "",
  );
  if (sourcePlaceId) {
    return `demo:${seedScopeKey}:src:${toStableIdFragment(sourcePlaceId, `slot${slotIndex + 1}`)}`;
  }
  return `demo:${seedScopeKey}:slot:${slotIndex + 1}`;
};

const findCityDemoFallbackCatalog = (
  ctx: DemoContext,
): DemoFallbackCatalog | null => {
  const match = CITY_DEMO_FALLBACK_CATALOGS.find((catalog) => {
    const distanceKm = haversineDistanceKm(
      { latitude: ctx.latitude, longitude: ctx.longitude },
      catalog.referencePoint,
    );
    return distanceKm <= catalog.radiusKm;
  });

  return (match as DemoFallbackCatalog | undefined) ?? null;
};

const resolveDemoSeedScopeKey = (ctx: DemoContext) => {
  // PULLBACK NOTE: Scope key was previously coordinate-based (ctx.coverageKey)
  // for non-catalog locations. This caused a new org + 5-6 new hospitals on every
  // ~1km GPS drift, accumulating duplicates worldwide (confirmed: Toronto user).
  // Changed to ctx.userSlug — stable across all sessions and all cities.
  // OLD: const catalog = findCityDemoFallbackCatalog(ctx);
  //      return catalog ? `city_${catalog.key}` : ctx.coverageKey;
  // NEW: return ctx.userSlug;
  return ctx.userSlug;
};

const getCatalogSeedHospitals = (ctx: DemoContext) => {
  const catalog = findCityDemoFallbackCatalog(ctx);
  if (!catalog) return [];

  return catalog.hospitals
    .map((hospital, index) => ({
      ...hospital,
      source_place_id: `catalog:${catalog.key}:${toStableIdFragment(
        hospital.name,
        `slot${index + 1}`,
      )}`,
      identity_source: "catalog",
      distance_km: haversineDistanceKm(
        { latitude: ctx.latitude, longitude: ctx.longitude },
        { latitude: hospital.latitude, longitude: hospital.longitude },
      ),
      features: uniqueStrings([
        ...toSafeStringArray(hospital.features),
        `catalog:${catalog.key}`,
      ]),
    }))
    .sort((a, b) => a.distance_km - b.distance_km);
};

export const getNearbySeedHospitals = async (admin: any, ctx: DemoContext) => {
  const { data, error } = await admin.rpc("nearby_hospitals", {
    user_lat: ctx.latitude,
    user_lng: ctx.longitude,
    radius_km: ctx.radiusKm,
  });

  if (error) {
    throw new Error(`nearby_hospitals rpc failed: ${error.message}`);
  }

  const rows = Array.isArray(data) ? data : [];
  const ids = rows
    .map((row) => toSafeString(row?.id, ""))
    .filter((id) => id.length > 0);
  const metadataById = new Map<string, any>();

  if (ids.length > 0) {
    const { data: metadataRows, error: metadataError } = await admin
      .from("hospitals")
      .select(
        "id,place_id,verification_status,features,image,image_source,image_confidence,image_attribution_text",
      )
      .in("id", ids);

    if (metadataError) {
      throw new Error(
        `hospital seed metadata lookup failed: ${metadataError.message}`,
      );
    }

    (Array.isArray(metadataRows) ? metadataRows : []).forEach((row) => {
      const key = toSafeString(row?.id, "");
      if (!key) return;
      metadataById.set(key, row);
    });
  }

  return rows
    .map((row) => ({
      ...row,
      ...(metadataById.get(toSafeString(row?.id, "")) || {}),
    }))
    .filter((row) => !isDemoSeedRow(row))
    .filter(isLikelyHospitalSeed)
    .map((row) => {
      const coords = parseHospitalCoordinates(row);
      return {
        source_place_id: toSafeString(row?.place_id, ""),
        identity_source: "database",
        name: normalizeHospitalName(row?.name, "Nearby Hospital"),
        address: toSafeString(row?.address, "Address unavailable"),
        phone: toSafeString(row?.phone),
        rating: toFiniteNumber(row?.rating) ?? 4.2,
        type: toSafeString(row?.type, "standard"),
        image: toSafeString(row?.image),
        image_source: toSafeString(row?.image_source),
        image_confidence: toFiniteNumber(row?.image_confidence) ?? 0,
        image_attribution_text: toSafeString(row?.image_attribution_text),
        specialties: toSafeStringArray(row?.specialties),
        service_types: toSafeStringArray(row?.service_types),
        features: toSafeStringArray(row?.features),
        emergency_level: toSafeString(row?.emergency_level, "Level 2"),
        wait_time: toSafeString(row?.wait_time, "12 min"),
        price_range: toSafeString(row?.price_range, "Flexible"),
        distance_km: toFiniteNumber(row?.distance_km) ?? 9999,
        latitude: coords.latitude,
        longitude: coords.longitude,
      };
    })
    .sort((a, b) => a.distance_km - b.distance_km);
};

const buildFallbackHospital = (ctx: DemoContext, slotIndex: number) => {
  const offset =
    DEMO_HOSPITAL_OFFSETS[slotIndex % DEMO_HOSPITAL_OFFSETS.length];
  const latitude = ctx.latitude + offset.lat;
  const longitude = ctx.longitude + offset.lng;

  return {
    source_place_id: "",
    name: `Emergency Care Center ${slotIndex + 1}`,
    address: `Coverage ${resolveDemoSeedScopeKey(ctx).toUpperCase()} Zone ${slotIndex + 1}`,
    phone: "",
    rating: 4.3,
    type: "standard",
    image: "",
    specialties: ["Emergency Medicine", "Internal Medicine"],
    service_types: ["standard", "premium"],
    features: [],
    emergency_level: "Level 2",
    wait_time: "10 min",
    price_range: "Flexible",
    latitude,
    longitude,
  };
};

export const ensureDemoHospitals = async (
  admin: any,
  ctx: DemoContext,
  organizationId: string,
  orgAdminId: string | null,
) => {
  const catalog = findCityDemoFallbackCatalog(ctx);
  const nearbySeeds = await getNearbySeedHospitals(admin, ctx);
  const providerSeeds =
    nearbySeeds.length >= DEMO_MIN_HOSPITALS
      ? []
      : await getProviderSeedHospitals(ctx);
  const catalogSeeds =
    nearbySeeds.length + providerSeeds.length >= DEMO_MIN_HOSPITALS
      ? []
      : getCatalogSeedHospitals(ctx);
  const seeds = dedupeSeedHospitals([
    ...nearbySeeds,
    ...providerSeeds,
    ...catalogSeeds,
  ]);
  const targetCount = Math.max(
    DEMO_MIN_HOSPITALS,
    Math.min(
      DEMO_MAX_HOSPITALS,
      seeds.length > 0 ? seeds.length : DEMO_MIN_HOSPITALS,
    ),
  );

  const baseRows = new Array(targetCount).fill(null).map((_, slotIndex) => {
    const seed = seeds[slotIndex] ?? buildFallbackHospital(ctx, slotIndex);
    const fallback = buildFallbackHospital(ctx, slotIndex);
    const latitude = Number.isFinite(seed.latitude)
      ? Number(seed.latitude)
      : fallback.latitude;
    const longitude = Number.isFinite(seed.longitude)
      ? Number(seed.longitude)
      : fallback.longitude;
    const features = uniqueStrings([
      ...DEMO_FEATURE_FLAGS,
      DEMO_SHARED_FLAG,
      `demo_scope:${ctx.coverageKey}`,
      ...toSafeStringArray(seed.features).filter(
        (feature) => !isBootstrapDemoFeature(feature),
      ),
    ]);

    const specialties = uniqueStrings(
      toSafeStringArray(seed.specialties).length > 0
        ? toSafeStringArray(seed.specialties)
        : ["Emergency Medicine", "Internal Medicine"],
    );

    const serviceTypes = uniqueStrings(
      toSafeStringArray(seed.service_types).length > 0
        ? toSafeStringArray(seed.service_types)
        : ["standard", "premium"],
    );

    const seedImageMeta = resolveSeedImage(seed);

    return {
      slot_index: slotIndex,
      place_id: toDemoPlaceId(ctx, seed, slotIndex),
      name: normalizeHospitalName(seed.name, fallback.name),
      address: toSafeString(seed.address, fallback.address),
      phone: toSafeString(seed.phone, ""),
      rating: toFiniteNumber(seed.rating) ?? 4.2,
      type: toSafeString(seed.type, "standard"),
      image: toSafeString(seedImageMeta.image, ""),
      image_source: toSafeString(seedImageMeta.image_source, ""),
      image_confidence: toFiniteNumber(seedImageMeta.image_confidence) ?? 0,
      image_attribution_text: toSafeString(
        seedImageMeta.image_attribution_text,
        "",
      ),
      specialties,
      service_types: serviceTypes,
      features,
      emergency_level: toSafeString(seed.emergency_level, "Level 2"),
      available_beds: Math.max(
        6,
        toNonNegativeInt((seed as any).available_beds, 12),
      ),
      ambulances_count: 1,
      wait_time: toSafeString(seed.wait_time, "12 min"),
      price_range: toSafeString(seed.price_range, "Flexible"),
      latitude,
      longitude,
      coordinates: toGeometryPoint(latitude, longitude),
      // Demo hospitals must behave like fully dispatchable coverage providers in-app.
      // We preserve demo provenance via place_id/features while surfacing them as verified.
      verified: true,
      verification_status: "verified",
      status: "available",
      organization_id: organizationId,
      org_admin_id: orgAdminId,
      updated_at: nowIso(),
    };
  });

  const placeIds = baseRows
    .map((row) => toSafeString(row?.place_id, ""))
    .filter((value) => value.length > 0);
  const existingByPlaceId = new Map<string, any>();
  const existingByLocation = new Map<string, any>();
  if (placeIds.length > 0) {
    const { data: existingRows, error: existingError } = await admin
      .from("hospitals")
      .select(
        "id,place_id,image,image_source,image_confidence,image_attribution_text,latitude,longitude,features,verification_status",
      )
      .in("place_id", placeIds);

    if (existingError) {
      throw new Error(
        `demo hospital image lookup failed: ${existingError.message}`,
      );
    }

    (Array.isArray(existingRows) ? existingRows : []).forEach((row) => {
      const key = toSafeString(row?.place_id, "");
      if (!key) return;
      existingByPlaceId.set(key, row);
    });
  }

  for (const row of baseRows) {
    const locationKey = exactLocationKey(row.latitude, row.longitude);
    if (!locationKey || existingByLocation.has(locationKey)) continue;

    const { data: locationRows, error: locationError } = await admin
      .from("hospitals")
      .select(
        "id,place_id,image,image_source,image_confidence,image_attribution_text,latitude,longitude,features,verification_status",
      )
      .eq("latitude", row.latitude)
      .eq("longitude", row.longitude)
      .limit(1);

    if (locationError) {
      throw new Error(
        `demo hospital location lookup failed: ${locationError.message}`,
      );
    }

    const existingLocation = Array.isArray(locationRows)
      ? locationRows[0]
      : null;
    if (existingLocation) {
      existingByLocation.set(locationKey, existingLocation);
    }
  }

  const rows = baseRows.map((row) => {
    const { slot_index: slotIndex, ...rowForUpsert } = row;
    const existingByPlace = existingByPlaceId.get(toSafeString(row?.place_id, ""));
    const existingAtLocation = existingByLocation.get(
      exactLocationKey(row.latitude, row.longitude),
    );
    const locationDemoRow = isDemoSeedRow(existingAtLocation)
      ? existingAtLocation
      : null;
    const hasDifferentLocationOccupant =
      existingAtLocation?.id &&
      existingByPlace?.id &&
      existingAtLocation.id !== existingByPlace.id;
    const existing = locationDemoRow || existingByPlace || null;
    const adjustedLocation =
      existingAtLocation &&
      !locationDemoRow &&
      (!existing || hasDifferentLocationOccupant)
        ? nudgeDemoLocation(row.latitude, row.longitude, slotIndex)
        : { latitude: row.latitude, longitude: row.longitude };
    const preferredImage = choosePreferredImage(existing, row);
    return {
      ...rowForUpsert,
      place_id: toSafeString(existing?.place_id, toSafeString(row.place_id)),
      latitude: adjustedLocation.latitude,
      longitude: adjustedLocation.longitude,
      coordinates: toGeometryPoint(
        adjustedLocation.latitude,
        adjustedLocation.longitude,
      ),
      image: toSafeString(preferredImage?.image, ""),
      image_source: toSafeString(preferredImage?.image_source, ""),
      image_confidence: toFiniteNumber(preferredImage?.image_confidence) ?? 0,
      image_attribution_text: toSafeString(
        preferredImage?.image_attribution_text,
        toSafeString(row?.image_attribution_text, ""),
      ),
      image_synced_at:
        toSafeString(preferredImage?.image, "").length > 0 ? nowIso() : null,
    };
  });

  const { error: upsertError } = await admin
    .from("hospitals")
    .upsert(rows, { onConflict: "place_id", ignoreDuplicates: false });

  if (upsertError) {
    throw new Error(`demo hospital upsert failed: ${upsertError.message}`);
  }

  if (catalog) {
    const slotPrefix = `demo:${resolveDemoSeedScopeKey(ctx)}:slot:`;
    const { error: cleanupError } = await admin
      .from("hospitals")
      .delete()
      .eq("organization_id", organizationId)
      .like("place_id", `${slotPrefix}%`);

    if (cleanupError) {
      throw new Error(`catalog slot cleanup failed: ${cleanupError.message}`);
    }

    const catalogNames = catalog.hospitals.map((hospital) => hospital.name);
    const { error: retireError } = await admin
      .from("hospitals")
      .update({
        status: "full",
        updated_at: nowIso(),
      })
      .neq("organization_id", organizationId)
      .like("place_id", "demo:%")
      .in("name", catalogNames);

    if (retireError) {
      throw new Error(
        `catalog legacy retirement failed: ${retireError.message}`,
      );
    }
  }

  const activePlaceIds = rows
    .map((row) => toSafeString(row?.place_id, ""))
    .filter((value) => value.length > 0);

  const { data: existingOrgDemoRows, error: existingOrgDemoRowsError } =
    await admin
      .from("hospitals")
      .select("id,place_id")
      .eq("organization_id", organizationId)
      .like("place_id", "demo:%");

  if (existingOrgDemoRowsError) {
    throw new Error(
      `org demo hospital sweep failed: ${existingOrgDemoRowsError.message}`,
    );
  }

  const staleOrgDemoIds = (
    Array.isArray(existingOrgDemoRows) ? existingOrgDemoRows : []
  )
    .filter((row) => !activePlaceIds.includes(toSafeString(row?.place_id, "")))
    .map((row) => row.id)
    .filter(Boolean);

  if (staleOrgDemoIds.length > 0) {
    const { error: retireStaleOrgRowsError } = await admin
      .from("hospitals")
      .update({
        status: "full",
        updated_at: nowIso(),
      })
      .in("id", staleOrgDemoIds);

    if (retireStaleOrgRowsError) {
      throw new Error(
        `org demo hospital retirement failed: ${retireStaleOrgRowsError.message}`,
      );
    }
  }

  // PULLBACK NOTE: Added cross-org geographic retirement sweep.
  // Retires demo hospitals from old coordinate-scoped orgs within ~16km bounding box.
  // These rows accumulate from pre-Pass-1 bootstraps where scope = GPS coords.
  // Retirement = status 'full' — never DELETE, consistent with active pool rule.
  // OLD: sweep was organization_id-scoped only.
  // NEW: sweep also covers demo rows from other orgs within 0.15° bounding box.
  const STALE_SWEEP_RADIUS_DEG = 0.15; // ~16.6 km at equator, ~11 km at 48°N (Toronto)

  const { data: crossOrgStaleRows, error: crossOrgSweepError } = await admin
    .from("hospitals")
    .select("id,place_id,organization_id")
    .like("place_id", "demo:%")
    .eq("status", "available")
    .neq("organization_id", organizationId)
    .gte("latitude", ctx.latitude - STALE_SWEEP_RADIUS_DEG)
    .lte("latitude", ctx.latitude + STALE_SWEEP_RADIUS_DEG)
    .gte("longitude", ctx.longitude - STALE_SWEEP_RADIUS_DEG)
    .lte("longitude", ctx.longitude + STALE_SWEEP_RADIUS_DEG);

  if (crossOrgSweepError) {
    // Non-fatal: log and continue. A sweep failure should not block the user's bootstrap.
    console.warn("[bootstrap] cross-org sweep failed:", crossOrgSweepError.message);
  } else {
    const crossOrgStaleIds = (Array.isArray(crossOrgStaleRows) ? crossOrgStaleRows : [])
      .map((row) => row.id)
      .filter(Boolean);

    if (crossOrgStaleIds.length > 0) {
      const { error: crossOrgRetireError } = await admin
        .from("hospitals")
        .update({ status: "full", updated_at: nowIso() })
        .in("id", crossOrgStaleIds);

      if (crossOrgRetireError) {
        console.warn("[bootstrap] cross-org retirement failed:", crossOrgRetireError.message);
      }
    }
  }

    const { data: activeHospitals, error: activeHospitalsError } = await admin
    .from("hospitals")
    .select(
      "id,name,place_id,organization_id,latitude,longitude,features,verified,verification_status,status",
    )
    .eq("organization_id", organizationId)
    .in("place_id", activePlaceIds)
    .order("place_id", { ascending: true });

  if (activeHospitalsError) {
    throw new Error(
      `active demo hospital lookup failed: ${activeHospitalsError.message}`,
    );
  }

  return Array.isArray(activeHospitals) ? activeHospitals : [];
};
