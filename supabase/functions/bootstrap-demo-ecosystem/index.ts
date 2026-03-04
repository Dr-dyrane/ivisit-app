import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DEMO_HOSPITAL_OFFSETS = [
  { lat: 0.0064, lng: 0.0048 },
  { lat: -0.0051, lng: 0.0062 },
  { lat: 0.0042, lng: -0.0068 },
];

const DEMO_FEATURE_FLAGS = [
  "demo_seed",
  "demo_verified",
  "ivisit_demo",
];

const SERVICE_PRICING_BASELINES = [
  {
    service_type: "ambulance",
    service_name: "Demo Ambulance Dispatch",
    base_price: 160,
    description: "Demo baseline for ambulance dispatch",
  },
  {
    service_type: "bed",
    service_name: "Demo Bed Reservation",
    base_price: 120,
    description: "Demo baseline for bed reservation",
  },
];

const ROOM_PRICING_BASELINES = [
  {
    room_type: "general",
    room_name: "General Ward (Demo)",
    price_per_night: 140,
    description: "Demo baseline room pricing",
  },
  {
    room_type: "private",
    room_name: "Private Room (Demo)",
    price_per_night: 260,
    description: "Demo private room baseline",
  },
];

const DEMO_MIN_HOSPITALS = 2;
const DEMO_MAX_HOSPITALS = 3;

type DemoContext = {
  userId: string;
  userSlug: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
};

const toFiniteNumber = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const toSafeString = (value: unknown, fallback = ""): string => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const toSafeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

const toNonNegativeInt = (value: unknown, fallback = 0): number => {
  const n = toFiniteNumber(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.round(n));
};

