import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getBooleanEnv, getEnv } from "../../_shared/env/env.ts";
import { clampLimit, toFiniteNumber } from "../../_shared/domain/numbers.ts";
import { withProviderDefaults } from "../../_shared/domain/providers/defaults.ts";
import { shouldKeepProviderForRequestedCategory } from "../../_shared/domain/providers/guards.ts";
import {
  fetchGoogleProviderDetails,
  fetchGoogleProviderPlaces,
} from "../../_shared/domain/providers/googlePlaces.ts";
import { choosePreferredProviderImage } from "../../_shared/domain/providers/media.ts";
import {
  LOCALITY_SCOPE_LOCAL,
  LOCALITY_SCOPE_WIDE_FALLBACK,
  MAP_LOCAL_NEARBY_RADIUS_KM,
  MAP_LOCAL_NEARBY_COMFORT_THRESHOLD,
  REGION_LOCAL_FIRST_COUNTRY_CODES,
  normalizeCountryCode,
  shouldUseRegionLocalFirst,
} from "../../_shared/domain/providers/locality.ts";
import { fetchMapboxProviderPlaces } from "../../_shared/domain/providers/mapboxPlaces.ts";
import { normalizeGooglePlace, normalizeMapboxPlace } from "../../_shared/domain/providers/normalizeExternal.ts";
import {
  toHospitalUpsertRow,
  toProviderUpsertRow,
} from "../../_shared/domain/providers/persistence.ts";
import {
  isDispatchableDatabaseRow,
  isWithinDistanceKm,
  mergeCanonicalAndProviderRows,
  toMergeKey,
  withDistanceFromOrigin,
} from "../../_shared/domain/providers/rows.ts";
import { jsonResponse, optionsResponse } from "../../_shared/http/cors.ts";
import { createServiceClient } from "../../_shared/supabase/clients.ts";
import { CATEGORY_TO_GOOGLE_TYPES } from "../../_shared/domain/providers/taxonomy.ts";

const toSafeString = (value: unknown, fallback = ""): string => {
  if (typeof value !== "string") return fallback;
  const clean = value.trim();
  return clean.length > 0 ? clean : fallback;
};

const MAP_NEARBY_COMFORT_THRESHOLD = 5;

