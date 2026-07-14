import { buildDemoContext } from "../_shared/domain/demo/context.ts";
import { ensureDemoFinancialReadiness } from "../_shared/domain/demo/finance.ts";
import {
  ensureDemoHospitals,
  getNearbySeedHospitals,
} from "../_shared/domain/demo/hospitals.ts";
import { ensureDemoOrganization } from "../_shared/domain/demo/organization.ts";
import { ensureDemoPricing } from "../_shared/domain/demo/pricing.ts";
import { ensureDemoStaff } from "../_shared/domain/demo/staff.ts";
import { getDemoSummary } from "../_shared/domain/demo/summary.ts";
import {
  toFiniteNumber,
  toSafeString,
} from "../_shared/domain/demo/utils.ts";
import { jsonResponse, optionsResponse } from "../_shared/http/cors.ts";
import {
  runTimedStep,
  type TimedStepEntry,
} from "../_shared/observability/timing.ts";
import {
  createServiceClient,
  createUserClient,
} from "../_shared/supabase/clients.ts";

const DEMO_SCHEDULE_HORIZON_DAYS = 14;
const DEMO_SCHEDULE_START_TIME = "09:00:00";
const DEMO_SCHEDULE_END_TIME = "17:00:00";
const DEMO_SCHEDULE_EMAIL_PREFIX = "demo-scheduled-";
const DEMO_AUTH_PAGE_SIZE = 200;
const DEMO_AUTH_MAX_PAGES = 50;
const DEMO_RETIRED_AUTH_BAN_DURATION = "876000h";

type DemoScheduledCareHospital = {
  id: string;
  name: string;
  place_id: string;
  organization_id: string;
  status: string;
  booking_eligible: boolean;
  timezone: string | null;
  specialties: string[] | null;
};

type DemoScheduledCareDoctor = {
  id: string;
  hospital_id: string | null;
  profile_id: string | null;
  email: string | null;
  status: string | null;
  is_available: boolean | null;
};

type DemoServiceClient = ReturnType<typeof createServiceClient>;

type DemoAuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

type DemoScheduledCareProfile = {
  id: string;
  email: string | null;
  organization_id: string | null;
  role: string | null;
  provider_type: string | null;
};

type DemoHospitalResponse = {
  id: string;
  name: string;
  place_id: string;
};

const toLowerEmail = (value: unknown) =>
  toSafeString(value, "").trim().toLowerCase();

const toDateKeyInTimezone = (value: Date, timezone: string) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const byType = new Map(parts.map((part) => [part.type, part.value]));
  return `${byType.get("year")}-${byType.get("month")}-${byType.get("day")}`;
};

const addDaysToDateKey = (dateKey: string, days: number) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10);
};

const resolveFacilityTimezone = (value: unknown) => {
  const candidate = toSafeString(value, "UTC");
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: candidate }).format(
      new Date(0),
    );
    return candidate;
  } catch {
    return "UTC";
  }
};

const buildScheduleDateKeys = (now: Date, timezone: string) => {
  const localToday = toDateKeyInTimezone(now, timezone);
  return Array.from({ length: DEMO_SCHEDULE_HORIZON_DAYS }, (_, index) =>
    addDaysToDateKey(localToday, index + 1)
  );
};

const toScheduledCareEmail = (hospitalId: string, userSlug: string) => {
  const stableHospitalKey = hospitalId.replace(/[^a-zA-Z0-9]/g, "");
  return `${DEMO_SCHEDULE_EMAIL_PREFIX}${stableHospitalKey}+${userSlug}@ivisit-demo.local`;
};

const getAuthMetadata = (user: DemoAuthUser) =>
  user.user_metadata &&
    typeof user.user_metadata === "object" &&
    !Array.isArray(user.user_metadata)
    ? user.user_metadata
    : {};

