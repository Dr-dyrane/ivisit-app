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
    return {
      rows: Array.isArray(data) ? data : [],
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