const uniqueStrings = (values: string[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  values.forEach((value) => {
    const normalized = value.trim();
    if (!normalized) return;
    if (seen.has(normalized)) return;
    seen.add(normalized);
    out.push(normalized);
  });
  return out;
};

const parseHospitalCoordinates = (row: any): { latitude: number | null; longitude: number | null } => {
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

const toDemoPlaceId = (ctx: DemoContext, slotIndex: number): string =>
  `demo:${ctx.userSlug}:slot:${slotIndex + 1}`;

const toAuthEmail = (ctx: DemoContext, kind: string, slotIndex?: number): string => {
  const slotSuffix = Number.isFinite(slotIndex) ? `-${Number(slotIndex) + 1}` : "";
  return `demo-${kind}${slotSuffix}+${ctx.userSlug}@ivisit-demo.local`;
};

const toDisplayName = (kind: string, slotIndex?: number): string => {
  const index = Number.isFinite(slotIndex) ? ` ${Number(slotIndex) + 1}` : "";
  if (kind === "admin") return "iVisit Demo Admin";
  if (kind === "doctor") return `Dr Demo Physician${index}`;
  if (kind === "driver") return `Demo Driver${index}`;
  return `Demo User${index}`;
};

const toGeometryPoint = (latitude: number, longitude: number): string =>
  `SRID=4326;POINT(${longitude} ${latitude})`;

const nowIso = () => new Date().toISOString();

const getNearbySeedHospitals = async (admin: any, ctx: DemoContext) => {
  const { data, error } = await admin.rpc("nearby_hospitals", {
    user_lat: ctx.latitude,
    user_lng: ctx.longitude,
    radius_km: ctx.radiusKm,
  });

  if (error) {
    throw new Error(`nearby_hospitals rpc failed: ${error.message}`);
  }

  const rows = Array.isArray(data) ? data : [];
  const demoPrefix = `demo:${ctx.userSlug}:`;

  return rows
    .filter((row) => !String(row?.place_id || "").startsWith(demoPrefix))
    .map((row) => {
      const coords = parseHospitalCoordinates(row);
      return {
        name: toSafeString(row?.name, "Nearby Hospital"),
        address: toSafeString(row?.address, "Address unavailable"),
        phone: toSafeString(row?.phone),
        rating: toFiniteNumber(row?.rating) ?? 4.2,
        type: toSafeString(row?.type, "standard"),
        image: toSafeString(row?.image),
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
  const offset = DEMO_HOSPITAL_OFFSETS[slotIndex % DEMO_HOSPITAL_OFFSETS.length];
  const latitude = ctx.latitude + offset.lat;
  const longitude = ctx.longitude + offset.lng;

  return {
    name: `iVisit Demo Hospital ${slotIndex + 1}`,
    address: `Demo Coverage Zone ${slotIndex + 1}`,
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

const ensureDemoOrganization = async (admin: any, ctx: DemoContext) => {
  const contactEmail = `demo+${ctx.userSlug}@ivisit-demo.local`;

  const { data: existing, error: existingError } = await admin
    .from("organizations")
    .select("id,name,contact_email")
    .eq("contact_email", contactEmail)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw new Error(`organization lookup failed: ${existingError.message}`);
  }

  if (existing?.id) {
    return { organization: existing, created: false };
  }

  const payload = {
    name: `iVisit Demo Network ${ctx.userSlug.toUpperCase()}`,
    contact_email: contactEmail,
    fee_tier: "standard",
    ivisit_fee_percentage: 0,
    is_active: true,
    updated_at: nowIso(),
  };

  const { data: created, error: createError } = await admin
    .from("organizations")
    .insert(payload)
    .select("id,name,contact_email")
    .single();

  if (createError) {
    throw new Error(`organization create failed: ${createError.message}`);
  }

  return { organization: created, created: true };
};

const listDemoHospitals = async (admin: any, ctx: DemoContext, organizationId: string) => {
  const { data, error } = await admin
    .from("hospitals")
    .select("id,name,place_id,organization_id,latitude,longitude,features,verified,verification_status,status")
    .eq("organization_id", organizationId)
    .like("place_id", `demo:${ctx.userSlug}:%`)
    .order("place_id", { ascending: true });

  if (error) {
    throw new Error(`demo hospital lookup failed: ${error.message}`);
  }

  return Array.isArray(data) ? data : [];
};

const ensureDemoHospitals = async (
  admin: any,
  ctx: DemoContext,
  organizationId: string,
  orgAdminId: string | null
) => {
  const seeds = await getNearbySeedHospitals(admin, ctx);
  const targetCount = Math.max(
    DEMO_MIN_HOSPITALS,
    Math.min(DEMO_MAX_HOSPITALS, seeds.length > 0 ? seeds.length : DEMO_MIN_HOSPITALS)
  );

  const rows = new Array(targetCount).fill(null).map((_, slotIndex) => {
    const seed = seeds[slotIndex] ?? buildFallbackHospital(ctx, slotIndex);
    const fallback = buildFallbackHospital(ctx, slotIndex);
    const latitude = Number.isFinite(seed.latitude) ? Number(seed.latitude) : fallback.latitude;
    const longitude = Number.isFinite(seed.longitude) ? Number(seed.longitude) : fallback.longitude;
    const features = uniqueStrings([
      ...DEMO_FEATURE_FLAGS,
      `demo_owner:${ctx.userSlug}`,
      ...toSafeStringArray(seed.features),
    ]);

    const specialties = uniqueStrings(
      toSafeStringArray(seed.specialties).length > 0
        ? toSafeStringArray(seed.specialties)
        : ["Emergency Medicine", "Internal Medicine"]
    );

    const serviceTypes = uniqueStrings(
      toSafeStringArray(seed.service_types).length > 0
        ? toSafeStringArray(seed.service_types)
        : ["standard", "premium"]
    );

    return {
      place_id: toDemoPlaceId(ctx, slotIndex),
      name: `${toSafeString(seed.name, fallback.name)} (Demo)`,
      address: toSafeString(seed.address, fallback.address),
      phone: toSafeString(seed.phone, ""),
      rating: toFiniteNumber(seed.rating) ?? 4.2,
      type: toSafeString(seed.type, "standard"),
      image: toSafeString(seed.image, ""),
      specialties,
      service_types: serviceTypes,
      features,
      emergency_level: toSafeString(seed.emergency_level, "Level 2"),
      available_beds: Math.max(6, toNonNegativeInt((seed as any).available_beds, 12)),
      ambulances_count: 1,
      wait_time: toSafeString(seed.wait_time, "12 min"),
      price_range: toSafeString(seed.price_range, "Flexible"),
      latitude,
      longitude,
      coordinates: toGeometryPoint(latitude, longitude),
      verified: true,
      verification_status: "demo_verified",
      status: "available",
      organization_id: organizationId,
      org_admin_id: orgAdminId,
      updated_at: nowIso(),
    };
  });

  const { error: upsertError } = await admin
    .from("hospitals")
    .upsert(rows, { onConflict: "place_id", ignoreDuplicates: false });

  if (upsertError) {
    throw new Error(`demo hospital upsert failed: ${upsertError.message}`);
  }

  return listDemoHospitals(admin, ctx, organizationId);
};

const findAuthUserByEmail = async (admin: any, email: string) => {
  const target = email.toLowerCase();
  let page = 1;
  const perPage = 200;

  while (page <= 25) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(`auth listUsers failed: ${error.message}`);
    }

    const users = data?.users || [];
    const found = users.find((user: any) => String(user?.email || "").toLowerCase() === target);
    if (found) return found;
    if (users.length < perPage) break;
    page += 1;
  }

  return null;
};

const ensureAuthUser = async (
  admin: any,
  email: string,
  fullName: string,
  role: string
) => {
  const password = `DemoPass!${email.slice(0, 6)}#2026`;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role,
      source: "demo_bootstrap",
    },
  });

  if (!error && data?.user) {
    return { user: data.user, created: true };
  }

  const message = String(error?.message || "");
  const isDuplicate =
    message.toLowerCase().includes("already") ||
    message.toLowerCase().includes("exists");

  if (!isDuplicate) {
    throw new Error(`auth createUser failed: ${message || "unknown error"}`);
  }

  const existing = await findAuthUserByEmail(admin, email);
  if (!existing) {
    throw new Error(`duplicate user reported but lookup failed for ${email}`);
  }

  return { user: existing, created: false };
};

const syncProfileRole = async (
  admin: any,
  userId: string,
  patch: Record<string, unknown>
) => {
  const { error } = await admin
    .from("profiles")
    .update({
      ...patch,
      updated_at: nowIso(),
    })
    .eq("id", userId);

  if (error) {
    throw new Error(`profile sync failed (${userId}): ${error.message}`);
  }
};

const ensureDemoStaff = async (
  admin: any,
  ctx: DemoContext,
  organizationId: string,
  hospitals: any[]
) => {
  const adminAccount = await ensureAuthUser(
    admin,
    toAuthEmail(ctx, "admin"),
    toDisplayName("admin"),
    "org_admin"
  );

  await syncProfileRole(admin, adminAccount.user.id, {
    role: "org_admin",
    organization_id: organizationId,
    full_name: toDisplayName("admin"),
  });

  const staffSummary: any[] = [];

  for (let i = 0; i < hospitals.length; i += 1) {
    const hospital = hospitals[i];
    const doctorAccount = await ensureAuthUser(
      admin,
      toAuthEmail(ctx, "doctor", i),
      toDisplayName("doctor", i),
      "provider"
    );
    const driverAccount = await ensureAuthUser(
      admin,
      toAuthEmail(ctx, "driver", i),
      toDisplayName("driver", i),
      "provider"
    );

    await syncProfileRole(admin, doctorAccount.user.id, {
      role: "provider",
      provider_type: "doctor",
      organization_id: organizationId,
      full_name: toDisplayName("doctor", i),
    });

    await syncProfileRole(admin, driverAccount.user.id, {
      role: "provider",
      provider_type: "driver",
      organization_id: organizationId,
      full_name: toDisplayName("driver", i),
    });

    const { error: doctorError } = await admin
      .from("doctors")
      .upsert(
        {
          profile_id: doctorAccount.user.id,
          hospital_id: hospital.id,
          name: toDisplayName("doctor", i),
          specialization: "Emergency Medicine",
          status: "available",
          is_available: true,
          max_patients: 8,
          current_patients: 0,
          email: toAuthEmail(ctx, "doctor", i),
        },
        { onConflict: "profile_id", ignoreDuplicates: false }
      );

    if (doctorError) {
      throw new Error(`doctor upsert failed: ${doctorError.message}`);
    }

    const callSign = `D-AMB-${i + 1}`;
    const { data: ambulance, error: ambulanceError } = await admin
      .from("ambulances")
      .upsert(
        {
          hospital_id: hospital.id,
          organization_id: organizationId,
          profile_id: driverAccount.user.id,
          type: "BLS",
          call_sign: callSign,
          status: "available",
          vehicle_number: `DEMO-${ctx.userSlug.toUpperCase()}-${i + 1}`,
          license_plate: `DMO-${ctx.userSlug.slice(0, 4).toUpperCase()}-${i + 1}`,
          base_price: 0,
          crew: {
            mode: "demo",
            label: "Demo Crew",
          },
          location: toGeometryPoint(
            toFiniteNumber(hospital?.latitude) ?? ctx.latitude,
            toFiniteNumber(hospital?.longitude) ?? ctx.longitude
          ),
          updated_at: nowIso(),
        },
        { onConflict: "profile_id", ignoreDuplicates: false }
      )
      .select("id")
      .single();

    if (ambulanceError) {
      throw new Error(`ambulance upsert failed: ${ambulanceError.message}`);
    }

    await syncProfileRole(admin, driverAccount.user.id, {
      assigned_ambulance_id: ambulance?.id ?? null,
    });

    const { error: hospitalPatchError } = await admin
      .from("hospitals")
      .update({
        org_admin_id: adminAccount.user.id,
        ambulances_count: 1,
        updated_at: nowIso(),
      })
      .eq("id", hospital.id);

    if (hospitalPatchError) {
      throw new Error(`hospital patch failed: ${hospitalPatchError.message}`);
    }

    staffSummary.push({
      hospital_id: hospital.id,
      doctor_profile_id: doctorAccount.user.id,
      driver_profile_id: driverAccount.user.id,
      ambulance_id: ambulance?.id ?? null,
      created_flags: {
        doctor_user_created: doctorAccount.created,
        driver_user_created: driverAccount.created,
      },
    });
  }

  return {
    org_admin_profile_id: adminAccount.user.id,
    org_admin_created: adminAccount.created,
    hospitals_staffed: staffSummary.length,
    staff: staffSummary,
  };
};

const ensureDemoPricing = async (admin: any, hospitals: any[]) => {
  for (const hospital of hospitals) {
    for (const baseline of SERVICE_PRICING_BASELINES) {
      const { error } = await admin.rpc("upsert_service_pricing", {
        payload: {
          hospital_id: hospital.id,
          service_type: baseline.service_type,
          service_name: baseline.service_name,
          base_price: baseline.base_price,
          description: baseline.description,
        },
      });
      if (error) {
        throw new Error(`service pricing upsert failed: ${error.message}`);
      }
    }

    for (const baseline of ROOM_PRICING_BASELINES) {
      const { error } = await admin.rpc("upsert_room_pricing", {
        payload: {
          hospital_id: hospital.id,
          room_type: baseline.room_type,
          room_name: baseline.room_name,
          price_per_night: baseline.price_per_night,
          description: baseline.description,
        },
      });
      if (error) {
        throw new Error(`room pricing upsert failed: ${error.message}`);
      }
    }
  }

  return {
    hospitals_priced: hospitals.length,
    service_pricing_rows_expected: hospitals.length * SERVICE_PRICING_BASELINES.length,
    room_pricing_rows_expected: hospitals.length * ROOM_PRICING_BASELINES.length,
  };
};

const getDemoSummary = async (admin: any, ctx: DemoContext, organizationId: string) => {
  const hospitals = await listDemoHospitals(admin, ctx, organizationId);
  const hospitalIds = hospitals.map((h) => h.id).filter(Boolean);

  let doctorsCount = 0;
  let ambulancesCount = 0;

  if (hospitalIds.length > 0) {
    const { count: doctors, error: doctorsError } = await admin
      .from("doctors")
      .select("id", { count: "exact", head: true })
      .in("hospital_id", hospitalIds);
    if (doctorsError) {
      throw new Error(`summary doctors count failed: ${doctorsError.message}`);
    }
    doctorsCount = Number(doctors || 0);

    const { count: ambulances, error: ambulancesError } = await admin
      .from("ambulances")
      .select("id", { count: "exact", head: true })
      .in("hospital_id", hospitalIds);
    if (ambulancesError) {
      throw new Error(`summary ambulances count failed: ${ambulancesError.message}`);
    }
    ambulancesCount = Number(ambulances || 0);
  }

  return {
    organization_id: organizationId,
    hospitals_count: hospitals.length,
    doctors_count: doctorsCount,
    ambulances_count: ambulancesCount,
    coverage_ready: hospitals.length >= DEMO_MIN_HOSPITALS,
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error("Supabase environment is not configured");
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user?.id) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body = await req.json();
    const phase = toSafeString(body?.phase, "full");
    const latitude = toFiniteNumber(body?.latitude);
    const longitude = toFiniteNumber(body?.longitude);
    const radiusKm = Math.max(1, Math.min(100, Math.round((toFiniteNumber(body?.radiusKm) ?? 50))));

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new Error("latitude and longitude are required");
    }

    const ctx: DemoContext = {
      userId: user.id,
      userSlug: user.id.replace(/-/g, "").slice(0, 12),
      latitude: Number(latitude),
      longitude: Number(longitude),
      radiusKm,
    };

    const timeline: any[] = [];
    const runStep = async (step: string, action: () => Promise<any>) => {
      const startedAt = Date.now();
      const data = await action();
      timeline.push({
        step,
        duration_ms: Date.now() - startedAt,
        data,
      });
      return data;
    };

    const organizationResult = await runStep("ensure_org", () =>
      ensureDemoOrganization(adminClient, ctx)
    );

    const organizationId = organizationResult.organization.id;
    let hospitals: any[] = [];

    if (phase === "prepare") {
      const nearbySeeds = await runStep("preview_nearby_sources", () =>
        getNearbySeedHospitals(adminClient, ctx)
      );

      return new Response(
        JSON.stringify({
          ok: true,
          phase,
          organization_id: organizationId,
          preview: {
            nearby_candidates: nearbySeeds.slice(0, 5).map((seed: any) => ({
              name: seed.name,
              address: seed.address,
              distance_km: seed.distance_km,
            })),
            candidate_count: nearbySeeds.length,
          },
          timeline,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (phase === "hospitals" || phase === "staff" || phase === "pricing" || phase === "full") {
      hospitals = await runStep("ensure_demo_hospitals", () =>
        ensureDemoHospitals(adminClient, ctx, organizationId, null)
      );
    }

    if (phase === "staff" || phase === "pricing" || phase === "full") {
      const staffing = await runStep("ensure_demo_staff", () =>
        ensureDemoStaff(adminClient, ctx, organizationId, hospitals)
      );

      hospitals = await runStep("refresh_demo_hospitals_after_staff", () =>
        ensureDemoHospitals(
          adminClient,
          ctx,
          organizationId,
          staffing.org_admin_profile_id ?? null
        )
      );
    }

    if (phase === "pricing" || phase === "full") {
      await runStep("ensure_demo_pricing", () =>
        ensureDemoPricing(adminClient, hospitals)
      );
    }

    const summary = await runStep("summary", () =>
      getDemoSummary(adminClient, ctx, organizationId)
    );

    return new Response(
      JSON.stringify({
        ok: true,
        phase,
        organization_id: organizationId,
        hospitals: hospitals.map((hospital: any) => ({
          id: hospital.id,
          name: hospital.name,
          place_id: hospital.place_id,
        })),
        summary,
        timeline,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({
        ok: false,
        error: message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