const hasScheduledCareAuthOwnership = (
  user: DemoAuthUser,
  email: string,
  hospitalId: string,
  userSlug: string,
) => {
  const metadata = getAuthMetadata(user);
  return (
    toLowerEmail(user.email) === toLowerEmail(email) &&
    metadata.source === "demo_bootstrap" &&
    metadata.demo_purpose === "scheduled_care" &&
    metadata.demo_scope === userSlug &&
    metadata.demo_hospital_id === hospitalId
  );
};

const reactivateScheduledCareAuthUser = async (
  admin: DemoServiceClient,
  user: DemoAuthUser,
  email: string,
  fullName: string,
  hospitalId: string,
  userSlug: string,
) => {
  if (!hasScheduledCareAuthOwnership(user, email, hospitalId, userSlug)) {
    throw new Error(
      `scheduled-care auth ownership mismatch for ${toLowerEmail(email)}`,
    );
  }

  const { data, error } = await admin.auth.admin.updateUserById(user.id, {
    ban_duration: "none",
    email_confirm: true,
    user_metadata: {
      ...getAuthMetadata(user),
      full_name: fullName,
      role: "provider",
      source: "demo_bootstrap",
      demo_purpose: "scheduled_care",
      demo_scope: userSlug,
      demo_hospital_id: hospitalId,
      demo_retired: false,
      demo_retired_at: null,
    },
  });
  if (error || !data?.user) {
    throw new Error(
      `scheduled-care auth reactivation failed: ${error?.message || "missing user"}`,
    );
  }

  return data.user as DemoAuthUser;
};

const selectAppointmentSpecialty = (specialties: string[] | null) => {
  const values = Array.isArray(specialties)
    ? specialties.map((value) => toSafeString(value, "")).filter(Boolean)
    : [];
  const preferred = ["Family Medicine", "Internal Medicine"];
  return preferred.find((value) => values.includes(value)) ||
    values.find((value) => value !== "Emergency Medicine") ||
    values[0] ||
    "General Practice";
};

const listAuthUsersByEmail = async (
  admin: DemoServiceClient,
  targetEmails: Set<string>,
) => {
  const usersByEmail = new Map<string, DemoAuthUser>();
  if (targetEmails.size === 0) return usersByEmail;

  for (let page = 1; page <= DEMO_AUTH_MAX_PAGES; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: DEMO_AUTH_PAGE_SIZE,
    });
    if (error) {
      throw new Error(`scheduled-care auth lookup failed: ${error.message}`);
    }

    const users = Array.isArray(data?.users) ? data.users : [];
    users.forEach((user: DemoAuthUser) => {
      const email = toLowerEmail(user?.email);
      if (targetEmails.has(email)) usersByEmail.set(email, user);
    });

    if (
      usersByEmail.size === targetEmails.size ||
      users.length < DEMO_AUTH_PAGE_SIZE
    ) {
      break;
    }
  }

  return usersByEmail;
};

const ensureScheduledCareAuthUser = async (
  admin: DemoServiceClient,
  usersByEmail: Map<string, DemoAuthUser>,
  email: string,
  fullName: string,
  hospitalId: string,
  userSlug: string,
) => {
  const normalizedEmail = toLowerEmail(email);
  const existing = usersByEmail.get(normalizedEmail);
  if (existing) {
    const user = await reactivateScheduledCareAuthUser(
      admin,
      existing,
      email,
      fullName,
      hospitalId,
      userSlug,
    );
    usersByEmail.set(normalizedEmail, user);
    return { user, created: false };
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: `DemoPass!${hospitalId.slice(0, 8)}#2026`,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role: "provider",
      source: "demo_bootstrap",
      demo_purpose: "scheduled_care",
      demo_scope: userSlug,
      demo_hospital_id: hospitalId,
      demo_retired: false,
    },
  });

  if (!error && data?.user) {
    usersByEmail.set(normalizedEmail, data.user);
    return { user: data.user, created: true };
  }

  const message = toSafeString(error?.message, "");
  const duplicate = /already|exists/i.test(message);
  if (!duplicate) {
    throw new Error(
      `scheduled-care auth create failed: ${message || "unknown error"}`,
    );
  }

  const recoveredUsers = await listAuthUsersByEmail(
    admin,
    new Set([normalizedEmail]),
  );
  const recovered = recoveredUsers.get(normalizedEmail);
  if (!recovered) {
    throw new Error(
      `scheduled-care auth duplicate lookup failed for ${normalizedEmail}`,
    );
  }
  const user = await reactivateScheduledCareAuthUser(
    admin,
    recovered,
    email,
    fullName,
    hospitalId,
    userSlug,
  );
  usersByEmail.set(normalizedEmail, user);
  return { user, created: false };
};

