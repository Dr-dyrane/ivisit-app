import {
  CANONICAL_EMERGENCY_DISCOVERY_SOURCE,
  isExpiredDemoDatabaseRow,
} from "./rows.ts";

export const fetchNearbyProviderRows = async ({
  supabaseClient,
  isEmergencyMode,
  latitude,
  longitude,
  providerCategory,
  radiusKm,
  limit,
}: {
  supabaseClient: any;
  isEmergencyMode: boolean;
  latitude: number;
  longitude: number;
  providerCategory: string;
  radiusKm: number;
  limit: number;
}): Promise<{ rows: any[]; error: any; rpcName: "nearby_hospitals" | "nearby_providers" }> => {
  if (isEmergencyMode) {
    const { data, error } = await supabaseClient.rpc(
      "nearby_hospitals",
      {
        user_lat: latitude,
        user_lng: longitude,
        radius_km: radiusKm,
      },
    );
    const canonicalRows = !error && Array.isArray(data)
      ? data.map((row: any) => ({
          ...row,
          emergency_discovery_source: CANONICAL_EMERGENCY_DISCOVERY_SOURCE,
        }))
      : [];
    const ids = canonicalRows
      .map((row: any) => row?.id)
      .filter((id: unknown) => typeof id === "string" && id.length > 0);
    let enrichedRows = canonicalRows;
    if (ids.length > 0 && typeof supabaseClient?.from === "function") {
      const { data: lifecycleRows, error: lifecycleError } =
        await supabaseClient
          .from("hospitals")
          .select("id,features,place_id,verification_status,status")
          .in("id", ids);
      if (!lifecycleError) {
        const lifecycleById = new Map(
          (Array.isArray(lifecycleRows) ? lifecycleRows : [])
            .map((row: any) => [row.id, row]),
        );
        enrichedRows = canonicalRows.map((row: any) => ({
          ...(lifecycleById.get(row.id) || {}),
          ...row,
        }));
      }
    }
    return {
      rows: enrichedRows.filter((row: any) => !isExpiredDemoDatabaseRow(row)),
      error,
      rpcName: "nearby_hospitals",
    };
  }

  const { data, error } = await supabaseClient.rpc(
    "nearby_providers",
    {
      user_lat: latitude,
      user_lng: longitude,
      provider_type_filter: providerCategory,
      radius_km: radiusKm,
      result_limit: limit,
    },
  );
  return {
    rows: Array.isArray(data) ? data : [],
    error,
    rpcName: "nearby_providers",
  };
};
