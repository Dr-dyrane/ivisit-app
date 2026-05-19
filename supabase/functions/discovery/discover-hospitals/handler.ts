import {
  buildConfiguredProviderMediaProxyUrl,
  getProviderGooglePlacesConfig,
  getProviderMapboxToken,
} from "../../_shared/domain/providers/config.ts";
import { fetchNearbyProviderRows } from "../../_shared/domain/providers/database.ts";
import {
  fetchExternalProviderData,
  type ProviderSource,
} from "../../_shared/domain/providers/discoveryFlow.ts";
import { enrichGoogleProviderDetails } from "../../_shared/domain/providers/enrichmentFlow.ts";
import {
  MAP_LOCAL_NEARBY_RADIUS_KM,
  MAP_LOCAL_NEARBY_COMFORT_THRESHOLD,
  REGION_LOCAL_FIRST_COUNTRY_CODES,
} from "../../_shared/domain/providers/locality.ts";
import { normalizeExternalProviderRows } from "../../_shared/domain/providers/normalizationFlow.ts";
import { persistDiscoveredProviderRows } from "../../_shared/domain/providers/persistenceFlow.ts";
import {
  parseProviderDiscoveryRequest,
  parseProviderEnrichmentRequest,
} from "../../_shared/domain/providers/request.ts";
import {
  mergeProviderDiscoveryRows,
  summarizeProviderDiscoveryDatabaseCounts,
} from "../../_shared/domain/providers/response.ts";
import {
  evaluateProviderDatabaseSufficiency,
} from "../../_shared/domain/providers/rows.ts";
import { jsonResponse, optionsResponse } from "../../_shared/http/cors.ts";
import { isOptionsRequest } from "../../_shared/http/request.ts";
import { probeOptionalAuthHeader } from "../../_shared/supabase/auth.ts";
import { createServiceClient } from "../../_shared/supabase/clients.ts";

const MAP_NEARBY_COMFORT_THRESHOLD = 5;

export const handleDiscoverHospitalsRequest = async (req: Request): Promise<Response> => {
  if (isOptionsRequest(req)) {
    return optionsResponse();
  }

  try {
    console.log("[discover-hospitals] request start", req.method);

    await probeOptionalAuthHeader(req, "discover-hospitals");

    const body = await req.json();
    const action = typeof body?.action === "string" ? body.action.trim() : "discover";
    if (action === "enrich_provider") {
      const { placeId, providerCategory } = parseProviderEnrichmentRequest(body);
      if (!placeId) {
        throw new Error("placeId is required");
      }

      const {
        enabled: googlePlacesEnabled,
        apiKey: googleApiKey,
      } = getProviderGooglePlacesConfig();

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
        buildMediaProxyUrl: buildConfiguredProviderMediaProxyUrl,
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

    const {
      enabled: googlePlacesEnabled,
      apiKey: googleApiKey,
    } = getProviderGooglePlacesConfig();
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

    const mapboxToken = getProviderMapboxToken();

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
    const {
      dispatchableDbResults,
      localDispatchableDbResults,
      categoryFilteredDbResults,
      databaseComfortTarget,
      localComfortTarget,
      hasEnoughDbResults,
    } = evaluateProviderDatabaseSufficiency({
      dbRows: dbResults,
      isEmergencyMode,
      providerCategory,
      mode,
      limit,
      mergeWithDatabase,
      nearbyComfortThreshold: MAP_NEARBY_COMFORT_THRESHOLD,
      localNearbyComfortThreshold: MAP_LOCAL_NEARBY_COMFORT_THRESHOLD,
    });
    // PULLBACK NOTE: EXPLORE-CARE-PERMANENT-FIX — hasEnoughDbResults for explore mode
    // OLD: always used dispatchableDbResults (isDispatchable=false for all non-hospitals)
    //      → explore mode ALWAYS triggered external discovery even when DB had results
    // NEW: explore mode uses category-guarded DB count; emergency mode keeps dispatchable count
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

      normalizedProviderHospitals = normalizeExternalProviderRows({
        providerData,
        providerSource,
        latitude,
        longitude,
        radiusMeters: radius,
        providerCategory,
        buildMediaProxyUrl: buildConfiguredProviderMediaProxyUrl,
      });

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
    // EXP-6B: Filter DB rows by category before merging.
    // isEmergencyMode -> nearby_hospitals (all dispatchable hospitals, no category filter needed).
    // explore mode -> nearby_providers already filtered by provider_type, with secondary guards earlier.
    const { limitedResults, prioritizedDbResults } = mergeProviderDiscoveryRows({
      dbResults,
      categoryFilteredDbResults,
      normalizedProviderRows: normalizedProviderHospitals,
      providerSource,
      isEmergencyMode,
      latitude,
      longitude,
      limit,
    });
    const {
      dispatchableDatabaseCount,
      localDispatchableDatabaseCount,
    } = summarizeProviderDiscoveryDatabaseCounts(prioritizedDbResults);
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
          dispatchable_database_count: dispatchableDatabaseCount,
          local_dispatchable_database_count: localDispatchableDatabaseCount,
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
};