const listPackDemoHospitals = async (
  admin: DemoServiceClient,
  organizationId: string,
) => {
  const { data, error } = await admin
    .from("hospitals")
    .select(
      "id,name,place_id,organization_id,status,booking_eligible,timezone,specialties",
    )
    .eq("organization_id", organizationId)
    .like("place_id", "demo:%")
    .order("place_id", { ascending: true });

  if (error) {
    throw new Error(`scheduled-care hospital lookup failed: ${error.message}`);
  }

  return (Array.isArray(data) ? data : []) as DemoScheduledCareHospital[];
};

const listPackScheduledCareDoctors = async (
  admin: DemoServiceClient,
  hospitalIds: string[],
  userSlug: string,
) => {
  if (hospitalIds.length === 0) return [] as DemoScheduledCareDoctor[];

  const { data, error } = await admin
    .from("doctors")
    .select("id,hospital_id,profile_id,email,status,is_available")
    .in("hospital_id", hospitalIds)
    .like(
      "email",
      `${DEMO_SCHEDULE_EMAIL_PREFIX}%+${userSlug}@ivisit-demo.local`,
    );

  if (error) {
    throw new Error(`scheduled-care doctor lookup failed: ${error.message}`);
  }

  return (Array.isArray(data) ? data : []) as DemoScheduledCareDoctor[];
};

const listScheduledCareProfiles = async (
  admin: DemoServiceClient,
  profileIds: string[],
) => {
  if (profileIds.length === 0) return [] as DemoScheduledCareProfile[];

  const { data, error } = await admin
    .from("profiles")
    .select("id,email,organization_id,role,provider_type")
    .in("id", profileIds);
  if (error) {
    throw new Error(
      `scheduled-care profile audit failed: ${error.message}`,
    );
  }

  return (Array.isArray(data) ? data : []) as DemoScheduledCareProfile[];
};

const hasActiveScheduledVisitForDoctor = async (
  admin: DemoServiceClient,
  doctorId: string,
) => {
  const { count, error } = await admin
    .from("visits")
    .select("id", { count: "exact", head: true })
    .eq("doctor_id", doctorId)
    .not("care_mode", "is", null)
    .in("status", ["upcoming", "in_progress"]);
  if (error) {
    throw new Error(
      `scheduled-care active booking audit failed (${doctorId}): ${error.message}`,
    );
  }
  return (count || 0) > 0;
};

