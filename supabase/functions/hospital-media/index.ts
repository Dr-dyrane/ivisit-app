import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
};

const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1632833239869-a37e3a5806d2?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1551190822-a9333d879b1f?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=1200&q=80",
];

const toText = (value: unknown, fallback = "") =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;

const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value);

const hashSeed = (seed: string) => {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

const pickFallback = (seed: string) =>
  FALLBACK_IMAGES[hashSeed(seed || "hospital") % FALLBACK_IMAGES.length];

const fetchGoogleProviderPhotoUrl = async (placeId: string, apiKey: string) => {
  const safePlaceId = toText(placeId);
  if (!safePlaceId || !apiKey || safePlaceId.startsWith("demo:")) return "";

  const detailsResponse = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(safePlaceId)}`,
    {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "id,photos",
      },
    }
  );

  if (!detailsResponse.ok) return "";

  const details = await detailsResponse.json();
  const providerPhotoName = toText(details?.photos?.[0]?.name);
  if (!providerPhotoName) return "";

  const mediaEndpoint = `https://places.googleapis.com/v1/${providerPhotoName}/media?maxHeightPx=1200&skipHttpRedirect=true`;
  const mediaResponse = await fetch(mediaEndpoint, {
    headers: {
      "X-Goog-Api-Key": apiKey,
    },
  });

  if (!mediaResponse.ok) return "";
  const mediaData = await mediaResponse.json();
  return toText(mediaData?.photoUri);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase environment is not configured");
    }

    const url = new URL(req.url);
    const hospitalId = toText(url.searchParams.get("hospital_id"));
    const placeId = toText(url.searchParams.get("place_id"));
    if (!hospitalId && !placeId) {
      return new Response(JSON.stringify({ error: "hospital_id or place_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let hospital: any = null;
    if (hospitalId) {
      const { data, error } = await supabase
        .from("hospitals")
        .select("id,name,place_id,image")
        .eq("id", hospitalId)
        .maybeSingle();
      if (error) throw error;
      hospital = data;
    } else {
      const { data, error } = await supabase
        .from("hospitals")
        .select("id,name,place_id,image")
        .eq("place_id", placeId)
        .maybeSingle();
      if (error) throw error;
      hospital = data;
    }

    const googleApiKey = Deno.env.get("GOOGLE_MAPS_API_KEY") ?? "";
    if (!hospital?.id) {
      const providerPhotoUrl =
        placeId && googleApiKey ? await fetchGoogleProviderPhotoUrl(placeId, googleApiKey) : "";
      const fallbackUrl =
        providerPhotoUrl && isAbsoluteUrl(providerPhotoUrl)
          ? providerPhotoUrl
          : pickFallback(toText(placeId, "hospital"));
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          Location: fallbackUrl,
          "Cache-Control": providerPhotoUrl ? "no-store" : "public, max-age=3600, stale-while-revalidate=86400",
        },
      });
    }

    const { data: mediaRows, error: mediaError } = await supabase
      .from("hospital_media")
      .select("remote_url,source_type,status,is_primary,confidence,provider_photo_ref,metadata")
      .eq("hospital_id", hospital.id)
      .eq("status", "active")
      .order("is_primary", { ascending: false })
      .order("confidence", { ascending: false })
      .limit(1);

    if (mediaError) throw mediaError;

    const primaryMedia = Array.isArray(mediaRows) && mediaRows.length > 0 ? mediaRows[0] : null;
    const remoteUrl = toText(primaryMedia?.remote_url);
    const providerPhotoName =
      toText(primaryMedia?.metadata?.google_photo_name) ||
      toText(primaryMedia?.provider_photo_ref);
    let providerPhotoUrl = "";
    if (
      primaryMedia?.source_type === "provider_photo" &&
      providerPhotoName &&
      googleApiKey
    ) {
      const mediaEndpoint = `https://places.googleapis.com/v1/${providerPhotoName}/media?maxHeightPx=1200&skipHttpRedirect=true`;
      const mediaResponse = await fetch(mediaEndpoint, {
        headers: {
          "X-Goog-Api-Key": googleApiKey,
        },
      });
      if (mediaResponse.ok) {
        const mediaData = await mediaResponse.json();
        providerPhotoUrl = toText(mediaData?.photoUri);
      }
    }
    if (!providerPhotoUrl && hospital?.place_id && googleApiKey) {
      providerPhotoUrl = await fetchGoogleProviderPhotoUrl(hospital.place_id, googleApiKey);
    }
    const hospitalImage = toText(hospital?.image);
    const imageUrl =
      providerPhotoUrl && isAbsoluteUrl(providerPhotoUrl)
        ? providerPhotoUrl
        : remoteUrl && isAbsoluteUrl(remoteUrl)
        ? remoteUrl
        : hospitalImage &&
            isAbsoluteUrl(hospitalImage) &&
            !hospitalImage.includes("/functions/v1/hospital-media")
          ? hospitalImage
          : pickFallback(toText(hospital?.place_id, toText(hospital?.id, hospital?.name || "hospital")));

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        Location: imageUrl,
        "Cache-Control":
          primaryMedia?.source_type === "provider_photo"
            ? "no-store"
            : "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
