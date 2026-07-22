import { toFiniteNumber } from "../numbers.ts";
import { fetchNearbyProviderRows } from "./database.ts";
import { choosePreferredProviderImage } from "./media.ts";
import { toHospitalUpsertRow, toProviderUpsertRow } from "./persistence.ts";
import { toMergeKey } from "./rows.ts";

const toSafeString = (value: unknown, fallback = ""): string => {
  if (typeof value !== "string") return fallback;
  const clean = value.trim();
  return clean.length > 0 ? clean : fallback;
};

export const persistDiscoveredProviderRows = async ({
  supabaseClient,
  dbResults,
  normalizedProviderRows,
  isEmergencyMode,
  latitude,
  longitude,
  providerCategory,
  radiusKm,
  limit,
  refreshDatabaseResults = true,
  preserveExistingRows = false,
}: {
  supabaseClient: any;
  dbResults: any[];
  normalizedProviderRows: any[];
  isEmergencyMode: boolean;
  latitude: number;
  longitude: number;
  providerCategory: string;
  radiusKm: number;
  limit: number;
  refreshDatabaseResults?: boolean;
  preserveExistingRows?: boolean;
}): Promise<{
  dbResults: any[];
  providerPersistenceCount: number;
  providerPersistenceErrorCount: number;
}> => {
  let nextDbResults = dbResults;
  let providerPersistenceCount = 0;
  let providerPersistenceErrorCount = 0;

  const existingFacilityKeys = new Set(dbResults.map((row: any) => toMergeKey(row)));
  let providerOnlyRows = [];
  const providerSeen = new Set<string>();

  normalizedProviderRows.forEach((row: any) => {
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

  if (preserveExistingRows && existingByPlaceId.size > 0) {
    providerOnlyRows = providerOnlyRows.filter(
      (row: any) => !existingByPlaceId.has(toSafeString(row?.place_id)),
    );
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
          toSafeString(row?.image_source, "deterministic_fallback"),
        ),
        image_confidence:
          toFiniteNumber(preferredImage?.image_confidence) ??
          toFiniteNumber(row?.image_confidence) ??
          0.35,
        image_attribution_text: toSafeString(
          preferredImage?.image_attribution_text,
          toSafeString(row?.image_attribution_text),
        ),
      });
    })
    .filter(
      (row: any) =>
        !!row?.place_id &&
        !!row?.name &&
        !!row?.address &&
        Number.isFinite(row?.latitude) &&
        Number.isFinite(row?.longitude),
    );

  if (upsertRows.length === 0) {
    return {
      dbResults: Array.isArray(nextDbResults) ? nextDbResults : [],
      providerPersistenceCount,
      providerPersistenceErrorCount,
    };
  }

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
    return {
      dbResults: nextDbResults,
      providerPersistenceCount,
      providerPersistenceErrorCount,
    };
  }

  providerPersistenceCount += upsertRows.length;
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

  if (!refreshDatabaseResults) {
    return {
      dbResults: nextDbResults,
      providerPersistenceCount,
      providerPersistenceErrorCount,
    };
  }

  const refreshedDbFetch = await fetchNearbyProviderRows({
    supabaseClient,
    isEmergencyMode,
    latitude,
    longitude,
    providerCategory,
    radiusKm,
    limit,
  });
  if (refreshedDbFetch.error) {
    console.error(
      `[discover-hospitals] ${refreshedDbFetch.rpcName} refresh failed after upsert`,
      refreshedDbFetch.error,
    );
  } else {
    nextDbResults = refreshedDbFetch.rows;
  }

  return {
    dbResults: nextDbResults,
    providerPersistenceCount,
    providerPersistenceErrorCount,
  };
};