const retireScheduledCareAuthIdentity = async (
  admin: DemoServiceClient,
  doctor: DemoScheduledCareDoctor,
  hospital: DemoScheduledCareHospital | null,
  profile: DemoScheduledCareProfile | null,
  organizationId: string,
  userSlug: string,
  now: Date,
) => {
  const doctorEmail = toLowerEmail(doctor.email);
  const profileIsLinked =
    Boolean(doctor.profile_id) &&
    profile?.id === doctor.profile_id &&
    toLowerEmail(profile?.email) === doctorEmail;
  if (!doctorEmail || !profileIsLinked || !profile) {
    throw new Error(
      `scheduled-care retired profile ownership mismatch (${doctor.id})`,
    );
  }

  const { error: profileAccessError } = await admin
    .from("profiles")
    .update({
      organization_id: null,
      role: "patient",
      provider_type: null,
      assigned_ambulance_id: null,
      updated_at: now.toISOString(),
    })
    .eq("id", profile.id);
  if (profileAccessError) {
    throw new Error(
      `scheduled-care retired profile access cleanup failed: ${profileAccessError.message}`,
    );
  }

  const { data: authData, error: authLookupError } =
    await admin.auth.admin.getUserById(profile.id);
  const authUser = authData?.user as DemoAuthUser | undefined;
  if (
    authLookupError ||
    !authUser ||
    toLowerEmail(authUser.email) !== doctorEmail
  ) {
    throw new Error(
      `scheduled-care retired auth audit failed (${doctor.id}): ${authLookupError?.message || "identity mismatch"}`,
    );
  }

  const { count: emergencyAssignmentCount, error: assignmentError } =
    await admin
      .from("emergency_doctor_assignments")
      .select("id", { count: "exact", head: true })
      .eq("doctor_id", doctor.id);
  if (assignmentError) {
    throw new Error(
      `scheduled-care emergency assignment audit failed: ${assignmentError.message}`,
    );
  }

  const { count: emergencyRequestCount, error: emergencyRequestError } =
    await admin
      .from("emergency_requests")
      .select("id", { count: "exact", head: true })
      .eq("assigned_doctor_id", doctor.id);
  if (emergencyRequestError) {
    throw new Error(
      `scheduled-care emergency request audit failed: ${emergencyRequestError.message}`,
    );
  }

  const { count: patientVisitCount, error: patientVisitError } = await admin
    .from("visits")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.id);
  if (patientVisitError) {
    throw new Error(
      `scheduled-care patient visit audit failed: ${patientVisitError.message}`,
    );
  }

  const { count: providerVisitCount, error: providerVisitError } = await admin
    .from("visits")
    .select("id", { count: "exact", head: true })
    .eq("doctor_id", doctor.id);
  if (providerVisitError) {
    throw new Error(
      `scheduled-care provider visit audit failed: ${providerVisitError.message}`,
    );
  }

  const { count: consultParticipantCount, error: consultParticipantError } =
    await admin
      .from("emergency_chat_participants")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id);
  if (consultParticipantError) {
    throw new Error(
      `scheduled-care consult participant audit failed: ${consultParticipantError.message}`,
    );
  }

  const expectedEmail = hospital
    ? toLowerEmail(toScheduledCareEmail(hospital.id, userSlug))
    : "";
  const safeToDelete =
    Boolean(hospital) &&
    doctorEmail === expectedEmail &&
    profile.organization_id === organizationId &&
    profile.role === "provider" &&
    profile.provider_type === "doctor" &&
    hasScheduledCareAuthOwnership(
      authUser,
      doctorEmail,
      hospital?.id || "",
      userSlug,
    ) &&
    Number(emergencyAssignmentCount || 0) === 0 &&
    Number(emergencyRequestCount || 0) === 0 &&
    Number(patientVisitCount || 0) === 0 &&
    Number(providerVisitCount || 0) === 0 &&
    Number(consultParticipantCount || 0) === 0;

  if (safeToDelete) {
    const { error: deleteError } = await admin.auth.admin.deleteUser(
      authUser.id,
    );
    if (!deleteError) return "deleted" as const;
    console.warn(
      "[bootstrap-demo-ecosystem] scheduled-care auth delete fell back to ban",
      authUser.id,
      deleteError.message,
    );
  }

  const { error: banError } = await admin.auth.admin.updateUserById(
    authUser.id,
    {
      ban_duration: DEMO_RETIRED_AUTH_BAN_DURATION,
      user_metadata: {
        ...getAuthMetadata(authUser),
        role: "patient",
        source: "demo_bootstrap",
        demo_purpose: "scheduled_care",
        demo_scope: userSlug,
        demo_hospital_id: hospital?.id || null,
        demo_retired: true,
        demo_retired_at: now.toISOString(),
      },
    },
  );
  if (banError) {
    throw new Error(
      `scheduled-care retired auth ban failed: ${banError.message}`,
    );
  }

  return "banned" as const;
};

