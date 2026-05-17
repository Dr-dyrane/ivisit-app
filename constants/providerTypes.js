// constants/providerTypes.js
//
// EXPLORE-CARE-01 — EXP-1: Provider Taxonomy
// Single source of truth for all care provider classification constants.
//
// Rules:
// - emergencyEligible = providerType === HOSPITAL && emergencyLevel ∈ ER_ELIGIBLE_LEVELS
// - dispatchEligible  = emergencyEligible && verificationStatus ∈ DISPATCH_ELIGIBLE_STATUSES
// - bookingEligible   = any provider with status === 'available'
// - Emergency flow must ONLY consume providers where dispatchEligible === true

// ─── Provider Types ─────────────────────────────────────────────────────────────

export const PROVIDER_TYPES = Object.freeze({
  HOSPITAL: "hospital",
  PHARMACY: "pharmacy",
  LAB: "lab",
  RADIOLOGY: "radiology",
  URGENT_CARE: "urgent_care",
  CLINIC: "clinic",
  MENTAL_HEALTH: "mental_health",
  WOMENS_CARE: "womens_care",
  PEDIATRICS: "pediatrics",
});

// Provider types that are eligible to appear in emergency dispatch flow
export const EMERGENCY_PROVIDER_TYPES = Object.freeze([
  PROVIDER_TYPES.HOSPITAL,
]);

// Provider types that are valid for the Explore Nearby Care flow
export const EXPLORE_PROVIDER_TYPES = Object.freeze([
  PROVIDER_TYPES.HOSPITAL,
  PROVIDER_TYPES.PHARMACY,
  PROVIDER_TYPES.LAB,
  PROVIDER_TYPES.RADIOLOGY,
  PROVIDER_TYPES.URGENT_CARE,
  PROVIDER_TYPES.CLINIC,
  PROVIDER_TYPES.MENTAL_HEALTH,
  PROVIDER_TYPES.WOMENS_CARE,
  PROVIDER_TYPES.PEDIATRICS,
]);

// ─── Emergency Levels ────────────────────────────────────────────────────────────

export const EMERGENCY_LEVELS = Object.freeze({
  ER: "er",
  GENERAL_HOSPITAL: "general_hospital",
  SPECIALIST_HOSPITAL: "specialist_hospital",
  CLINIC: "clinic",
  URGENT_CARE: "urgent_care",
  UNKNOWN: "unknown",
});

// Legacy string mappings from Places API → normalised EMERGENCY_LEVELS
export const EMERGENCY_LEVEL_ALIASES = Object.freeze({
  "Level 1": EMERGENCY_LEVELS.ER,
  "Level 2": EMERGENCY_LEVELS.GENERAL_HOSPITAL,
  "Level 3": EMERGENCY_LEVELS.SPECIALIST_HOSPITAL,
  "Standard": EMERGENCY_LEVELS.GENERAL_HOSPITAL,
  "Teaching Hospital": EMERGENCY_LEVELS.GENERAL_HOSPITAL,
  "Specialist": EMERGENCY_LEVELS.SPECIALIST_HOSPITAL,
  "Clinic": EMERGENCY_LEVELS.CLINIC,
  "Urgent Care": EMERGENCY_LEVELS.URGENT_CARE,
});

// Only these emergency levels are eligible for ambulance dispatch
export const ER_ELIGIBLE_LEVELS = Object.freeze([
  EMERGENCY_LEVELS.ER,
  EMERGENCY_LEVELS.GENERAL_HOSPITAL,
]);

// ─── Verification Status ─────────────────────────────────────────────────────────

export const VERIFICATION_STATUS = Object.freeze({
  VERIFIED: "verified",
  PARTNER: "partner",
  DISCOVERED: "discovered",
  UNVERIFIED: "unverified",
  DEMO: "demo",
});

// Only these statuses allow emergency dispatch
export const DISPATCH_ELIGIBLE_STATUSES = Object.freeze([
  VERIFICATION_STATUS.VERIFIED,
  VERIFICATION_STATUS.PARTNER,
  VERIFICATION_STATUS.DEMO,
]);

