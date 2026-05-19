import { toFiniteNumber, toNonNegativeInt } from "../numbers.ts";
import { pickFallbackProviderImage } from "./fallbackImages.ts";
import { PROVIDER_TYPES } from "./taxonomy.ts";

const toSafeString = (value: unknown, fallback = ""): string => {
  if (typeof value !== "string") return fallback;
  const clean = value.trim();
  return clean.length > 0 ? clean : fallback;
};

const toSafeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

const toGeometryPoint = (latitude: unknown, longitude: unknown): string | null => {
  const lat = toFiniteNumber(latitude);
  const lng = toFiniteNumber(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return `SRID=4326;POINT(${lng} ${lat})`;
};

export const toHospitalUpsertRow = (row: any) => {
  const providerCategory = toSafeString(row?.provider_type, PROVIDER_TYPES.HOSPITAL);
  const latitude = toFiniteNumber(row?.latitude);
  const longitude = toFiniteNumber(row?.longitude);
  return {
    place_id: row?.place_id,
    name: row?.name || "Unnamed Hospital",
    address: row?.address || "Address unavailable",
    phone: typeof row?.phone === "string" && row.phone.trim() ? row.phone.trim() : null,
    latitude,
    longitude,
    coordinates: toGeometryPoint(latitude, longitude),
    rating: toFiniteNumber(row?.rating) ?? 0,
    image:
      toSafeString(row?.image) ||
      pickFallbackProviderImage(String(row?.place_id || row?.name || "hospital"), providerCategory),
    image_source: toSafeString(row?.image_source, "deterministic_fallback"),
    image_confidence:
      toFiniteNumber(row?.image_confidence) ??
      (toSafeString(row?.image).length > 0 ? 0.95 : 0.35),
    image_attribution_text: toSafeString(row?.image_attribution_text),
    image_synced_at: new Date().toISOString(),
    specialties: toSafeStringArray(row?.specialties),
    service_types: toSafeStringArray(row?.service_types),
    features: toSafeStringArray(row?.features),
    emergency_level: toSafeString(row?.emergency_level, "Standard"),
    available_beds: toNonNegativeInt(row?.available_beds, 0),
    ambulances_count: toNonNegativeInt(row?.ambulances_count, 0),
    wait_time: toSafeString(row?.wait_time, "15 min"),
    price_range: toSafeString(row?.price_range, "$$$"),
    verified: false,
    status: "available",
    type: "standard",
    provider_type: toSafeString(row?.provider_type, PROVIDER_TYPES.HOSPITAL),
    emergency_eligible: row?.emergency_eligible === true,
    category_confidence: toFiniteNumber(row?.category_confidence) ?? 0.30,
    provider_source: toSafeString(row?.provider_source, "mapbox_places"),
  };
};

const enrichProviderData = (providerType: string, existingFeatures: string[] = []) => {
  const features = new Set(existingFeatures);
  const services: string[] = [];
  const specialties: string[] = [];
  const insurance: string[] = [];
  const hours: Record<string, any> = {};
  let appointmentRequired = false;
  let reportTurnaround: string | undefined;
  let ageRange: string | undefined;
  let crisisLine: string | undefined;

  switch (providerType) {
    case "pharmacy":
      services.push("prescription_filling", "vaccinations");
      specialties.push("prescription_services", "vaccination_services");
      if (features.has("24_hour")) hours["24_hour"] = true;
      break;

    case "lab":
      services.push("blood_draw", "urine_collection", "genetic_testing");
      specialties.push("blood_work", "urine_tests", "genetic_testing");
      appointmentRequired = true;
      reportTurnaround = "2-3 days";
      break;

    case "radiology":
      services.push("x_ray", "ct", "mri", "ultrasound");
      specialties.push("x_ray", "ct_scan", "mri", "ultrasound");
      appointmentRequired = true;
      reportTurnaround = "1-2 days";
      break;

    case "urgent_care":
      services.push("minor_injuries", "illnesses", "x_ray", "lab");
      specialties.push("urgent_care");
      break;

    case "clinic":
      services.push("checkups", "vaccinations", "minor_procedures");
      specialties.push("primary_care", "dermatology", "cardiology");
      appointmentRequired = true;
      break;

    case "mental_health":
      services.push("therapy", "counseling", "crisis_intervention");
      specialties.push("individual_therapy", "group_therapy", "cbt");
      if (features.has("telehealth")) hours["telehealth"] = true;
      crisisLine = "555-0123";
      break;

    case "womens_care":
      services.push("ob_gyn", "prenatal", "mammograms");
      specialties.push("ob_gyn", "prenatal_care", "mammograms");
      appointmentRequired = true;
      if (features.has("midwife_services")) specialties.push("midwife_services");
      break;

    case "pediatrics":
      services.push("vaccinations", "well_child", "specialized_care");
      specialties.push("well_child_visits", "specialized_care");
      ageRange = "0-18";
      if (features.has("pediatric_specialists")) specialties.push("pediatric_specialists");
      break;

    case "hospital":
    default:
      break;
  }

  return {
    provider_services: { services },
    provider_specialties: { specialties },
    insurance_accepted: insurance.length > 0 ? insurance : null,
    structured_hours: Object.keys(hours).length > 0 ? hours : null,
    appointment_required: appointmentRequired,
    report_turnaround: reportTurnaround,
    age_range: ageRange,
    crisis_line: crisisLine,
  };
};

export const toProviderUpsertRow = (hospitalId: string, row: any) => {
  const providerType = toSafeString(row?.provider_type, PROVIDER_TYPES.HOSPITAL);

  if (providerType === "hospital") {
    return null;
  }

  const enrichedData = enrichProviderData(providerType, toSafeStringArray(row?.features));

  return {
    hospital_id: hospitalId,
    provider_type: providerType,
    provider_services: enrichedData.provider_services,
    provider_specialties: enrichedData.provider_specialties,
    insurance_accepted: enrichedData.insurance_accepted,
    structured_hours: enrichedData.structured_hours,
    appointment_required: enrichedData.appointment_required,
    report_turnaround: enrichedData.report_turnaround,
    age_range: enrichedData.age_range,
    crisis_line: enrichedData.crisis_line,
  };
};