const ensureDemoScheduledCare = async (
  admin: DemoServiceClient,
  ctx: ReturnType<typeof buildDemoContext>,
  organizationId: string,
  now: Date,
) => {
  const packHospitals = await listPackDemoHospitals(admin, organizationId);
  const activeHospitals = packHospitals.filter(
    (hospital) =>
      hospital.status === "available" && hospital.booking_eligible === true,
  );
  const targetEmails = new Set(
    activeHospitals.map((hospital) =>
      toLowerEmail(toScheduledCareEmail(hospital.id, ctx.userSlug))
    ),
  );
  const usersByEmail = await listAuthUsersByEmail(admin, targetEmails);
  const activeDoctorIds = new Set<string>();
  const scheduleRows: Record<string, unknown>[] = [];
  let expiredShiftsRemoved = 0;

  for (let index = 0; index < activeHospitals.length; index += 1) {
    const hospital = activeHospitals[index];
    const email = toScheduledCareEmail(hospital.id, ctx.userSlug);
    const fullName = `Dr Demo Scheduled Care ${index + 1}`;
    const account = await ensureScheduledCareAuthUser(
      admin,
      usersByEmail,
      email,
      fullName,
      hospital.id,
      ctx.userSlug,
    );

    const { error: profileError } = await admin
      .from("profiles")
      .update({
        role: "provider",
        provider_type: "doctor",
        organization_id: organizationId,
        full_name: fullName,
        email,
        updated_at: now.toISOString(),
      })
      .eq("id", account.user.id);
    if (profileError) {
      throw new Error(
        `scheduled-care profile sync failed (${account.user.id}): ${profileError.message}`,
      );
    }

    const { data: doctor, error: doctorError } = await admin
      .from("doctors")
      .upsert(
        {
          profile_id: account.user.id,
          hospital_id: hospital.id,
          name: fullName,
          specialization: selectAppointmentSpecialty(hospital.specialties),
          department: "Outpatient Care",
          status: "available",
          is_available: true,
          is_on_call: false,
          max_patients: 8,
          current_patients: 0,
          email,
        },
        { onConflict: "profile_id", ignoreDuplicates: false },
      )
      .select("id")
      .single();
    if (doctorError || !doctor?.id) {
      throw new Error(
        `scheduled-care doctor upsert failed: ${doctorError?.message || "missing doctor id"}`,
      );
    }

    activeDoctorIds.add(String(doctor.id));
    const timezone = resolveFacilityTimezone(hospital.timezone);
    const localToday = toDateKeyInTimezone(now, timezone);
    const { data: expiredShifts, error: expiredShiftError } = await admin
      .from("doctor_schedules")
      .delete()
      .eq("doctor_id", doctor.id)
      .lt("date", localToday)
      .select("id");
    if (expiredShiftError) {
      throw new Error(
        `scheduled-care expired schedule cleanup failed: ${expiredShiftError.message}`,
      );
    }
    expiredShiftsRemoved += Array.isArray(expiredShifts)
      ? expiredShifts.length
      : 0;

    buildScheduleDateKeys(now, timezone).forEach((date) => {
      scheduleRows.push({
        doctor_id: doctor.id,
        date,
        start_time: DEMO_SCHEDULE_START_TIME,
        end_time: DEMO_SCHEDULE_END_TIME,
        shift_type: "day",
        is_available: true,
        updated_at: now.toISOString(),
      });
    });
  }

  if (scheduleRows.length > 0) {
    const { error: scheduleError } = await admin
      .from("doctor_schedules")
      .upsert(scheduleRows, {
        onConflict: "doctor_id,date,start_time,end_time",
        ignoreDuplicates: false,
      });
    if (scheduleError) {
      throw new Error(
        `scheduled-care schedule upsert failed: ${scheduleError.message}`,
      );
    }
  }

  const packHospitalIds = packHospitals.map((hospital) => hospital.id);
  const packDoctors = await listPackScheduledCareDoctors(
    admin,
    packHospitalIds,
    ctx.userSlug,
  );
  const retirementCandidates = packDoctors.filter(
    (doctor) => !activeDoctorIds.has(doctor.id),
  );
  const retiredProfiles = await listScheduledCareProfiles(
    admin,
    retirementCandidates
      .map((doctor) => doctor.profile_id)
      .filter((profileId): profileId is string => Boolean(profileId)),
  );
  const retiredProfilesById = new Map(
    retiredProfiles.map((profile) => [profile.id, profile]),
  );
  let retiredAuthDeleted = 0;
  let retiredAuthBanned = 0;
  let retirementDeferred = 0;
  const retiredDoctors: DemoScheduledCareDoctor[] = [];

  if (retirementCandidates.length > 0) {
    const retiredDoctorIds = retirementCandidates.map((doctor) => doctor.id);
    const { error: retireError } = await admin
      .from("doctors")
      .update({ status: "off_duty", is_available: false, is_on_call: false })
      .in("id", retiredDoctorIds);
    if (retireError) {
      throw new Error(
        `scheduled-care doctor retirement failed: ${retireError.message}`,
      );
    }

    const hospitalsById = new Map(
      packHospitals.map((hospital) => [hospital.id, hospital]),
    );
    for (const doctor of retirementCandidates) {
      if (await hasActiveScheduledVisitForDoctor(admin, doctor.id)) {
        retirementDeferred += 1;
        continue;
      }

      retiredDoctors.push(doctor);
      const hospital = doctor.hospital_id
        ? hospitalsById.get(doctor.hospital_id)
        : null;
      const localToday = toDateKeyInTimezone(
        now,
        resolveFacilityTimezone(hospital?.timezone),
      );
      const { error: cleanupError } = await admin
        .from("doctor_schedules")
        .delete()
        .eq("doctor_id", doctor.id)
        .gt("date", localToday);
      if (cleanupError) {
        throw new Error(
          `scheduled-care future schedule cleanup failed: ${cleanupError.message}`,
        );
      }

      const authDisposition = await retireScheduledCareAuthIdentity(
        admin,
        doctor,
        hospital || null,
        doctor.profile_id
          ? retiredProfilesById.get(doctor.profile_id) || null
          : null,
        organizationId,
        ctx.userSlug,
        now,
      );
      if (authDisposition === "deleted") retiredAuthDeleted += 1;
      if (authDisposition === "banned") retiredAuthBanned += 1;
    }
  }

  return {
    hospitals_scheduled: activeHospitals.length,
    appointment_clinicians: activeDoctorIds.size,
    future_shifts_upserted: scheduleRows.length,
    expired_shifts_removed: expiredShiftsRemoved,
    clinicians_retired: retiredDoctors.length,
    clinicians_retirement_deferred: retirementDeferred,
    retired_auth_deleted: retiredAuthDeleted,
    retired_auth_banned: retiredAuthBanned,
  };
};