// ─── Provider Sources ─────────────────────────────────────────────────────────────

export const PROVIDER_SOURCES = Object.freeze({
  GOOGLE_PLACES: "google_places",
  MAPBOX_PLACES: "mapbox_places",
  MANUAL_SEED: "manual_seed",
  VERIFIED_PROVIDER: "verified_provider",
  DEMO_BOOTSTRAP: "demo_bootstrap",
});

// Sources that require human verification before dispatch eligibility
export const UNVERIFIED_SOURCES = Object.freeze([
  PROVIDER_SOURCES.GOOGLE_PLACES,
  PROVIDER_SOURCES.MAPBOX_PLACES,
]);

// ─── Category Confidence Thresholds ───────────────────────────────────────────────

// How confident we are that a Place is actually the declared provider type
// 0.0 = unknown / guessed, 1.0 = verified ground truth
export const CATEGORY_CONFIDENCE = Object.freeze({
  VERIFIED_PROVIDER: 1.0,   // manually verified in DB
  DEMO_BOOTSTRAP: 0.99,     // seeded demo hospital
  GOOGLE_HOSPITAL_TYPE: 0.75, // Google returned type "hospital"
  MAPBOX_HOSPITAL_CAT: 0.65,  // Mapbox hospital category
  NAME_HEURISTIC: 0.50,     // inferred from place name keywords
  FALLBACK: 0.30,           // unknown / could not classify
});

// Minimum confidence for a place to be stored as a provider
export const MIN_STORE_CONFIDENCE = 0.30;

// Minimum confidence for emergency eligibility override (unverified sources)
export const MIN_EMERGENCY_CONFIDENCE = 0.75;

// ─── Explore Category Metadata ────────────────────────────────────────────────────

