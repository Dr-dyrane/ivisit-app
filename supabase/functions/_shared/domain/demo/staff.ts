import {
  resolveDemoSeedScopeKey,
  type DemoContext,
} from "./context.ts";
import {
  nowIso,
  toFiniteNumber,
  toGeometryPoint,
} from "./utils.ts";

const toAuthEmail = (
  ctx: DemoContext,
  kind: string,
  slotIndex?: number,
): string => {
  const slotSuffix = Number.isFinite(slotIndex)
    ? `-${Number(slotIndex) + 1}`
    : "";
  return `demo-${kind}${slotSuffix}+${resolveDemoSeedScopeKey(ctx)}@ivisit-demo.local`;
};

const toDisplayName = (kind: string, slotIndex?: number): string => {
  const index = Number.isFinite(slotIndex) ? ` ${Number(slotIndex) + 1}` : "";
  if (kind === "admin") return "iVisit Demo Admin";
  if (kind === "doctor") return `Dr Demo Physician${index}`;
  if (kind === "driver") return `Demo Driver${index}`;
  return `Demo User${index}`;
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
    const found = users.find(
      (user: any) => String(user?.email || "").toLowerCase() === target,
    );
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
  role: string,
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
  patch: Record<string, unknown>,
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

export const ensureDemoStaff = async (
  admin: any,
  ctx: DemoContext,
  organizationId: string,
  hospitals: any[],
) => {
  const adminAccount = await ensureAuthUser(
    admin,
    toAuthEmail(ctx, "admin"),
    toDisplayName("admin"),
    "org_admin",
  );

  await syncProfileRole(admin, adminAccount.user.id, {
    role: "org_admin",
    organization_id: organizationId,
    full_name: toDisplayName("admin"),
    onboarding_status: "complete",
  });

  const staffSummary: any[] = [];

  for (let i = 0; i < hospitals.length; i += 1) {
    const hospital = hospitals[i];
    const doctorAccount = await ensureAuthUser(
      admin,
      toAuthEmail(ctx, "doctor", i),
      toDisplayName("doctor", i),
      "provider",
    );
    const driverAccount = await ensureAuthUser(
      admin,
      toAuthEmail(ctx, "driver", i),
      toDisplayName("driver", i),
      "provider",
    );

    await syncProfileRole(admin, doctorAccount.user.id, {
      role: "provider",
      provider_type: "doctor",
      organization_id: organizationId,
      full_name: toDisplayName("doctor", i),
      onboarding_status: "complete",
    });

    await syncProfileRole(admin, driverAccount.user.id, {
      role: "provider",
      provider_type: "driver",
      organization_id: organizationId,
      full_name: toDisplayName("driver", i),
      onboarding_status: "complete",
    });

    const { error: doctorError } = await admin.from("doctors").upsert(
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
      { onConflict: "profile_id", ignoreDuplicates: false },
    );

    if (doctorError) {
      throw new Error(`doctor upsert failed: ${doctorError.message}`);
    }

    const callSign = `D-AMB-${i + 1}`;
    const scopeKey = resolveDemoSeedScopeKey(ctx);
    const ambulanceLatitude = toFiniteNumber(hospital?.latitude) ?? ctx.latitude;
    const ambulanceLongitude = toFiniteNumber(hospital?.longitude) ?? ctx.longitude;
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
          vehicle_number: `COV-${scopeKey.toUpperCase().slice(0, 8)}-${i + 1}`,
          license_plate: `COV-${scopeKey.toUpperCase().slice(0, 4)}-${i + 1}`,
          base_price: 0,
          crew: {
            mode: "demo",
            label: "Demo Crew",
          },
          location: toGeometryPoint(ambulanceLatitude, ambulanceLongitude),
          updated_at: nowIso(),
        },
        { onConflict: "profile_id", ignoreDuplicates: false },
      )
      .select("id,telemetry_sequence")
      .single();

    if (ambulanceError) {
      throw new Error(`ambulance upsert failed: ${ambulanceError.message}`);
    }

    const { data: staffingResult, error: staffingError } = await admin.rpc(
      "staff_ambulance_responder",
      {
        p_ambulance_id: ambulance.id,
        p_responder_id: driverAccount.user.id,
      },
    );

    if (staffingError || staffingResult?.success !== true) {
      throw new Error(
        `ambulance staffing failed: ${staffingError?.message || staffingResult?.error || "unknown error"}`,
      );
    }

    const { data: telemetryResult, error: telemetryError } = await admin.rpc(
      "report_responder_telemetry",
      {
        p_payload: {
          ambulance_id: ambulance.id,
          sequence: Number(ambulance.telemetry_sequence || 0) + 1,
          observed_at: nowIso(),
          location: {
            lat: ambulanceLatitude,
            lng: ambulanceLongitude,
          },
          accuracy_meters: 10,
        },
      },
    );

    if (telemetryError || telemetryResult?.success !== true) {
      throw new Error(
        `ambulance telemetry bootstrap failed: ${telemetryError?.message || telemetryResult?.error || "unknown error"}`,
      );
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