const buildHospitalMediaProxyUrl = (placeId: string): string => {
  const supabaseUrl = toSafeString(
    getEnv("SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_URL"),
    "",
  ).replace(/\/$/, "");
  if (!supabaseUrl || !placeId) return "";
  return `${supabaseUrl}/functions/v1/hospital-media?place_id=${encodeURIComponent(placeId)}`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return optionsResponse();
  }

  try {
    console.log("[discover-hospitals] request start", req.method);

    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      try {
        const authClient = createClient(
          getEnv("SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_URL"),
          getEnv("SUPABASE_ANON_KEY", "EXPO_PUBLIC_SUPABASE_ANON_KEY"),
          { global: { headers: { Authorization: authHeader } } }
        );
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
      const placeId = toSafeString(body?.placeId ?? body?.place_id);
      if (!placeId) {
        throw new Error("placeId is required");
      }

      const providerCategory: string =
        typeof body?.providerCategory === "string" && CATEGORY_TO_GOOGLE_TYPES[body.providerCategory]
          ? body.providerCategory
          : "hospital";
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

      const supabaseClient = createServiceClient();
      const details = await fetchGoogleProviderDetails({ apiKey: googleApiKey, placeId });
      const normalized = withProviderDefaults(
        normalizeGooglePlace(details, 0, 0, 0, buildHospitalMediaProxyUrl),
        "google",
        providerCategory,
      );
      const upsertRow = toHospitalUpsertRow(normalized);
      let persistedRow: any = null;
      let providerPersistenceError: string | null = null;

      if (
        upsertRow?.place_id &&
        upsertRow?.name &&
        upsertRow?.address &&
        Number.isFinite(upsertRow?.latitude) &&
        Number.isFinite(upsertRow?.longitude)
      ) {
        const { data: hospitalRow, error: upsertError } = await supabaseClient
          .from("hospitals")
          .upsert(upsertRow, {
            onConflict: "place_id",
            ignoreDuplicates: false,
          })
          .select("*")
          .maybeSingle();

        if (upsertError) {
          providerPersistenceError = upsertError.message || "provider_upsert_failed";
          console.error("[discover-hospitals] provider detail upsert failed", upsertError);
        } else {
          persistedRow = hospitalRow;
        }
      }

      if (persistedRow?.id) {
        const providerUpsertRow = toProviderUpsertRow(persistedRow.id, {
          ...normalized,
          provider_type: providerCategory,
        });
        if (providerUpsertRow) {
          const { error: providerError } = await supabaseClient
            .from("providers")
            .upsert(providerUpsertRow, {
              onConflict: "hospital_id,provider_type",
              ignoreDuplicates: false,
            });
          if (providerError) {
            providerPersistenceError = providerError.message || providerPersistenceError;
            console.error("[discover-hospitals] provider detail provider-row upsert failed", providerError);
          }
        }
      }

      const enrichedRow = {
        ...(persistedRow || {}),
        ...normalized,
        id: persistedRow?.id ?? normalized.place_id,
        google_phone: normalized.phone,
        google_website: normalized.website,
        google_rating: normalized.rating,
        google_rating_count: (normalized as any).reviews_count,
      };

      return jsonResponse(
        {
          data: enrichedRow,
          meta: {
            action,
            provider_category: providerCategory,
            provider_source: "google",
            google_enabled: true,
            persisted: Boolean(persistedRow?.id),
            provider_persistence_error: providerPersistenceError,
          },
        },
      );
    }

    const latitude = toFiniteNumber(body?.latitude);
    const longitude = toFiniteNumber(body?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new Error("latitude and longitude are required");
    }

    const radius = toFiniteNumber(body?.radius) ?? 15000;
    const mode = body?.mode === "text_search" ? "text_search" : "nearby";
    const query = typeof body?.query === "string" ? body.query.trim() : "";
    const limit = clampLimit(body?.limit);
    const includeProviderDiscovery = body?.includeProviderDiscovery !== false;
    const includeMapboxPlaces = body?.includeMapboxPlaces !== false;
    const googlePlacesEnabled = getBooleanEnv(false, "ENABLE_GOOGLE_PLACES", "EXPO_PUBLIC_ENABLE_GOOGLE_PLACES");
    const includeGooglePlaces = body?.includeGooglePlaces === true && googlePlacesEnabled;
    const mergeWithDatabase = body?.mergeWithDatabase !== false;
    const countryCode = normalizeCountryCode(
      body?.countryCode ?? body?.country_code ?? body?.regionCountryCode
    );
    // EXP-2: Provider category for explore mode. Defaults to "hospital" (emergency flow).
    // Callers in explore mode pass e.g. "pharmacy", "lab", "clinic".
    const providerCategory: string = typeof body?.providerCategory === "string" && CATEGORY_TO_GOOGLE_TYPES[body.providerCategory]
      ? body.providerCategory
      : "hospital";
    const isEmergencyMode = providerCategory === "hospital";
    const regionLocalFirstEnabled = shouldUseRegionLocalFirst(countryCode, providerCategory);

    const mapboxToken = getEnv("MAPBOX_ACCESS_TOKEN", "EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN");
    const googleApiKey = getEnv(
      "GOOGLE_MAPS_API_KEY",
      "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY",
      "GOOGLE_MAPS_ANDROID_API_KEY",
    );

    const supabaseClient = createServiceClient();

    let providerData: any[] = [];
    let providerSource = "database";
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
    if (isEmergencyMode) {
      const { data: nearbyHospitals, error: rpcError } = await supabaseClient.rpc(
        "nearby_hospitals",
        {
          user_lat: latitude,
          user_lng: longitude,
          radius_km: radiusKm,
        }
      );
      if (rpcError) {
        console.error("[discover-hospitals] nearby_hospitals rpc failed", rpcError);
        throw rpcError;
      }
      dbResults = Array.isArray(nearbyHospitals) ? nearbyHospitals : [];
    } else {
      const { data: nearbyProviders, error: rpcError } = await supabaseClient.rpc(
        "nearby_providers",
        {
          user_lat: latitude,
          user_lng: longitude,
          provider_type_filter: providerCategory,
          radius_km: radiusKm,
          result_limit: limit,
        }
      );
      if (rpcError) {
        console.error("[discover-hospitals] nearby_providers rpc failed", rpcError);
        // Non-fatal: continue with empty dbResults, let Mapbox/Google fill the gap
      } else {
        dbResults = Array.isArray(nearbyProviders) ? nearbyProviders : [];
      }
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
        // Google Places is the primary Explore Care provider source when the
        // server flag is enabled. Mapbox remains a fallback for outage/quota
        // resilience and for local development without Google billing.
        const fetchGooglePlacesForRadius = async (searchRadius: number) => {
          if (!googleApiKey || !includeGooglePlaces) return [];
          console.log("[discover-hospitals] google fetch", {
            providerCategory,
            radius: searchRadius,
            regionLocalFirstEnabled,
            countryCode: countryCode || null,
          });
          return fetchGoogleProviderPlaces({
            apiKey: googleApiKey,
            latitude,
            longitude,
            radius: searchRadius,
            mode,
            query,
            limit,
            providerCategory,
            countryCode,
          });
        };

        const decorateScope = (places: any[], scope: string) =>
          places.map((place: any) => ({ ...place, provider_locality_scope: scope }));

        if (regionLocalFirstEnabled && mode === "nearby") {
          const localRadius = Math.min(radius, MAP_LOCAL_NEARBY_RADIUS_KM * 1000);
          const localGooglePlaces = await fetchGooglePlacesForRadius(localRadius);
          if (localGooglePlaces.length > 0) {
            providerData = decorateScope(localGooglePlaces, LOCALITY_SCOPE_LOCAL);
            providerSource = "google";
          }
          localProviderFetchCount = providerData.length;

          if (providerData.length < localComfortTarget) {
            const wideGooglePlaces = await fetchGooglePlacesForRadius(radius);
            if (wideGooglePlaces.length > 0) {
              providerData = [
                ...providerData,
                ...decorateScope(wideGooglePlaces, LOCALITY_SCOPE_WIDE_FALLBACK),
              ];
              providerSource = "google";
              wideProviderFallbackUsed = true;
              wideProviderFallbackCount = wideGooglePlaces.length;
            }
          }
        } else {
          const googlePlaces = await fetchGooglePlacesForRadius(radius);
          if (googlePlaces.length > 0) {
            providerData = decorateScope(googlePlaces, LOCALITY_SCOPE_LOCAL);
            providerSource = "google";
          }
        }

        // Fallback to Mapbox if Google returns no results or is disabled
        if (providerData.length === 0 && mapboxToken && includeMapboxPlaces) {
          providerData = await fetchMapboxProviderPlaces({
            accessToken: mapboxToken,
            latitude,
            longitude,
            mode,
            query,
            limit,
            providerCategory,
          });
          providerSource = "mapbox";
          providerData = decorateScope(
            providerData,
            regionLocalFirstEnabled ? LOCALITY_SCOPE_WIDE_FALLBACK : LOCALITY_SCOPE_LOCAL
          );
          if (regionLocalFirstEnabled && providerData.length > 0) {
            wideProviderFallbackUsed = true;
            wideProviderFallbackCount = providerData.length;
          }
        }
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
        const existingFacilityKeys = new Set(dbResults.map((row: any) => toMergeKey(row)));
        const providerOnlyRows = [];
        const providerSeen = new Set<string>();

        normalizedProviderHospitals.forEach((row: any) => {
          const key = toMergeKey(row);
          if (existingFacilityKeys.has(key)) return;
          if (providerSeen.has(key)) return;
          providerSeen.add(key);
          providerOnlyRows.push(row);
        });

        const providerPlaceIds = providerOnlyRows
          .map((row: any) => toSafeString(row?.place_id))
          .filter((value: string) => value.length > 0);
        const existingByPlaceId = new Map<string, any>();

        if (providerPlaceIds.length > 0) {
          const { data: existingRows, error: existingError } = await supabaseClient
            .from("hospitals")
            .select("place_id,image,image_source,image_confidence,image_attribution_text")
            .in("place_id", providerPlaceIds);

          if (existingError) {
            console.error("[discover-hospitals] existing image lookup failed", existingError);
          } else {
            (Array.isArray(existingRows) ? existingRows : []).forEach((row: any) => {
              const key = toSafeString(row?.place_id);
              if (!key) return;
              existingByPlaceId.set(key, row);
            });
          }
        }

        const upsertRows = providerOnlyRows
          .map((row: any) => {
            const existing = existingByPlaceId.get(toSafeString(row?.place_id));
            const preferredImage = choosePreferredProviderImage(existing, row);
            return toHospitalUpsertRow({
              ...row,
              image: toSafeString(preferredImage?.image, toSafeString(row?.image)),
              image_source: toSafeString(
                preferredImage?.image_source,
                toSafeString(row?.image_source, "deterministic_fallback")
              ),
              image_confidence:
                toFiniteNumber(preferredImage?.image_confidence) ??
                toFiniteNumber(row?.image_confidence) ??
                0.35,
              image_attribution_text: toSafeString(
                preferredImage?.image_attribution_text,
                toSafeString(row?.image_attribution_text)
              ),
            });
          })
          .filter(
            (row: any) =>
              !!row?.place_id &&
              !!row?.name &&
              !!row?.address &&
              Number.isFinite(row?.latitude) &&
              Number.isFinite(row?.longitude)
          );

        if (upsertRows.length > 0) {
          const { error: upsertError } = await supabaseClient
            .from("hospitals")
            .upsert(upsertRows, {
              onConflict: "place_id",
              ignoreDuplicates: false,
            });

          if (upsertError) {
            console.error("[discover-hospitals] provider upsert failed", upsertError);
            const persistedPlaceIds: string[] = [];
            for (const row of upsertRows) {
              const { error: rowUpsertError } = await supabaseClient
                .from("hospitals")
                .upsert(row, {
                  onConflict: "place_id",
                  ignoreDuplicates: false,
                });

              if (!rowUpsertError) {
                persistedPlaceIds.push(toSafeString(row?.place_id));
                continue;
              }

              if (rowUpsertError?.code === "23505") {
                const { data: coordinateMatches, error: coordinateLookupError } = await supabaseClient
                  .from("hospitals")
                  .select("id, provider_type")
                  .eq("latitude", row.latitude)
                  .eq("longitude", row.longitude)
                  .limit(1);
                const coordinateMatch = Array.isArray(coordinateMatches) ? coordinateMatches[0] : null;

                if (!coordinateLookupError && coordinateMatch?.id && coordinateMatch?.provider_type === row.provider_type) {
                  const { error: coordinateUpdateError } = await supabaseClient
                    .from("hospitals")
                    .update(row)
                    .eq("id", coordinateMatch.id);

                  if (!coordinateUpdateError) {
                    persistedPlaceIds.push(toSafeString(row?.place_id));
                    continue;
                  }
                }
              }

              providerPersistenceErrorCount += 1;
              console.error("[discover-hospitals] provider row upsert failed", {
                code: rowUpsertError?.code,
                message: rowUpsertError?.message,
                providerType: row?.provider_type,
              });
            }
            providerPersistenceCount += persistedPlaceIds.filter(Boolean).length;
            providerPlaceIds.splice(0, providerPlaceIds.length, ...persistedPlaceIds.filter(Boolean));
          } else {
            providerPersistenceCount += upsertRows.length;
            // PULLBACK NOTE: EXPLORE-CARE-PERMANENT-FIX — Phase 2: Upsert to providers table
            // OLD: Only upsert to hospitals table (provider-specific data missing)
            // NEW: Also upsert to providers table for provider-specific data enrichment
            const { data: upsertedHospitals, error: hospitalsQueryError } = await supabaseClient
              .from("hospitals")
              .select("id, place_id, provider_type")
              .in("place_id", providerPlaceIds);

            if (hospitalsQueryError) {
              console.error("[discover-hospitals] hospitals query after upsert failed", hospitalsQueryError);
            } else {
              const hospitalsById = new Map<string, any>();
              (Array.isArray(upsertedHospitals) ? upsertedHospitals : []).forEach((row: any) => {
                const key = toSafeString(row?.place_id);
                if (!key) return;
                hospitalsById.set(key, row);
              });

              const providerUpsertRows: any[] = [];
              providerOnlyRows.forEach((row: any) => {
                const placeId = toSafeString(row?.place_id);
                const hospital = hospitalsById.get(placeId);
                if (!hospital) return;

                const providerRow = toProviderUpsertRow(hospital.id, row);
                if (providerRow) {
                  providerUpsertRows.push(providerRow);
                }
              });

              if (providerUpsertRows.length > 0) {
                const { error: providerUpsertError } = await supabaseClient
                  .from("providers")
                  .upsert(providerUpsertRows, {
                    onConflict: "hospital_id,provider_type",
                    ignoreDuplicates: false,
                  });

                if (providerUpsertError) {
                  console.error("[discover-hospitals] providers table upsert failed", providerUpsertError);
                } else {
                  console.log("[discover-hospitals] providers table upsert succeeded", {
                    count: providerUpsertRows.length,
                  });
                }
              }
            }

            // Re-read canonical DB rows so clients receive persisted ids/display_ids.
            // PULLBACK NOTE: EXPLORE-CARE-PERMANENT-FIX — refresh must use same RPC as initial fetch
            // OLD: always refreshed via nearby_hospitals → non-hospital rows lost after upsert
            // NEW: isEmergencyMode → nearby_hospitals; explore → nearby_providers with category filter
            if (isEmergencyMode) {
              const { data: refreshedHospitals, error: refreshError } = await supabaseClient.rpc(
                "nearby_hospitals",
                {
                  user_lat: latitude,
                  user_lng: longitude,
                  radius_km: radiusKm,
                }
              );
              if (refreshError) {
                console.error("[discover-hospitals] nearby_hospitals refresh failed after upsert", refreshError);
              } else {
                dbResults = Array.isArray(refreshedHospitals) ? refreshedHospitals : dbResults;
              }
            } else {
              const { data: refreshedProviders, error: refreshError } = await supabaseClient.rpc(
                "nearby_providers",
                {
                  user_lat: latitude,
                  user_lng: longitude,
                  provider_type_filter: providerCategory,
                  radius_km: radiusKm,
                  result_limit: limit,
                }
              );
              if (refreshError) {
                console.error("[discover-hospitals] nearby_providers refresh failed after upsert", refreshError);
              } else {
                dbResults = Array.isArray(refreshedProviders) ? refreshedProviders : dbResults;
              }
            }
          }
        } else {
          // Re-read canonical DB rows so clients receive persisted ids/display_ids.
          dbResults = Array.isArray(dbResults) ? dbResults : [];
        }
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