// UI metadata for each explore category (label, icon, marker tint)
export const EXPLORE_CATEGORY_META = Object.freeze({
  [PROVIDER_TYPES.HOSPITAL]: {
    label: "Hospitals",
    iconName: "hospital-building",
    markerTint: "#C62828",    // Red
    orbColors: ["#EF4444", "#DC2626"],  // Red gradient
    mapboxCategory: "hospital",
    googleType: "hospital",
    searchKeywords: ["hospital", "medical center", "health centre"],
    spatialCopy: "Emergency care around you",
    actionLabel: "See nearby",
  },
  [PROVIDER_TYPES.PHARMACY]: {
    label: "Pharmacies",
    iconName: "pill",
    markerTint: "#2E7D32",    // Green
    orbColors: ["#22C55E", "#16A34A"],  // Green gradient
    mapboxCategory: "pharmacy",
    googleType: "pharmacy",
    searchKeywords: ["pharmacy", "chemist", "drugstore"],
    spatialCopy: "Open nearby",
    actionLabel: "Available nearby",
  },
  [PROVIDER_TYPES.LAB]: {
    label: "Labs",
    iconName: "flask-outline",
    markerTint: "#1565C0",    // Blue
    orbColors: ["#3B82F6", "#2563EB"],  // Blue gradient
    mapboxCategory: "medical",
    googleType: "medical_lab",
    searchKeywords: ["laboratory", "diagnostic center", "pathology lab"],
    spatialCopy: "Sample collection nearby",
    actionLabel: "Around you",
  },
  [PROVIDER_TYPES.RADIOLOGY]: {
    label: "Radiology",
    iconName: "radioactive-circle-outline",
    markerTint: "#6A1B9A",    // Purple
    orbColors: ["#8B5CF6", "#7C3AED"],  // Purple gradient
    mapboxCategory: "medical",
    googleType: "diagnostic_imaging_center",
    searchKeywords: ["radiology", "x-ray", "mri", "ultrasound center"],
    spatialCopy: "Imaging available nearby",
    actionLabel: "Care nearby",
  },
  [PROVIDER_TYPES.URGENT_CARE]: {
    label: "Urgent Care",
    iconName: "ambulance",
    markerTint: "#E65100",    // Orange
    orbColors: ["#F97316", "#EA580C"],  // Orange gradient
    mapboxCategory: "medical",
    googleType: "urgent_care_center",
    searchKeywords: ["urgent care", "walk-in clinic", "emergency clinic"],
    spatialCopy: "Walk-in care nearby",
    actionLabel: "Open nearby",
  },
  [PROVIDER_TYPES.CLINIC]: {
    label: "Clinics",
    iconName: "medical-bag",
    markerTint: "#00695C",    // Teal
    orbColors: ["#14B8A6", "#0D9488"],  // Teal gradient
    mapboxCategory: "medical",
    googleType: "doctor",
    searchKeywords: ["clinic", "health clinic", "polyclinic", "medical clinic"],
    spatialCopy: "Consultations nearby",
    actionLabel: "Care nearby",
  },
  [PROVIDER_TYPES.MENTAL_HEALTH]: {
    label: "Mental Health",
    iconName: "brain",
    markerTint: "#4527A0",    // Deep Purple
    orbColors: ["#A855F7", "#9333EA"],  // Deep Purple gradient
    mapboxCategory: "medical",
    googleType: "mental_health",
    searchKeywords: ["mental health", "psychiatry", "therapy center", "counseling"],
    spatialCopy: "Nearby support",
    actionLabel: "Support nearby",
  },
  [PROVIDER_TYPES.WOMENS_CARE]: {
    label: "Women's Care",
    iconName: "human-female",
    markerTint: "#AD1457",    // Pink
    orbColors: ["#EC4899", "#DB2777"],  // Pink gradient
    mapboxCategory: "medical",
    googleType: "gynecologist",
    searchKeywords: ["women's health", "gynecology", "obstetrics", "maternity"],
    spatialCopy: "Care around you",
    actionLabel: "Around you",
  },
  [PROVIDER_TYPES.PEDIATRICS]: {
    label: "Pediatrics",
    iconName: "baby-face-outline",
    markerTint: "#0277BD",    // Light Blue
    orbColors: ["#38BDF8", "#0EA5E9"],  // Light Blue gradient
    mapboxCategory: "medical",
    googleType: "pediatrician",
    searchKeywords: ["pediatrics", "children's hospital", "child health", "paediatric"],
    spatialCopy: "Child care nearby",
    actionLabel: "Around you",
  },
});

// ─── Category Capability Tags ─────────────────────────────────────────────────────
//
// Static per-category capability chips for the provider list filter rail.
// Each entry: { id, label, iconName } — iconName is MaterialCommunityIcons.
// These are UI affordances, not query filters.

