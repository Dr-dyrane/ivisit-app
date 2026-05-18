// ─── EXP-2: Provider Taxonomy (inline mirror of constants/providerTypes.js) ────
// Deno edge functions cannot import from app constants — taxonomy is duplicated here.
// Source of truth for rules is constants/providerTypes.js in the app repo.

export const PROVIDER_TYPES = {
  HOSPITAL: "hospital",
  PHARMACY: "pharmacy",
  LAB: "lab",
  RADIOLOGY: "radiology",
  URGENT_CARE: "urgent_care",
  CLINIC: "clinic",
  MENTAL_HEALTH: "mental_health",
  WOMENS_CARE: "womens_care",
  PEDIATRICS: "pediatrics",
} as const;

export type ProviderType = typeof PROVIDER_TYPES[keyof typeof PROVIDER_TYPES];

const EMERGENCY_LEVELS = {
  ER: "er",
  GENERAL_HOSPITAL: "general_hospital",
  SPECIALIST_HOSPITAL: "specialist_hospital",
  CLINIC: "clinic",
  URGENT_CARE: "urgent_care",
  UNKNOWN: "unknown",
} as const;

const ER_ELIGIBLE_LEVELS = [EMERGENCY_LEVELS.ER, EMERGENCY_LEVELS.GENERAL_HOSPITAL] as const;

// Google Places types → provider type
export const GOOGLE_TYPE_TO_PROVIDER: Record<string, ProviderType> = {
  hospital: PROVIDER_TYPES.HOSPITAL,
  pharmacy: PROVIDER_TYPES.PHARMACY,
  drugstore: PROVIDER_TYPES.PHARMACY,
  medical_lab: PROVIDER_TYPES.LAB,
  doctor: PROVIDER_TYPES.CLINIC,
};

// Provider category → Google Places includedType(s)
export const CATEGORY_TO_GOOGLE_TYPES: Record<string, string[]> = {
  hospital: ["hospital"],
  pharmacy: ["pharmacy", "drugstore"],
  lab: ["medical_lab"],
  radiology: ["doctor", "hospital"],
  urgent_care: ["doctor", "hospital"],
  clinic: ["doctor", "hospital"],
  mental_health: ["doctor", "wellness_center"],
  womens_care: ["doctor", "hospital"],
  pediatrics: ["doctor", "hospital"],
};

// PULLBACK NOTE: EXPLORE-CARE-GAP-4 — Granular Google Places query strings for sponsor-backed search
// OLD: Single keyword per category via EXPLORE_CATEGORY_META_KEYWORDS
// NEW: Multiple query strings per category for granular search when Google API quota available
// Usage: When sponsors provide Google Places API quota, iterate through these queries
// to get comprehensive results for each provider category.
export const CATEGORY_TO_GOOGLE_QUERIES: Record<string, string[]> = {
  hospital: ["hospital", "medical center", "emergency room"],
  pharmacy: ["pharmacy", "drugstore", "chemist"],
  lab: ["medical laboratory", "diagnostic lab", "pathology lab", "blood test lab"],
  radiology: ["radiology center", "diagnostic imaging", "x ray", "MRI", "ultrasound"],
  urgent_care: ["urgent care", "walk in clinic", "emergency clinic"],
  clinic: ["medical clinic", "health clinic", "polyclinic"],
  mental_health: ["psychiatrist", "psychologist", "mental health clinic", "therapy clinic"],
  womens_care: ["gynecologist", "obgyn", "women's health clinic", "maternity clinic"],
  pediatrics: ["pediatrician", "children clinic", "pediatric hospital"],
};

const COUNTRY_CATEGORY_QUERY_EXPANSIONS: Record<string, Record<string, string[]>> = {
  AE: {
    urgent_care: ["emergency"],
  },
  BR: {
    radiology: ["radiologia"],
    urgent_care: ["pronto atendimento"],
    womens_care: ["ginecologista"],
  },
  JP: {
    radiology: ["MRI"],
    urgent_care: ["emergency outpatient"],
  },
  KE: {
    urgent_care: ["emergency"],
  },
};

export const getGoogleQueriesForCategory = (
  providerCategory: string,
  countryCode = "",
): string[] => {
  const baseQueries = CATEGORY_TO_GOOGLE_QUERIES[providerCategory] ?? ["hospital"];
  const countryQueries =
    COUNTRY_CATEGORY_QUERY_EXPANSIONS[countryCode.toUpperCase()]?.[providerCategory] ?? [];

  if (countryQueries.length > 0) return [...new Set(countryQueries)];
  return baseQueries;
};

