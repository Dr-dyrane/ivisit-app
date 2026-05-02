#!/usr/bin/env node

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase service-role environment");
}

const APPLY = process.argv.includes("--apply");

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TABLES = {
  AMBULANCES: "ambulances",
  DOCTORS: "doctors",
  EMERGENCY_REQUESTS: "emergency_requests",
  HOSPITALS: "hospitals",
  ORGANIZATIONS: "organizations",
  ORG_WALLETS: "organization_wallets",
  PAYMENT_METHODS: "payment_methods",
  PAYMENTS: "payments",
  PROFILES: "profiles",
  ROOM_PRICING: "room_pricing",
  SERVICE_PRICING: "service_pricing",
  VISITS: "visits",
};

const SERVICE_PRICING_BASELINES = [
  {
    service_type: "ambulance",
    service_name: "Ambulance Dispatch",
    base_price: 160,
    description: "Baseline for ambulance dispatch",
  },
  {
    service_type: "bed",
    service_name: "Bed Reservation",
    base_price: 120,
    description: "Baseline for bed reservation",
  },
];

const ROOM_PRICING_BASELINES = [
  {
    room_type: "general",
    room_name: "General Ward",
    price_per_night: 140,
    description: "Baseline room pricing",
  },
  {
    room_type: "private",
    room_name: "Private Room",
    price_per_night: 260,
    description: "Private room baseline",
  },
];

const DEMO_EMAIL_RE = /ivisit-demo\.local$/i;

const stripDemoSuffixes = (value = "") =>
  String(value || "")
    .replace(/\s*\(demo\)/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

const normalizeText = (value = "") =>
  String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const scopeForHospital = (hospital) => {
  const features = Array.isArray(hospital.features) ? hospital.features : [];
  const scopeFeature = features.find(
    (feature) =>
      typeof feature === "string" && feature.startsWith("demo_scope:"),
  );
  if (scopeFeature) return scopeFeature.slice("demo_scope:".length);
  const match = String(hospital.place_id || "").match(/^demo:([^:]+):/i);
  return match ? match[1] : "unknown";
};

const slotForHospital = (hospital, fallback = 1) => {
  const match = String(hospital.place_id || "").match(/:slot:(\d+)$/i);
  return match ? Number(match[1]) : fallback;
};

const toAuthEmail = (scope, kind, slot) => {
  if (kind === "admin") return `demo-admin+${scope}@ivisit-demo.local`;
  return `demo-${kind}-${slot}+${scope}@ivisit-demo.local`;
};

const toDisplayName = (kind, slot) => {
  if (kind === "admin") return "iVisit Demo Admin";
  if (kind === "doctor") return `Dr Demo Physician ${slot}`;
  if (kind === "driver") return `Demo Driver ${slot}`;
  return `Demo User ${slot}`;
};

const toGeometryPoint = (latitude, longitude) =>
  `SRID=4326;POINT(${longitude} ${latitude})`;

const listAllAuthUsers = async () => {
  const users = [];
  let page = 1;
  const perPage = 200;
  while (page <= 25) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) throw new Error(`auth listUsers failed: ${error.message}`);
    const batch = data?.users || [];
    users.push(...batch);
    if (batch.length < perPage) break;
    page += 1;
  }
  return users;
};

const findAuthUserByEmail = (users, email) =>
  users.find(
    (user) =>
      String(user?.email || "").toLowerCase() ===
      String(email || "").toLowerCase(),
  ) || null;

const ensureAuthUser = async (authUsers, email, fullName, role) => {
  const existing = findAuthUserByEmail(authUsers, email);
  if (existing) return existing;

  const password = `DemoPass!${String(email).slice(0, 6)}#2026`;
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role, source: "demo_cleanup" },
  });
  if (error)
    throw new Error(`auth createUser failed for ${email}: ${error.message}`);
  authUsers.push(data.user);
  return data.user;
};

