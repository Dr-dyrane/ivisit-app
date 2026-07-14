import { supabase } from "./supabase";
import { isValidUUID } from "./displayIdService";
import { withRetry, withTimeout } from "./supabaseHelpers";
import {
  isScheduledVisitRow,
  normalizeAvailabilitySlot,
  normalizeScheduledVisitProjection,
  toValidIsoString,
} from "../utils/scheduledVisitProjection";
import {
  readOptInReleaseFlag,
  readPromotedReleaseFlag,
} from "../utils/releaseFlag";

export const scheduledVisitReleaseGates = Object.freeze({
  scheduledVisits: readPromotedReleaseFlag(
    process.env.EXPO_PUBLIC_ENABLE_SCHEDULED_VISITS_V1,
  ),
  asyncConsult: readPromotedReleaseFlag(
    process.env.EXPO_PUBLIC_ENABLE_ASYNC_CONSULT_V1,
  ),
  asyncConsultMedia: readOptInReleaseFlag(
    process.env.EXPO_PUBLIC_ENABLE_ASYNC_CONSULT_MEDIA_V1,
  ),
  consultAiDraft: readPromotedReleaseFlag(
    process.env.EXPO_PUBLIC_ENABLE_CONSULT_AI_DRAFT_V1,
  ),
});

const ERROR_RULES = [
  ["timezone_unconfirmed", /timezone.+(unconfirmed|not confirmed)|scheduling is not ready/i],
  ["idempotency_mismatch", /idempotency key.+another/i],
  ["slot_unavailable", /no clinician.+available|facility.+not available|slot.+available/i],
  ["overlap", /already has.+scheduled visit|overlap/i],
  ["policy_window", /hours before|policy|between 5 minutes and 90 days/i],
  ["illegal_transition", /cannot.+status|invalid transition|valid visit_id and action/i],
  ["authorization_denied", /unauthorized|outside actor scope|permission|denied/i],
  ["not_found", /not found/i],
  ["invalid_input", /required|unsupported|invalid|cannot exceed/i],
];

const USER_MESSAGES = {
  timezone_unconfirmed: "Facility scheduling is not ready yet.",
  idempotency_mismatch: "This booking changed. Review it before trying again.",
  slot_unavailable: "That time is no longer available.",
  overlap: "This time overlaps another scheduled visit.",
  policy_window: "This change is outside the allowed scheduling window.",
  illegal_transition: "This visit can no longer be changed that way.",
  authorization_denied: "You do not have access to this scheduled visit.",
  not_found: "This scheduled visit is no longer available.",
  invalid_input: "Review the visit details and try again.",
  feature_unavailable: "Scheduled booking is temporarily unavailable.",
  network_error: "Check your connection and try again.",
  unknown: "Scheduled care is temporarily unavailable.",
};

export class ScheduledVisitContractError extends Error {
  constructor(code, message, cause = null) {
    super(message || USER_MESSAGES[code] || USER_MESSAGES.unknown);
    this.name = "ScheduledVisitContractError";
    this.code = code || "unknown";
    this.cause = cause || null;
    this.retryable = ![
      "authorization_denied",
      "illegal_transition",
      "policy_window",
      "invalid_input",
    ].includes(this.code);
  }
}