const getDemoScheduledCareReadiness = async (
  admin: DemoServiceClient,
  ctx: ReturnType<typeof buildDemoContext>,
  organizationId: string,
  now: Date,
) => {
  const packHospitals = await listPackDemoHospitals(admin, organizationId);
  const activeHospitals = packHospitals.filter(
    (hospital) =>
      hospital.status === "available" && hospital.booking_eligible === true,
  );
  const doctors = await listPackScheduledCareDoctors(
    admin,
    packHospitals.map((hospital) => hospital.id),
    ctx.userSlug,
  );
  const activeDoctors = doctors.filter(
    (doctor) => doctor.status === "available" && doctor.is_available === true,
  );
  const activeDoctorByHospital = new Map(
    activeDoctors.map((doctor) => [doctor.hospital_id, doctor]),
  );
  const expectedShiftKeys = new Set<string>();

  activeHospitals.forEach((hospital) => {
    const doctor = activeDoctorByHospital.get(hospital.id);
    if (!doctor) return;
    const timezone = resolveFacilityTimezone(hospital.timezone);
    buildScheduleDateKeys(now, timezone).forEach((date) => {
      expectedShiftKeys.add(
        `${doctor.id}|${date}|${DEMO_SCHEDULE_START_TIME}|${DEMO_SCHEDULE_END_TIME}`,
      );
    });
  });

  let matchedShiftCount = 0;
  if (activeDoctors.length > 0 && expectedShiftKeys.size > 0) {
    const dates = [...expectedShiftKeys]
      .map((key) => key.split("|")[1])
      .sort();
    const { data: shifts, error: shiftsError } = await admin
      .from("doctor_schedules")
      .select("doctor_id,date,start_time,end_time,is_available")
      .in("doctor_id", activeDoctors.map((doctor) => doctor.id))
      .gte("date", dates[0])
      .lte("date", dates[dates.length - 1]);
    if (shiftsError) {
      throw new Error(
        `scheduled-care readiness lookup failed: ${shiftsError.message}`,
      );
    }

    const actualShiftKeys = new Set(
      (Array.isArray(shifts) ? shifts : [])
        .filter((shift) => shift.is_available === true)
        .map(
          (shift) =>
            `${shift.doctor_id}|${shift.date}|${shift.start_time}|${shift.end_time}`,
        ),
    );
    matchedShiftCount = [...expectedShiftKeys].filter((key) =>
      actualShiftKeys.has(key)
    ).length;
  }

  const scheduleReady =
    activeHospitals.length > 0 &&
    activeDoctors.length === activeHospitals.length &&
    activeDoctorByHospital.size === activeHospitals.length &&
    expectedShiftKeys.size ===
      activeHospitals.length * DEMO_SCHEDULE_HORIZON_DAYS &&
    matchedShiftCount === expectedShiftKeys.size;

  const [visitProbe, roomProbe, messageProbe, bucketProbe] = await Promise.all([
    admin
      .from("visits")
      .select(
        "doctor_id,care_mode,scheduled_start_at,scheduled_end_at,scheduled_timezone,booking_idempotency_key",
      )
      .limit(1),
    admin
      .from("emergency_chat_rooms")
      .select("channel_type,visit_id,emergency_request_id")
      .limit(1),
    admin
      .from("emergency_chat_messages")
      .select(
        "attachment_storage_path,attachment_mime_type,attachment_size_bytes,attachment_duration_ms,ai_assisted",
      )
      .limit(1),
    admin.storage.getBucket("documents"),
  ]);
  const scheduledVisitContractReady = !visitProbe.error;
  const privateMediaReady =
    !bucketProbe.error && bucketProbe.data?.public === false;
  const bookVisitReady = scheduleReady && scheduledVisitContractReady;
  const telemedicineReady =
    bookVisitReady &&
    !roomProbe.error &&
    !messageProbe.error &&
    privateMediaReady;

  return {
    appointment_clinicians_count: activeDoctors.length,
    future_schedule_count: matchedShiftCount,
    schedule_horizon_days: DEMO_SCHEDULE_HORIZON_DAYS,
    schedule_ready: scheduleReady,
    book_visit_ready: bookVisitReady,
    telemedicine_ready: telemedicineReady,
  };
};