const syncProfileRole = async (userId, patch) => {
  const { error } = await supabase
    .from(TABLES.PROFILES)
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (error)
    throw new Error(`profile sync failed (${userId}): ${error.message}`);
};

const upsertServicePricing = async (hospitalId) => {
  for (const baseline of SERVICE_PRICING_BASELINES) {
    const { error } = await supabase.rpc("upsert_service_pricing", {
      payload: {
        hospital_id: hospitalId,
        service_type: baseline.service_type,
        service_name: baseline.service_name,
        base_price: baseline.base_price,
        description: baseline.description,
      },
    });
    if (error)
      throw new Error(`service pricing upsert failed: ${error.message}`);
  }
};

const upsertRoomPricing = async (hospitalId) => {
  for (const baseline of ROOM_PRICING_BASELINES) {
    const { error } = await supabase.rpc("upsert_room_pricing", {
      payload: {
        hospital_id: hospitalId,
        room_type: baseline.room_type,
        room_name: baseline.room_name,
        price_per_night: baseline.price_per_night,
        description: baseline.description,
      },
    });
    if (error) throw new Error(`room pricing upsert failed: ${error.message}`);
  }
};

const ensureOrgAdmin = async ({
  authUsers,
  orgId,
  scope,
  hospitals,
  profiles,
}) => {
  const existingAdmin = profiles.find(
    (profile) =>
      profile.organization_id === orgId && profile.role === "org_admin",
  );
  if (existingAdmin) return existingAdmin.id;

  const email = toAuthEmail(scope, "admin");
  const user = await ensureAuthUser(
    authUsers,
    email,
    toDisplayName("admin"),
    "org_admin",
  );
  await syncProfileRole(user.id, {
    role: "org_admin",
    organization_id: orgId,
    full_name: toDisplayName("admin"),
  });

  const { error } = await supabase
    .from(TABLES.HOSPITALS)
    .update({ org_admin_id: user.id, updated_at: new Date().toISOString() })
    .in(
      "id",
      hospitals
        .filter((hospital) => hospital.organization_id === orgId)
        .map((hospital) => hospital.id),
    );
  if (error) throw new Error(`hospital admin sync failed: ${error.message}`);

  return user.id;
};

const ensureHospitalStaffing = async ({
  authUsers,
  hospital,
  orgId,
  scope,
  slot,
  hasDoctor,
  hasAmbulance,
}) => {
  if (!hasDoctor) {
    const doctorEmail = toAuthEmail(scope, "doctor", slot);
    const doctorUser = await ensureAuthUser(
      authUsers,
      doctorEmail,
      toDisplayName("doctor", slot),
      "provider",
    );
    await syncProfileRole(doctorUser.id, {
      role: "provider",
      provider_type: "doctor",
      organization_id: orgId,
      full_name: toDisplayName("doctor", slot),
    });
    const { error } = await supabase.from(TABLES.DOCTORS).upsert(
      {
        profile_id: doctorUser.id,
        hospital_id: hospital.id,
        name: toDisplayName("doctor", slot),
        specialization: "Emergency Medicine",
        status: "available",
        is_available: true,
        max_patients: 8,
        current_patients: 0,
        email: doctorEmail,
      },
      { onConflict: "profile_id", ignoreDuplicates: false },
    );
    if (error) throw new Error(`doctor upsert failed: ${error.message}`);
  }

  if (!hasAmbulance) {
    const driverEmail = toAuthEmail(scope, "driver", slot);
    const driverUser = await ensureAuthUser(
      authUsers,
      driverEmail,
      toDisplayName("driver", slot),
      "provider",
    );
    await syncProfileRole(driverUser.id, {
      role: "provider",
      provider_type: "driver",
      organization_id: orgId,
      full_name: toDisplayName("driver", slot),
    });
    const { data, error } = await supabase
      .from(TABLES.AMBULANCES)
      .upsert(
        {
          hospital_id: hospital.id,
          organization_id: orgId,
          profile_id: driverUser.id,
          type: "BLS",
          call_sign: `D-AMB-${slot}`,
          status: "available",
          vehicle_number: `COV-${scope.toUpperCase().slice(0, 8)}-${slot}`,
          license_plate: `COV-${scope.toUpperCase().slice(0, 4)}-${slot}`,
          base_price: 0,
          crew: { mode: "demo", label: "Demo Crew" },
          location: toGeometryPoint(
            Number(hospital.latitude),
            Number(hospital.longitude),
          ),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "profile_id", ignoreDuplicates: false },
      )
      .select("id")
      .single();
    if (error) throw new Error(`ambulance upsert failed: ${error.message}`);

    await syncProfileRole(driverUser.id, {
      assigned_ambulance_id: data?.id ?? null,
    });
  }
};

