import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getBooleanEnv, getEnv } from "../../_shared/env/env.ts";
import { withProviderDefaults } from "../../_shared/domain/providers/defaults.ts";
import { fetchNearbyProviderRows } from "../../_shared/domain/providers/database.ts";
import {
  fetchExternalProviderData,
  type ProviderSource,
} from "../../_shared/domain/providers/discoveryFlow.ts";
import { enrichGoogleProviderDetails } from "../../_shared/domain/providers/enrichmentFlow.ts";
import { shouldKeepProviderForRequestedCategory } from "../../_shared/domain/providers/guards.ts";
import {
  buildProviderMediaProxyUrl,
} from "../../_shared/domain/providers/media.ts";
import {
  MAP_LOCAL_NEARBY_RADIUS_KM,
  MAP_LOCAL_NEARBY_COMFORT_THRESHOLD,
  REGION_LOCAL_FIRST_COUNTRY_CODES,
} from "../../_shared/domain/providers/locality.ts";
import { normalizeGooglePlace, normalizeMapboxPlace } from "../../_shared/domain/providers/normalizeExternal.ts";
import { persistDiscoveredProviderRows } from "../../_shared/domain/providers/persistenceFlow.ts";
import {
  parseProviderDiscoveryRequest,
  parseProviderEnrichmentRequest,
} from "../../_shared/domain/providers/request.ts";
import {
  isDispatchableDatabaseRow,
  isWithinDistanceKm,
  mergeCanonicalAndProviderRows,
  withDistanceFromOrigin,
} from "../../_shared/domain/providers/rows.ts";
import { jsonResponse, optionsResponse } from "../../_shared/http/cors.ts";
import { getAuthorizationHeader, isOptionsRequest } from "../../_shared/http/request.ts";
import { createServiceClient, createUserClient } from "../../_shared/supabase/clients.ts";

const toSafeString = (value: unknown, fallback = ""): string => {
  if (typeof value !== "string") return fallback;
  const clean = value.trim();
  return clean.length > 0 ? clean : fallback;
};

const MAP_NEARBY_COMFORT_THRESHOLD = 5;

const buildHospitalMediaProxyUrl = (placeId: string): string =>
  buildProviderMediaProxyUrl(
    getEnv("SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_URL"),
    placeId,
  );