export const normalizeScheduledVisitError = (error) => {
  if (error instanceof ScheduledVisitContractError) return error;
  const source = [error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(" ");
  const status = Number(error?.status || error?.code);
  const isNetworkError =
    error?.name === "AbortError" ||
    /network|fetch failed|timed out|timeout/i.test(source);
  const code = isNetworkError
    ? "network_error"
    : ERROR_RULES.find(([, pattern]) => pattern.test(source))?.[0] ||
      (status === 401 || status === 403 ? "authorization_denied" : "unknown");
  return new ScheduledVisitContractError(code, USER_MESSAGES[code], error);
};

const requireScheduledGate = () => {
  if (!scheduledVisitReleaseGates.scheduledVisits) {
    throw new ScheduledVisitContractError(
      "feature_unavailable",
      USER_MESSAGES.feature_unavailable,
    );
  }
};

const requireUuid = (value, label) => {
  if (!value || !isValidUUID(String(value))) {
    throw new ScheduledVisitContractError(
      "invalid_input",
      `${label} is required.`,
    );
  }
  return String(value);
};

const requireTimezoneConfirmation = (value) => {
  const confirmedAt = toValidIsoString(value);
  if (!confirmedAt) {
    throw new ScheduledVisitContractError(
      "timezone_unconfirmed",
      USER_MESSAGES.timezone_unconfirmed,
    );
  }
  return confirmedAt;
};

export const scheduledVisitsService = {
  async getAvailability({
    hospitalId,
    specialty,
    careMode,
    fromAt,
    toAt,
    timezoneConfirmedAt,
  }) {
    requireScheduledGate();
    requireUuid(hospitalId, "Facility");
    requireTimezoneConfirmation(timezoneConfirmedAt);

    try {
      const { data, error } = await withRetry(
        () =>
          withTimeout(
            supabase.rpc("get_book_visit_availability", {
              p_hospital_id: hospitalId,
              p_specialty: String(specialty || "").trim(),
              p_care_mode: String(careMode || "").trim(),
              p_from_at: toValidIsoString(fromAt),
              p_to_at: toValidIsoString(toAt),
            }),
            12000,
            "Availability request timed out",
          ),
        { maxRetries: 2 },
      );
      if (error) throw error;
      return (Array.isArray(data) ? data : [])
        .map(normalizeAvailabilitySlot)
        .filter(Boolean);
    } catch (error) {
      throw normalizeScheduledVisitError(error);
    }
  },

  async book({
    hospitalId,
    specialty,
    careMode,
    scheduledStartAt,
    idempotencyKey,
    notes,
    timezoneConfirmedAt,
  }) {
    requireScheduledGate();
    requireUuid(hospitalId, "Facility");
    requireUuid(idempotencyKey, "Booking intent");
    requireTimezoneConfirmation(timezoneConfirmedAt);

    try {
      const { data, error } = await withTimeout(
        supabase.rpc("book_scheduled_visit", {
          p_hospital_id: hospitalId,
          p_specialty: String(specialty || "").trim(),
          p_care_mode: String(careMode || "").trim(),
          p_scheduled_start_at: toValidIsoString(scheduledStartAt),
          p_idempotency_key: idempotencyKey,
          p_notes: String(notes || "").trim() || null,
        }),
        15000,
        "Booking request timed out",
      );
      if (error) throw error;
      if (!data || typeof data !== "object" || !isScheduledVisitRow(data)) {
        throw new ScheduledVisitContractError(
          "unknown",
          "The booking response was incomplete.",
        );
      }
      return normalizeScheduledVisitProjection(data, {
        ...data,
        idempotent: data.idempotent === true,
      });
    } catch (error) {
      throw normalizeScheduledVisitError(error);
    }
  },

  async transition({ visitId, action, scheduledStartAt = null, reason = null }) {
    requireScheduledGate();
    requireUuid(visitId, "Visit");

    try {
      const { data, error } = await withTimeout(
        supabase.rpc("transition_scheduled_visit", {
          p_visit_id: visitId,
          p_action: String(action || "").trim(),
          p_scheduled_start_at: toValidIsoString(scheduledStartAt),
          p_reason: String(reason || "").trim() || null,
        }),
        15000,
        "Visit update timed out",
      );
      if (error) throw error;
      if (!data || typeof data !== "object") {
        throw new ScheduledVisitContractError(
          "unknown",
          "The visit update response was incomplete.",
        );
      }
      return normalizeScheduledVisitProjection(data, data);
    } catch (error) {
      throw normalizeScheduledVisitError(error);
    }
  },
};

export default scheduledVisitsService;