const main = async () => {
  const [
    authUsers,
    orgRes,
    hospitalRes,
    profileRes,
    walletRes,
    payMethodRes,
    paymentsRes,
    doctorRes,
    ambulanceRes,
    servicePricingRes,
    roomPricingRes,
    requestRes,
    visitRes,
  ] = await Promise.all([
    listAllAuthUsers(),
    supabase.from(TABLES.ORGANIZATIONS).select("id,name,created_at"),
    supabase
      .from(TABLES.HOSPITALS)
      .select(
        "id,name,address,place_id,features,organization_id,latitude,longitude,org_admin_id,status",
      ),
    supabase
      .from(TABLES.PROFILES)
      .select(
        "id,email,full_name,role,provider_type,organization_id,assigned_ambulance_id",
      ),
    supabase.from(TABLES.ORG_WALLETS).select("id,organization_id,balance"),
    supabase.from(TABLES.PAYMENT_METHODS).select("id,organization_id"),
    supabase
      .from(TABLES.PAYMENTS)
      .select("id,organization_id,emergency_request_id,status"),
    supabase.from(TABLES.DOCTORS).select("id,profile_id,hospital_id"),
    supabase
      .from(TABLES.AMBULANCES)
      .select("id,profile_id,organization_id,hospital_id"),
    supabase.from(TABLES.SERVICE_PRICING).select("id,hospital_id"),
    supabase.from(TABLES.ROOM_PRICING).select("id,hospital_id"),
    supabase
      .from(TABLES.EMERGENCY_REQUESTS)
      .select("id,hospital_id,hospital_name"),
    supabase.from(TABLES.VISITS).select("id,hospital_id"),
  ]);

  for (const res of [
    orgRes,
    hospitalRes,
    profileRes,
    walletRes,
    payMethodRes,
    paymentsRes,
    doctorRes,
    ambulanceRes,
    servicePricingRes,
    roomPricingRes,
    requestRes,
    visitRes,
  ]) {
    if (res.error) throw new Error(res.error.message);
  }

  const organizations = orgRes.data || [];
  const hospitals = hospitalRes.data || [];
  const profiles = profileRes.data || [];
  const wallets = walletRes.data || [];
  const paymentMethods = payMethodRes.data || [];
  const payments = paymentsRes.data || [];
  const doctors = doctorRes.data || [];
  const ambulances = ambulanceRes.data || [];
  const servicePricing = servicePricingRes.data || [];
  const roomPricing = roomPricingRes.data || [];
  const requests = requestRes.data || [];
  const visits = visitRes.data || [];

  const demoOrgs = organizations.filter((organization) =>
    /ivisit demo network|ivisit coverage network/i.test(
      String(organization.name || ""),
    ),
  );
  const demoOrgIds = new Set(demoOrgs.map((organization) => organization.id));
  const demoHospitals = hospitals.filter((hospital) =>
    String(hospital.place_id || "").startsWith("demo:"),
  );
  const activeDemoHospitals = demoHospitals.filter(
    (hospital) => String(hospital.status || "").toLowerCase() === "available",
  );
  const retiredDemoHospitals = demoHospitals.filter(
    (hospital) => String(hospital.status || "").toLowerCase() !== "available",
  );
  const activeDemoOrgIds = new Set(
    activeDemoHospitals
      .map((hospital) => hospital.organization_id)
      .filter(Boolean),
  );

  const orphanDemoOrgs = demoOrgs.filter(
    (organization) => !activeDemoOrgIds.has(organization.id),
  );
  const hardDeleteOrgs = orphanDemoOrgs.filter(
    (organization) =>
      !payments.some(
        (payment) => payment.organization_id === organization.id,
      ) &&
      !paymentMethods.some(
        (paymentMethod) => paymentMethod.organization_id === organization.id,
      ),
  );

  const orphanOrgIds = new Set(
    orphanDemoOrgs.map((organization) => organization.id),
  );
  const orphanProfiles = profiles.filter(
    (profile) =>
      orphanOrgIds.has(profile.organization_id) &&
      DEMO_EMAIL_RE.test(String(profile.email || "")),
  );
  const orphanProfileIds = orphanProfiles.map((profile) => profile.id);

  const orphanDoctors = doctors.filter((doctor) =>
    orphanProfileIds.includes(doctor.profile_id),
  );
  const orphanAmbulances = ambulances.filter(
    (ambulance) =>
      orphanProfileIds.includes(ambulance.profile_id) ||
      orphanOrgIds.has(ambulance.organization_id),
  );

  const referencedRetiredHospitalIds = new Set([
    ...requests.map((request) => request.hospital_id).filter(Boolean),
    ...visits.map((visit) => visit.hospital_id).filter(Boolean),
  ]);
  const retiredDemoHospitalsPrunable = retiredDemoHospitals.filter(
    (hospital) => !referencedRetiredHospitalIds.has(hospital.id),
  );
  const retiredDemoHospitalIds = new Set(
    retiredDemoHospitalsPrunable.map((hospital) => hospital.id),
  );

  const retiredDemoDoctors = doctors.filter((doctor) =>
    retiredDemoHospitalIds.has(doctor.hospital_id),
  );
  const retiredDemoAmbulances = ambulances.filter((ambulance) =>
    retiredDemoHospitalIds.has(ambulance.hospital_id),
  );

  const activeStaffProfileIds = new Set([
    ...doctors
      .filter((doctor) => !retiredDemoHospitalIds.has(doctor.hospital_id))
      .map((doctor) => doctor.profile_id)
      .filter(Boolean),
    ...ambulances
      .filter((ambulance) => !retiredDemoHospitalIds.has(ambulance.hospital_id))
      .map((ambulance) => ambulance.profile_id)
      .filter(Boolean),
  ]);

  const retiredDemoProfileIds = [
    ...new Set([
      ...retiredDemoDoctors.map((doctor) => doctor.profile_id).filter(Boolean),
      ...retiredDemoAmbulances
        .map((ambulance) => ambulance.profile_id)
        .filter(Boolean),
    ]),
  ];
  const retiredDemoProfiles = profiles.filter(
    (profile) =>
      retiredDemoProfileIds.includes(profile.id) &&
      DEMO_EMAIL_RE.test(String(profile.email || "")) &&
      !activeStaffProfileIds.has(profile.id),
  );

  const dirtyRequests = requests.filter((request) =>
    /\(demo\)/i.test(String(request.hospital_name || "")),
  );
  const activeDemoProfiles = profiles.filter(
    (profile) =>
      activeDemoOrgIds.has(profile.organization_id) &&
      DEMO_EMAIL_RE.test(String(profile.email || "")),
  );

  const activeHospitalStatus = activeDemoHospitals.map((hospital, index) => {
    const scope = scopeForHospital(hospital);
    const slot = slotForHospital(hospital, index + 1);
    return {
      hospital,
      scope,
      slot,
      hasDoctor: doctors.some((doctor) => doctor.hospital_id === hospital.id),
      hasAmbulance: ambulances.some(
        (ambulance) => ambulance.hospital_id === hospital.id,
      ),
      hasServicePricing: servicePricing.some(
        (row) => row.hospital_id === hospital.id,
      ),
      hasRoomPricing: roomPricing.some(
        (row) => row.hospital_id === hospital.id,
      ),
    };
  });

  const repairTargets = activeHospitalStatus.filter(
    (item) =>
      !item.hasDoctor ||
      !item.hasAmbulance ||
      !item.hasServicePricing ||
      !item.hasRoomPricing,
  );

  const activeAdminOrgIds = new Set(
    activeDemoProfiles
      .filter((profile) => profile.role === "org_admin")
      .map((profile) => profile.organization_id),
  );
  const missingAdminOrgs = [...activeDemoOrgIds].filter(
    (orgId) => !activeAdminOrgIds.has(orgId),
  );

  const summary = {
    orphan_demo_orgs: orphanDemoOrgs.length,
    hard_delete_orgs: hardDeleteOrgs.length,
    orphan_demo_profiles: orphanProfiles.length,
    orphan_demo_auth_users: orphanProfiles.length,
    orphan_demo_doctors: orphanDoctors.length,
    orphan_demo_ambulances: orphanAmbulances.length,
    retired_demo_hospitals_prunable: retiredDemoHospitalsPrunable.length,
    retired_demo_profiles_prunable: retiredDemoProfiles.length,
    retired_demo_doctors_prunable: retiredDemoDoctors.length,
    retired_demo_ambulances_prunable: retiredDemoAmbulances.length,
    dirty_request_names: dirtyRequests.length,
    dirty_visit_names: 0,
    hospitals_needing_repair: repairTargets.length,
    active_orgs_missing_admin: missingAdminOrgs.length,
  };

  console.log(JSON.stringify({ apply: APPLY, summary }, null, 2));

  if (!APPLY) return;

  const ambulanceIdsToDelete = [
    ...new Set([
      ...orphanAmbulances.map((ambulance) => ambulance.id),
      ...retiredDemoAmbulances.map((ambulance) => ambulance.id),
    ]),
  ];
  const doctorIdsToDelete = [
    ...new Set([
      ...orphanDoctors.map((doctor) => doctor.id),
      ...retiredDemoDoctors.map((doctor) => doctor.id),
    ]),
  ];
  const profileIdsToDelete = [
    ...new Set([
      ...orphanProfileIds,
      ...retiredDemoProfiles.map((profile) => profile.id),
    ]),
  ];
  const retiredHospitalIdsToDelete = retiredDemoHospitalsPrunable.map(
    (hospital) => hospital.id,
  );

  if (ambulanceIdsToDelete.length > 0) {
    await supabase
      .from(TABLES.PROFILES)
      .update({
        assigned_ambulance_id: null,
        updated_at: new Date().toISOString(),
      })
      .in("assigned_ambulance_id", ambulanceIdsToDelete);
    const { error } = await supabase
      .from(TABLES.AMBULANCES)
      .delete()
      .in("id", ambulanceIdsToDelete);
    if (error)
      throw new Error(`orphan ambulance delete failed: ${error.message}`);
  }

  if (doctorIdsToDelete.length > 0) {
    const { error } = await supabase
      .from(TABLES.DOCTORS)
      .delete()
      .in("id", doctorIdsToDelete);
    if (error) throw new Error(`orphan doctor delete failed: ${error.message}`);
  }

  if (profileIdsToDelete.length > 0) {
    const { error: hospitalAdminUnlinkError } = await supabase
      .from(TABLES.HOSPITALS)
      .update({
        org_admin_id: null,
        updated_at: new Date().toISOString(),
      })
      .in("org_admin_id", profileIdsToDelete);
    if (hospitalAdminUnlinkError) {
      throw new Error(
        `hospital admin unlink failed: ${hospitalAdminUnlinkError.message}`,
      );
    }

    const { error } = await supabase
      .from(TABLES.PROFILES)
      .delete()
      .in("id", profileIdsToDelete);
    if (error)
      throw new Error(`orphan profile delete failed: ${error.message}`);
    for (const profileId of profileIdsToDelete) {
      try {
        await supabase.auth.admin.deleteUser(profileId);
      } catch (error) {
        throw new Error(
          `auth user delete failed (${profileId}): ${error.message || error}`,
        );
      }
    }
  }

  if (retiredHospitalIdsToDelete.length > 0) {
    const { error: servicePricingDeleteError } = await supabase
      .from(TABLES.SERVICE_PRICING)
      .delete()
      .in("hospital_id", retiredHospitalIdsToDelete);
    if (servicePricingDeleteError) {
      throw new Error(
        `retired demo service pricing delete failed: ${servicePricingDeleteError.message}`,
      );
    }

    const { error: roomPricingDeleteError } = await supabase
      .from(TABLES.ROOM_PRICING)
      .delete()
      .in("hospital_id", retiredHospitalIdsToDelete);
    if (roomPricingDeleteError) {
      throw new Error(
        `retired demo room pricing delete failed: ${roomPricingDeleteError.message}`,
      );
    }

    const { error } = await supabase
      .from(TABLES.HOSPITALS)
      .delete()
      .in("id", retiredHospitalIdsToDelete);
    if (error)
      throw new Error(`retired demo hospital delete failed: ${error.message}`);
  }

  if (hardDeleteOrgs.length > 0) {
    const hardDeleteOrgIds = hardDeleteOrgs.map(
      (organization) => organization.id,
    );
    const { error: walletError } = await supabase
      .from(TABLES.ORG_WALLETS)
      .delete()
      .in("organization_id", hardDeleteOrgIds);
    if (walletError)
      throw new Error(
        `organization wallet delete failed: ${walletError.message}`,
      );

    const { error: orgError } = await supabase
      .from(TABLES.ORGANIZATIONS)
      .delete()
      .in("id", hardDeleteOrgIds);
    if (orgError)
      throw new Error(`organization delete failed: ${orgError.message}`);
  }

  for (const request of dirtyRequests) {
    const cleanedName = stripDemoSuffixes(request.hospital_name);
    if (normalizeText(cleanedName) === normalizeText(request.hospital_name))
      continue;
    const { error } = await supabase
      .from(TABLES.EMERGENCY_REQUESTS)
      .update({
        hospital_name: cleanedName,
        updated_at: new Date().toISOString(),
      })
      .eq("id", request.id);
    if (error) throw new Error(`request name cleanup failed: ${error.message}`);
  }

  for (const orgId of missingAdminOrgs) {
    const orgHospitals = demoHospitals.filter(
      (hospital) => hospital.organization_id === orgId,
    );
    const scope =
      orgHospitals.length > 0 ? scopeForHospital(orgHospitals[0]) : "unknown";
    await ensureOrgAdmin({
      authUsers,
      orgId,
      scope,
      hospitals: demoHospitals,
      profiles: profiles.filter((profile) => profile.organization_id === orgId),
    });
  }

  for (const target of repairTargets) {
    await ensureHospitalStaffing({
      authUsers,
      hospital: target.hospital,
      orgId: target.hospital.organization_id,
      scope: target.scope,
      slot: target.slot,
      hasDoctor: target.hasDoctor,
      hasAmbulance: target.hasAmbulance,
    });

    if (!target.hasServicePricing) {
      await upsertServicePricing(target.hospital.id);
    }

    if (!target.hasRoomPricing) {
      await upsertRoomPricing(target.hospital.id);
    }
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