export const handleBootstrapDemoEcosystemRequest = async (req: Request) => {
  if (req.method === "OPTIONS") {
    return optionsResponse();
  }

  let phase = "unknown";
  const timeline: TimedStepEntry[] = [];

  try {
    const authHeader = req.headers.get("Authorization") ?? "";

    const body = await req.json();
    phase = toSafeString(body?.phase, "full");
    const requestedUserId = toSafeString(body?.userId, "");
    const latitude = toFiniteNumber(body?.latitude);
    const longitude = toFiniteNumber(body?.longitude);
    const radiusKm = Math.max(
      1,
      Math.min(100, Math.round(toFiniteNumber(body?.radiusKm) ?? 50)),
    );

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new Error("latitude and longitude are required");
    }

    const userClient = createUserClient(authHeader);
    const adminClient = createServiceClient();

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    const effectiveUserId =
      !userError && user?.id
        ? String(user.id)
        : toSafeString(requestedUserId, "");

    if (!effectiveUserId) {
      return jsonResponse({ error: "Unauthorized" }, { status: 401 });
    }

    const ctx = buildDemoContext(
      effectiveUserId,
      Number(latitude),
      Number(longitude),
      radiusKm,
    );
    const bootstrapNow = new Date();

    const runStep = <TData>(step: string, action: () => Promise<TData>) =>
      runTimedStep(timeline, step, action);

    const organizationResult = await runStep("ensure_org", () =>
      ensureDemoOrganization(adminClient, ctx),
    );

    const organizationId = organizationResult.organization.id;
    let hospitals: DemoHospitalResponse[] = [];

    if (phase === "prepare") {
      const nearbySeeds = await runStep("preview_nearby_sources", () =>
        getNearbySeedHospitals(adminClient, ctx),
      );

      return jsonResponse(
        {
          ok: true,
          phase,
          organization_id: organizationId,
          preview: {
            nearby_candidates: nearbySeeds.slice(0, 5).map((seed) => ({
              name: seed.name,
              address: seed.address,
              distance_km: seed.distance_km,
            })),
            candidate_count: nearbySeeds.length,
          },
          timeline,
        },
        { status: 200 },
      );
    }

    if (
      phase === "hospitals" ||
      phase === "staff" ||
      phase === "pricing" ||
      phase === "full"
    ) {
      hospitals = await runStep("ensure_demo_hospitals", () =>
        ensureDemoHospitals(adminClient, ctx, organizationId, null),
      );
    }

    if (phase === "staff" || phase === "pricing" || phase === "full") {
      const staffing = await runStep("ensure_demo_staff", () =>
        ensureDemoStaff(adminClient, ctx, organizationId, hospitals),
      );

      hospitals = await runStep("refresh_demo_hospitals_after_staff", () =>
        ensureDemoHospitals(
          adminClient,
          ctx,
          organizationId,
          staffing.org_admin_profile_id ?? null,
        ),
      );
      await runStep("ensure_demo_scheduled_care", () =>
        ensureDemoScheduledCare(
          adminClient,
          ctx,
          organizationId,
          bootstrapNow,
        ),
      );
    }

    if (phase === "pricing" || phase === "full") {
      await runStep("ensure_demo_finance", () =>
        ensureDemoFinancialReadiness(adminClient, organizationId),
      );
      await runStep("ensure_demo_pricing", () =>
        ensureDemoPricing(adminClient, hospitals),
      );
    }

    const scheduledCareReadiness = await runStep(
      "scheduled_care_readiness",
      () =>
        getDemoScheduledCareReadiness(
          adminClient,
          ctx,
          organizationId,
          bootstrapNow,
        ),
    );
    const summary = await runStep("summary", async () => ({
      ...(await getDemoSummary(adminClient, ctx, organizationId)),
      ...scheduledCareReadiness,
    }));

    return jsonResponse(
      {
        ok: true,
        phase,
        organization_id: organizationId,
        hospitals: hospitals.map((hospital) => ({
          id: hospital.id,
          name: hospital.name,
          place_id: hospital.place_id,
        })),
        summary,
        timeline,
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[bootstrap-demo-ecosystem] fatal", message);
    return jsonResponse(
      {
        ok: false,
        error: message,
        phase:
          typeof phase === "string" && phase.length > 0
            ? phase
            : "unknown",
        timeline,
      },
      { status: 500 },
    );
  }
};
