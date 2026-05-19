import { withProviderDefaults } from "./defaults.ts";
import { fetchGoogleProviderDetails } from "./googlePlaces.ts";
import { normalizeGooglePlace, type ProviderMediaProxyBuilder } from "./normalizeExternal.ts";
import { toHospitalUpsertRow, toProviderUpsertRow } from "./persistence.ts";

export const enrichGoogleProviderDetails = async ({
  supabaseClient,
  apiKey,
  placeId,
  providerCategory,
  buildMediaProxyUrl,
}: {
  supabaseClient: any;
  apiKey: string;
  placeId: string;
  providerCategory: string;
  buildMediaProxyUrl: ProviderMediaProxyBuilder;
}): Promise<{
  enrichedRow: any;
  persisted: boolean;
  providerPersistenceError: string | null;
}> => {
  const details = await fetchGoogleProviderDetails({ apiKey, placeId });
  const normalized = withProviderDefaults(
    normalizeGooglePlace(details, 0, 0, 0, buildMediaProxyUrl),
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

  return {
    enrichedRow,
    persisted: Boolean(persistedRow?.id),
    providerPersistenceError,
  };
};