export const CATEGORY_CAPABILITY_TAGS = Object.freeze({
  [PROVIDER_TYPES.HOSPITAL]: [
    { id: "er",        label: "ER",          iconName: "alert-circle-outline" },
    { id: "icu",       label: "ICU",         iconName: "bed-patient" },
    { id: "trauma",    label: "Trauma",      iconName: "bandage" },
    { id: "pediatrics",label: "Pediatrics",  iconName: "baby-face-outline" },
    { id: "24hr",      label: "24hr",        iconName: "clock-outline" },
  ],
  [PROVIDER_TYPES.PHARMACY]: [
    { id: "open_now",  label: "Open now",    iconName: "clock-check-outline" },
    { id: "24hr",      label: "24hr",        iconName: "clock-outline" },
    { id: "late_night",label: "Late night",  iconName: "moon-waning-crescent" },
    { id: "pickup",    label: "Pickup",      iconName: "bag-personal-outline" },
  ],
  [PROVIDER_TYPES.LAB]: [
    { id: "walk_ins",  label: "Walk-ins",    iconName: "walk" },
    { id: "blood",     label: "Blood tests", iconName: "water-outline" },
    { id: "diagnostics",label: "Diagnostics",iconName: "microscope" },
    { id: "home_collection", label: "Home collection", iconName: "home-heart" },
  ],
  [PROVIDER_TYPES.RADIOLOGY]: [
    { id: "mri",       label: "MRI",         iconName: "magnet-on" },
    { id: "ct",        label: "CT scan",     iconName: "circle-slice-8" },
    { id: "ultrasound",label: "Ultrasound",  iconName: "waveform" },
    { id: "xray",      label: "X-ray",       iconName: "radioactive" },
  ],
  [PROVIDER_TYPES.URGENT_CARE]: [
    { id: "walk_ins",  label: "Walk-ins",    iconName: "walk" },
    { id: "fast_track",label: "Fast track",  iconName: "run-fast" },
    { id: "24hr",      label: "24hr",        iconName: "clock-outline" },
    { id: "minor_er",  label: "Minor ER",    iconName: "alert-outline" },
  ],
  [PROVIDER_TYPES.CLINIC]: [
    { id: "appointments", label: "Appointments", iconName: "calendar-check-outline" },
    { id: "walk_ins",  label: "Walk-ins",    iconName: "walk" },
    { id: "gp",        label: "GP",          iconName: "stethoscope" },
    { id: "telehealth",label: "Telehealth",  iconName: "video-outline" },
  ],
  [PROVIDER_TYPES.MENTAL_HEALTH]: [
    { id: "therapy",   label: "Therapy",     iconName: "head-heart-outline" },
    { id: "psychiatry",label: "Psychiatry",  iconName: "brain" },
    { id: "crisis",    label: "Crisis care", iconName: "phone-alert-outline" },
    { id: "telehealth",label: "Telehealth",  iconName: "video-outline" },
  ],
  [PROVIDER_TYPES.WOMENS_CARE]: [
    { id: "ob_gyn",    label: "OB/GYN",      iconName: "human-female" },
    { id: "maternity", label: "Maternity",   iconName: "mother-nurse" },
    { id: "antenatal", label: "Antenatal",   iconName: "baby-bottle-outline" },
    { id: "family_planning", label: "Family planning", iconName: "heart-plus-outline" },
  ],
  [PROVIDER_TYPES.PEDIATRICS]: [
    { id: "newborn",   label: "Newborn",     iconName: "baby-bottle-outline" },
    { id: "vaccinations", label: "Vaccines", iconName: "needle" },
    { id: "walk_ins",  label: "Walk-ins",    iconName: "walk" },
    { id: "24hr",      label: "24hr",        iconName: "clock-outline" },
  ],
});

// ─── Classification Helpers ────────────────────────────────────────────────────────

/**
 * Classify a place name into a provider type using keyword heuristics.
 * Used when the Places API category alone is ambiguous.
 * Returns { providerType, confidence }
 */