serve(async (req) => {
  if (isOptionsRequest(req)) {
    return optionsResponse();
  }

  try {
    console.log("[discover-hospitals] request start", req.method);

    const authHeader = getAuthorizationHeader(req);
    if (authHeader) {
      try {
        const authClient = createUserClient(authHeader);
        const {
          data: { user },
          error: authError,
        } = await authClient.auth.getUser();
        console.log("[discover-hospitals] auth header present", {
          valid: !authError && !!user,
        });
      } catch (authCheckError) {
        console.log(
          "[discover-hospitals] auth check failed, continuing anonymously",
          authCheckError
        );
      }
    }

    const body = await req.json();
    const action = typeof body?.action === "string" ? body.action.trim() : "discover";
    if (action === "enrich_provider") {
      const { placeId, providerCategory } = parseProviderEnrichmentRequest(body);
      if (!placeId) {
        throw new Error("placeId is required");
      }

      const googlePlacesEnabled = getBooleanEnv(false, "ENABLE_GOOGLE_PLACES", "EXPO_PUBLIC_ENABLE_GOOGLE_PLACES");
      const googleApiKey = getEnv(
        "GOOGLE_MAPS_API_KEY",
        "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY",
        "GOOGLE_MAPS_ANDROID_API_KEY",
      );

      if (!googlePlacesEnabled || !googleApiKey) {
        return jsonResponse(
          {
            data: null,
            meta: {
              action,
              provider_category: providerCategory,
              google_enabled: false,
              skip_reason: !googlePlacesEnabled ? "google_places_disabled" : "missing_google_api_key",
            },
          },
        );
      }

      const {
        enrichedRow,
        persisted,
        providerPersistenceError,
      } = await enrichGoogleProviderDetails({
        supabaseClient: createServiceClient(),
        apiKey: googleApiKey,
        placeId,
        providerCategory,
        buildMediaProxyUrl: buildHospitalMediaProxyUrl,
      });

      return jsonResponse(
        {
          data: enrichedRow,
          meta: {
            action,
            provider_category: providerCategory,
            provider_source: "google",
            google_enabled: true,
            persisted,
            provider_persistence_error: providerPersistenceError,
          },
        },
      );
    }

    const googlePlacesEnabled = getBooleanEnv(false, "ENABLE_GOOGLE_PLACES", "EXPO_PUBLIC_ENABLE_GOOGLE_PLACES");
    const {
      latitude,
      longitude,
      radius,
      mode,
      query,
      limit,
      includeProviderDiscovery,
      includeMapboxPlaces,
      includeGooglePlaces,
      mergeWithDatabase,
      countryCode,
      providerCategory,
      isEmergencyMode,
      regionLocalFirstEnabled,
    } = parseProviderDiscoveryRequest(body, { googlePlacesEnabled });
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new Error("latitude and longitude are required");
    }

    const mapboxToken = getEnv("MAPBOX_ACCESS_TOKEN", "EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN");
    const googleApiKey = getEnv(
      "GOOGLE_MAPS_API_KEY",
      "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY",
      "GOOGLE_MAPS_ANDROID_API_KEY",
    );

    const supabaseClient = createServiceClient();

    let providerData: any[] = [];
    let providerSource: ProviderSource = "database";
    let normalizedProviderHospitals: any[] = [];
    let providerDiscoverySkipped = false;
    let providerDiscoverySkipReason = "";
    let providerPersistenceCount = 0;
    let providerPersistenceErrorCount = 0;
    let localProviderFetchCount = 0;
    let wideProviderFallbackCount = 0;
    let wideProviderFallbackUsed = false;

    const radiusKm = Math.max(1, Math.round(radius / 1000));

    // PULLBACK NOTE: EXPLORE-CARE-PERMANENT-FIX — Gap: Wrong RPC for non-hospital categories
    // OLD: always called nearby_hospitals (filters provider_type='hospital' + emergency_eligible)
    //      → labs, pharmacies, clinics in DB were never returned in explore mode
    // NEW: isEmergencyMode → nearby_hospitals; explore mode → nearby_providers with category filter
    let dbResults: any[] = [];
    const initialDbFetch = await fetchNearbyProviderRows({
      supabaseClient,
      isEmergencyMode,
      latitude,
      longitude,
      providerCategory,
      radiusKm,
      limit,
    });
    if (initialDbFetch.error) {
      console.error(`[discover-hospitals] ${initialDbFetch.rpcName} rpc failed`, initialDbFetch.error);
      if (isEmergencyMode) {
        throw initialDbFetch.error;
      }
      // Non-fatal: continue with empty dbResults, let Mapbox/Google fill the gap.
    } else {
      dbResults = initialDbFetch.rows;
    }
    const dispatchableDbResults = dbResults.filter((row: any) =>
      isDispatchableDatabaseRow(row)
    );
    const localDispatchableDbResults = dispatchableDbResults.filter((row: any) =>
      isWithinDistanceKm(row, MAP_LOCAL_NEARBY_RADIUS_KM)
    );
    // PULLBACK NOTE: EXPLORE-CARE-PERMANENT-FIX — hasEnoughDbResults for explore mode
    // OLD: always used dispatchableDbResults (isDispatchable=false for all non-hospitals)
    //      → explore mode ALWAYS triggered external discovery even when DB had results
    // NEW: explore mode uses category-guarded DB count; emergency mode keeps dispatchable count
    const categoryFilteredDbResults = isEmergencyMode
      ? dbResults
      : dbResults.filter((row: any) => {
          const rowType = toSafeString(row?.provider_type, "hospital").toLowerCase();
          return rowType === providerCategory &&
            shouldKeepProviderForRequestedCategory(row, providerCategory);
        });
    const relevantDbResults = isEmergencyMode ? dispatchableDbResults : categoryFilteredDbResults;
    const localRelevantDbResults = isEmergencyMode
      ? localDispatchableDbResults
      : categoryFilteredDbResults.filter((row: any) => isWithinDistanceKm(row, MAP_LOCAL_NEARBY_RADIUS_KM));
    const databaseComfortTarget =
      mode === "nearby" ? Math.min(limit, MAP_NEARBY_COMFORT_THRESHOLD) : limit;
    const localComfortTarget =
      mode === "nearby"
        ? Math.min(limit, MAP_LOCAL_NEARBY_COMFORT_THRESHOLD)
        : limit;
    const hasEnoughDbResults =
      mergeWithDatabase &&
      relevantDbResults.length >= databaseComfortTarget &&
      localRelevantDbResults.length >= localComfortTarget;
    if (hasEnoughDbResults) {
      providerDiscoverySkipped = true;
      providerDiscoverySkipReason = "database_sufficient";
      console.log("[discover-hospitals] provider discovery skipped", {
        reason: providerDiscoverySkipReason,
        dbCount: dbResults.length,
        dispatchableDbCount: dispatchableDbResults.length,
        localDispatchableDbCount: localDispatchableDbResults.length,
        comfortTarget: databaseComfortTarget,
        localComfortTarget,
        localRadiusKm: MAP_LOCAL_NEARBY_RADIUS_KM,
      });
    }

    if (includeProviderDiscovery && !hasEnoughDbResults) {
      try {
        const externalProviderResult = await fetchExternalProviderData({
          googleApiKey,
          mapboxToken,
          includeGooglePlaces,
          includeMapboxPlaces,
          latitude,
          longitude,
          radius,
          mode,
          query,
          limit,
          providerCategory,
          countryCode,
          regionLocalFirstEnabled,
          localComfortTarget,
        });
        providerData = externalProviderResult.providerData;
        providerSource = externalProviderResult.providerSource;
        localProviderFetchCount = externalProviderResult.localProviderFetchCount;
        wideProviderFallbackCount = externalProviderResult.wideProviderFallbackCount;
        wideProviderFallbackUsed = externalProviderResult.wideProviderFallbackUsed;
      } catch (providerError) {
        console.error("[discover-hospitals] provider fetch failed", providerError);
      }

      normalizedProviderHospitals = providerData
        .map((place: any, index: number) =>
          providerSource === "mapbox"
            ? normalizeMapboxPlace(place, latitude, longitude, index)
            : normalizeGooglePlace(place, latitude, longitude, index, buildHospitalMediaProxyUrl)
        )
        .map((place: any) => withProviderDefaults(place, providerSource, providerCategory))
        .map((place: any) => withDistanceFromOrigin(place, latitude, longitude))
        .filter(
          (place: any) =>
            !!place?.place_id &&
            Number.isFinite(place?.latitude) &&
            Number.isFinite(place?.longitude) &&
            Number.isFinite(place?.distance_km) &&
            place.distance_km <= radius / 1000 &&
            shouldKeepProviderForRequestedCategory(place, providerCategory)
        );

      if (mergeWithDatabase && normalizedProviderHospitals.length > 0) {
        const persistenceResult = await persistDiscoveredProviderRows({
          supabaseClient,
          dbResults,
          normalizedProviderRows: normalizedProviderHospitals,
          isEmergencyMode,
          latitude,
          longitude,
          providerCategory,
          radiusKm,
          limit,
        });
        dbResults = persistenceResult.dbResults;
        providerPersistenceCount += persistenceResult.providerPersistenceCount;
        providerPersistenceErrorCount += persistenceResult.providerPersistenceErrorCount;
      }
    }
    const providerResults = normalizedProviderHospitals.map(
      (place: any, index: number) => ({
        id: `provider_${providerSource}_${index}`,
        ...place,
        google_phone: toSafeString(place?.phone),
      })
    );
    // EXP-6B: Filter DB rows by category before merging.
    // isEmergencyMode -> nearby_hospitals (all dispatchable hospitals, no category filter needed).
    // explore mode -> nearby_providers already filtered by provider_type, with secondary guards earlier.
    const { merged: finalResults, prioritizedDbRows: prioritizedDbResults } =
      mergeCanonicalAndProviderRows({
        dbRows: isEmergencyMode ? dbResults : categoryFilteredDbResults,
        providerRows: providerResults,
        originLat: latitude,
        originLng: longitude,
        isPreferredRow: isDispatchableDatabaseRow,
      });

    const limitedResults = finalResults.slice(0, limit);
    console.log("[discover-hospitals] response", {
      total: limitedResults.length,
      providerSource,
      providerCount: providerData.length,
      dbCount: dbResults.length,
      providerDiscoverySkipped,
      providerDiscoverySkipReason,
      countryCode: countryCode || null,
      regionLocalFirstEnabled,
      localProviderFetchCount,
      wideProviderFallbackCount,
    });

    return jsonResponse(
      {
        data: limitedResults,
        meta: {
          provider_count: providerData.length,
          provider_source: providerSource,
          provider_category: providerCategory,
          is_emergency_mode: isEmergencyMode,
          database_count: dbResults.length,
          dispatchable_database_count: prioritizedDbResults.filter((row: any) =>
            isDispatchableDatabaseRow(row)
          ).length,
          local_dispatchable_database_count: prioritizedDbResults.filter((row: any) =>
            isDispatchableDatabaseRow(row) &&
            isWithinDistanceKm(row, MAP_LOCAL_NEARBY_RADIUS_KM)
          ).length,
          merged_count: limitedResults.length,
          provider_discovery_enabled: includeProviderDiscovery,
          provider_discovery_skipped: providerDiscoverySkipped,
          provider_discovery_skip_reason: providerDiscoverySkipReason || null,
          provider_persistence_count: providerPersistenceCount,
          provider_persistence_error_count: providerPersistenceErrorCount,
          database_comfort_target: databaseComfortTarget,
          local_database_comfort_target: localComfortTarget,
          local_nearby_radius_km: MAP_LOCAL_NEARBY_RADIUS_KM,
          country_code: countryCode || null,
          region_local_first_enabled: regionLocalFirstEnabled,
          region_local_first_country_codes: [...REGION_LOCAL_FIRST_COUNTRY_CODES],
          local_provider_fetch_count: localProviderFetchCount,
          wide_provider_fallback_used: wideProviderFallbackUsed,
          wide_provider_fallback_count: wideProviderFallbackCount,
          mapbox_enabled: includeMapboxPlaces,
          google_enabled: includeGooglePlaces,
          google_places_config_enabled: googlePlacesEnabled,
          mode,
          radius_km: radiusKm,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[discover-hospitals] error", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return jsonResponse(
      {
        error: errorMessage,
        details: error instanceof Error ? error.stack || "" : "",
      },
      { status: 500 },
    );
  }
});