export const GOOGLE_TEXT_SEARCH_FIRST_CATEGORIES = new Set<string>([
  PROVIDER_TYPES.LAB,
  PROVIDER_TYPES.RADIOLOGY,
  PROVIDER_TYPES.URGENT_CARE,
  PROVIDER_TYPES.CLINIC,
  PROVIDER_TYPES.MENTAL_HEALTH,
  PROVIDER_TYPES.WOMENS_CARE,
  PROVIDER_TYPES.PEDIATRICS,
]);

export const CATEGORY_RESULT_KEYWORD_GUARDS: Record<string, RegExp> = {
  lab:
    /\blab(orator(y|ies))?\b|\bdiagnostic\b|\bpatholog[yi]\b|\bblood\b|\btesting\b|\bdna\b|\bquest\b|\blabcorp\b/i,
  radiology:
    /\bradio[l]?og[yi]\b|\bdiagnostic\b|\bimaging\b|\bx-?ray\b|\bmri\b|\bultrasound\b|\bsonogram\b|\bsono\b|\bct scan\b|\bmammograph[yi]\b|\bradiologia\b|\bdiagnostico por imagem\b/i,
  urgent_care:
    /\burgent care\b|\bwalk.?in\b|\bimmediate care\b|\bexpress care\b|\bemergency\b|\baccident\b|\bemergency outpatient\b|\bafter hours clinic\b|\bpronto atendimento\b|\bpronto socorro\b|\burg(e|\u00EA)ncia\b|\bemerg(e|\u00EA)ncia\b/i,
  clinic:
    /\bclinic\b|\bmedical\b|\bhealth\b|\bdoctor\b|\bphysician\b|\bfamily practice\b|\bprimary care\b|\bpolyclinic\b|\bhospital\b|\bhealthcare\b/i,
  mental_health:
    /\bmental health\b|\bbehavioral\b|\bpsychiat(ry|rist|ric)\b|\bpsycholog(ist|y)\b|\btherapy\b|\btherapist\b|\bcounsel(l?ing|or)\b|\baddiction\b|\brecovery\b/i,
  womens_care:
    /\bwomen['?]?s\b|\bob[ -]?gyn\b|\bobstetric|\bgyneco?log|\bmaternity\b|\bprenatal\b|\bpregnancy\b|\bfertility\b|\bginecologista\b|\bobstetricia\b|\bsaude da mulher\b|\bmaternidade\b/i,
  pediatrics:
    /\bpediatric(s|ian)?\b|\bpaediatric(s|ian)?\b|\bchildren'?s\b|\bchild\b|\bkids?\b|\bbaby\b/i,
};

export const NON_DENTAL_PROVIDER_NOISE_GUARD =
  /\bdent(al|ist|istry)\b|\borthodont(ic|ics|ist)\b|\bsmiles?\b/i;

// Provider category → primary search keyword for Mapbox text fallback
export const EXPLORE_CATEGORY_META_KEYWORDS: Record<string, string> = {
  hospital: "hospital",
  pharmacy: "pharmacy",
  lab: "laboratory diagnostic",
  radiology: "radiology imaging",
  urgent_care: "urgent care",
  clinic: "clinic",
  mental_health: "mental health",
  womens_care: "women health",
  pediatrics: "pediatric children",
};

// Provider category → Mapbox SearchBox category string.
// PULLBACK NOTE: FIX-MAPBOX — only hospital + pharmacy have a specific Mapbox category.
// OLD: all non-hospital/pharmacy types mapped to generic "medical" category endpoint,
//      which returns an undifferentiated mix (labs, clinics, pharmacies all mixed).
// NEW: categories without a specific Mapbox category are excluded from the category endpoint
//      and resolved via keyword text search instead (EXPLORE_CATEGORY_META_KEYWORDS).
export const CATEGORY_TO_MAPBOX_CATEGORY: Record<string, string | null> = {
  hospital: "hospital",
  pharmacy: "pharmacy",
  lab: null,           // no specific Mapbox category — use keyword fallback
  radiology: null,     // no specific Mapbox category — use keyword fallback
  urgent_care: null,   // no specific Mapbox category — use keyword fallback
  clinic: null,        // no specific Mapbox category — use keyword fallback
  mental_health: null, // no specific Mapbox category — use keyword fallback
  womens_care: null,   // no specific Mapbox category — use keyword fallback
  pediatrics: null,    // no specific Mapbox category — use keyword fallback
};

/**
 * Classify a place name into a provider type using keyword heuristics.
 * Returns { providerType, confidence }
 */
export const classifyProviderByName = (name = ""): { providerType: ProviderType; confidence: number } => {
  const lower = (name || "").toLowerCase();

  if (/\bpharmac[yi]\b|\bchemist\b|\bdrugstore\b/.test(lower) && !/\bhospital\b/.test(lower)) {
    return { providerType: PROVIDER_TYPES.PHARMACY, confidence: 0.50 };
  }
  if (/\blab(oratory)?\b|\bdiagnostic\b|\bpatholog[yi]\b/.test(lower)) {
    return { providerType: PROVIDER_TYPES.LAB, confidence: 0.50 };
  }
  if (/\bradio[l]?og[yi]\b|\bx-?ray\b|\bmri\b|\bimaging\b|\bultrasound\b|\bradiologia\b|\bdiagnostico por imagem\b/.test(lower)) {
    return { providerType: PROVIDER_TYPES.RADIOLOGY, confidence: 0.50 };
  }
  if (/\bpsychiat[ry]\b|\bmental health\b|\btherapy\b|\bcounsel(l?ing)?\b/.test(lower)) {
    return { providerType: PROVIDER_TYPES.MENTAL_HEALTH, confidence: 0.50 };
  }
  if (/\bgynaeco?log[yi]\b|\bobstetric\b|\bmaternit[yi]\b|\bwomen['?]?.?s\b|\bwomen.?s health\b|\bginecologista\b|\bobstetricia\b|\bsaude da mulher\b|\bmaternidade\b/.test(lower)) {
    return { providerType: PROVIDER_TYPES.WOMENS_CARE, confidence: 0.50 };
  }
  if (/\bpaediatric\b|\bpediatric\b|\bchildren.?s\b|\bchild health\b/.test(lower)) {
    return { providerType: PROVIDER_TYPES.PEDIATRICS, confidence: 0.50 };
  }
  if (/\burgent care\b|\bwalk.?in\b|\bemergency\b|\baccident\b|\bemergency outpatient\b|\bafter hours clinic\b|\bpronto atendimento\b|\bpronto socorro\b|\burg(e|\u00EA)ncia\b|\bemerg(e|\u00EA)ncia\b/.test(lower)) {
    return { providerType: PROVIDER_TYPES.URGENT_CARE, confidence: 0.50 };
  }
  if (/\bclinic\b|\bpolyclinic\b|\bhealth cent(re|er)\b/.test(lower) && !/\bhospital\b/.test(lower)) {
    return { providerType: PROVIDER_TYPES.CLINIC, confidence: 0.50 };
  }
  if (/\bhospital\b|\bmedical cent(re|er)\b|\bhealth (complex|campus)\b/.test(lower)) {
    return { providerType: PROVIDER_TYPES.HOSPITAL, confidence: 0.75 };
  }

  return { providerType: PROVIDER_TYPES.HOSPITAL, confidence: 0.30 };
};

/**
 * Derive emergency_eligible from provider_type + emergency_level.
 * This is the single authoritative rule — downstream consumers must not reimplement it.
 */
export const deriveEmergencyEligible = (providerType: string, emergencyLevel: string): boolean => {
  if (providerType !== PROVIDER_TYPES.HOSPITAL) return false;
  return (ER_ELIGIBLE_LEVELS as readonly string[]).includes(emergencyLevel);
};

/**
 * Normalise a raw emergency_level string to a canonical value.
 */
export const normaliseEmergencyLevel = (raw = ""): string => {
  const lower = (raw || "").toLowerCase().trim();
  if (lower.includes("level 1") || lower === "er" || lower.includes("emergency dept")) return EMERGENCY_LEVELS.ER;
  if (lower.includes("level 2") || lower.includes("general") || lower === "standard" || lower === "") return EMERGENCY_LEVELS.GENERAL_HOSPITAL;
  if (lower.includes("level 3") || lower.includes("specialist")) return EMERGENCY_LEVELS.SPECIALIST_HOSPITAL;
  if (lower.includes("urgent")) return EMERGENCY_LEVELS.URGENT_CARE;
  if (lower.includes("clinic")) return EMERGENCY_LEVELS.CLINIC;
  return EMERGENCY_LEVELS.UNKNOWN;
};
// ─────────────────────────────────────────────────────────────────────────────