export function classifyProviderByName(name = "") {
  const lower = (name || "").toLowerCase();

  // Pharmacy check (must come before hospital — "hospital pharmacy" should → hospital)
  if (
    /\bpharmac[yi]\b|\bchemist\b|\bdrugstore\b/.test(lower) &&
    !/\bhospital\b|\bmedical center\b/.test(lower)
  ) {
    return { providerType: PROVIDER_TYPES.PHARMACY, confidence: CATEGORY_CONFIDENCE.NAME_HEURISTIC };
  }

  // Lab check
  if (/\blab(oratory)?\b|\bdiagnostic\b|\bpatholog[yi]\b/.test(lower)) {
    return { providerType: PROVIDER_TYPES.LAB, confidence: CATEGORY_CONFIDENCE.NAME_HEURISTIC };
  }

  // Radiology
  if (/\bradio[l]?og[yi]\b|\bx-?ray\b|\bmri\b|\bimaging\b|\bultrasound\b/.test(lower)) {
    return { providerType: PROVIDER_TYPES.RADIOLOGY, confidence: CATEGORY_CONFIDENCE.NAME_HEURISTIC };
  }

  // Mental Health
  if (/\bpsychiat[ry]\b|\bmental health\b|\btherapy\b|\bcounsel(l?ing)?\b/.test(lower)) {
    return { providerType: PROVIDER_TYPES.MENTAL_HEALTH, confidence: CATEGORY_CONFIDENCE.NAME_HEURISTIC };
  }

  // Women's Care
  if (/\bgynaeco?log[yi]\b|\bobstetric\b|\bmaternit[yi]\b|\bwomen.?s health\b/.test(lower)) {
    return { providerType: PROVIDER_TYPES.WOMENS_CARE, confidence: CATEGORY_CONFIDENCE.NAME_HEURISTIC };
  }

  // Pediatrics
  if (/\bpaediatric\b|\bpediatric\b|\bchildren.?s\b|\bchild health\b/.test(lower)) {
    return { providerType: PROVIDER_TYPES.PEDIATRICS, confidence: CATEGORY_CONFIDENCE.NAME_HEURISTIC };
  }

  // Urgent Care
  if (/\burgent care\b|\bwalk.?in\b/.test(lower)) {
    return { providerType: PROVIDER_TYPES.URGENT_CARE, confidence: CATEGORY_CONFIDENCE.NAME_HEURISTIC };
  }

  // Clinic (before hospital — "teaching clinic" → clinic, "hospital" → hospital)
  if (/\bclinic\b|\bpolyclinic\b|\bhealth cent(re|er)\b/.test(lower) && !/\bhospital\b/.test(lower)) {
    return { providerType: PROVIDER_TYPES.CLINIC, confidence: CATEGORY_CONFIDENCE.NAME_HEURISTIC };
  }

  // Hospital (broadest match — kept last)
  if (/\bhospital\b|\bmedical cent(re|er)\b|\bhealth (complex|campus)\b/.test(lower)) {
    return { providerType: PROVIDER_TYPES.HOSPITAL, confidence: CATEGORY_CONFIDENCE.GOOGLE_HOSPITAL_TYPE };
  }

  return { providerType: PROVIDER_TYPES.HOSPITAL, confidence: CATEGORY_CONFIDENCE.FALLBACK };
}

/**
 * Normalise a raw emergency_level string to a canonical EMERGENCY_LEVELS value.
 */
export function normaliseEmergencyLevel(raw = "") {
  const trimmed = (raw || "").trim();
  if (EMERGENCY_LEVEL_ALIASES[trimmed]) return EMERGENCY_LEVEL_ALIASES[trimmed];
  const lower = trimmed.toLowerCase();
  if (lower.includes("level 1") || lower.includes("er ") || lower === "er" || lower.includes("emergency dept")) return EMERGENCY_LEVELS.ER;
  if (lower.includes("level 2") || lower.includes("general")) return EMERGENCY_LEVELS.GENERAL_HOSPITAL;
  if (lower.includes("level 3") || lower.includes("specialist")) return EMERGENCY_LEVELS.SPECIALIST_HOSPITAL;
  if (lower.includes("urgent")) return EMERGENCY_LEVELS.URGENT_CARE;
  if (lower.includes("clinic")) return EMERGENCY_LEVELS.CLINIC;
  if (lower === "standard" || lower === "") return EMERGENCY_LEVELS.GENERAL_HOSPITAL;
  return EMERGENCY_LEVELS.UNKNOWN;
}

/**
 * Derive emergencyEligible from provider type + emergency level.
 * This is the authoritative rule — no other component should reimplement this.
 */
export function deriveEmergencyEligible(providerType, emergencyLevel) {
  if (providerType !== PROVIDER_TYPES.HOSPITAL) return false;
  return ER_ELIGIBLE_LEVELS.includes(emergencyLevel);
}

/**
 * Derive dispatchEligible from emergencyEligible + verificationStatus.
 */
export function deriveDispatchEligible(emergencyEligible, verificationStatus) {
  if (!emergencyEligible) return false;
  return DISPATCH_ELIGIBLE_STATUSES.includes(verificationStatus);
}
