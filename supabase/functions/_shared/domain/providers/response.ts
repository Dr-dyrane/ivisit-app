import { MAP_LOCAL_NEARBY_RADIUS_KM } from "./locality.ts";
import type { ProviderSource } from "./discoveryFlow.ts";
import {
  isDispatchableDatabaseRow,
  isWithinDistanceKm,
  mergeCanonicalAndProviderRows,
} from "./rows.ts";

const toSafeString = (value: unknown, fallback = ""): string => {
  if (typeof value !== "string") return fallback;
  const clean = value.trim();
  return clean.length > 0 ? clean : fallback;
};

export const toProviderResultRows = (
  normalizedProviderRows: any[],
  providerSource: ProviderSource,
): any[] =>
  normalizedProviderRows.map((place: any, index: number) => ({
    id: `provider_${providerSource}_${index}`,
    ...place,
    google_phone: toSafeString(place?.phone),
  }));

export const mergeProviderDiscoveryRows = ({
  dbResults,
  categoryFilteredDbResults,
  normalizedProviderRows,
  providerSource,
  isEmergencyMode,
  latitude,
  longitude,
  limit,
}: {
  dbResults: any[];
  categoryFilteredDbResults: any[];
  normalizedProviderRows: any[];
  providerSource: ProviderSource;
  isEmergencyMode: boolean;
  latitude: number;
  longitude: number;
  limit: number;
}): {
  limitedResults: any[];
  prioritizedDbResults: any[];
  providerResults: any[];
} => {
  // PULLBACK NOTE: EMERGENCY_COMMIT_ELIGIBILITY_GATE
  // OLD: the emergency response merged raw Google/Mapbox rows with database rows.
  // NEW: emergency discovery returns only canonical rows expressly cleared for commitment.
  const providerResults = isEmergencyMode
    ? []
    : toProviderResultRows(normalizedProviderRows, providerSource);
  const canonicalEmergencyRows = isEmergencyMode
    ? dbResults.filter((row: any) => isDispatchableDatabaseRow(row))
    : categoryFilteredDbResults;
  const { merged: finalResults, prioritizedDbRows } =
    mergeCanonicalAndProviderRows({
      dbRows: canonicalEmergencyRows,
      providerRows: providerResults,
      originLat: latitude,
      originLng: longitude,
      isPreferredRow: isDispatchableDatabaseRow,
    });

  return {
    limitedResults: finalResults.slice(0, limit),
    prioritizedDbResults: prioritizedDbRows,
    providerResults,
  };
};

export const summarizeProviderDiscoveryDatabaseCounts = (
  prioritizedDbRows: any[],
): {
  dispatchableDatabaseCount: number;
  localDispatchableDatabaseCount: number;
} => ({
  dispatchableDatabaseCount: prioritizedDbRows.filter((row: any) =>
    isDispatchableDatabaseRow(row)
  ).length,
  localDispatchableDatabaseCount: prioritizedDbRows.filter((row: any) =>
    isDispatchableDatabaseRow(row) &&
    isWithinDistanceKm(row, MAP_LOCAL_NEARBY_RADIUS_KM)
  ).length,
});
