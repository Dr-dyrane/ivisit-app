import { EMERGENCY_VISIT_LIFECYCLE } from "../../../../constants/visits";

export function buildTrackingRatingState({
  kind,
  visitId,
  hospitalTitle,
  providerName,
  completionCommitted = false,
}) {
  if (!visitId) return null;

  if (kind === "bed") {
    return {
      visible: true,
      visitId,
      completeKind: "bed",
      completionCommitted,
      serviceType: "bed",
      title: "Rate your stay",
      subtitle: hospitalTitle ? `For ${hospitalTitle}` : null,
      serviceDetails: {
        hospital: hospitalTitle || null,
        provider: providerName || "Hospital staff",
      },
    };
  }

  return {
    visible: true,
    visitId,
    completeKind: "ambulance",
    completionCommitted,
    serviceType: "ambulance",
    title: "Rate your transport",
    subtitle: hospitalTitle ? `For ${hospitalTitle}` : null,
    serviceDetails: {
      hospital: hospitalTitle || null,
      provider: providerName || "Emergency services",
    },
  };
}

const parseTimestampMs = (value) => {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeTrackingVisitKind = (visit) => {
  const rawKind = String(visit?.type ?? visit?.serviceType ?? "").toLowerCase();
  if (rawKind.includes("bed")) return "bed";
  if (rawKind.includes("ambulance")) return "ambulance";
  return null;
};

export function findPendingTrackingRatingVisit(visits, { excludeVisitIds = [] } = {}) {
  if (!Array.isArray(visits) || visits.length === 0) return null;

  const excludedIds = new Set(
    excludeVisitIds
      .filter((value) => value !== null && value !== undefined && String(value).trim() !== "")
      .map((value) => String(value)),
  );

  return [...visits]
    .filter((visit) => {
      const lifecycleState = String(visit?.lifecycleState ?? "").toLowerCase();
      const visitId = visit?.id ?? visit?.requestId ?? null;
      return (
        lifecycleState === EMERGENCY_VISIT_LIFECYCLE.RATING_PENDING &&
        !!visitId &&
        !excludedIds.has(String(visitId))
      );
    })
    .sort((left, right) => {
      const leftTs = Math.max(
        parseTimestampMs(left?.lifecycleUpdatedAt),
        parseTimestampMs(left?.updatedAt),
        parseTimestampMs(left?.createdAt),
      );
      const rightTs = Math.max(
        parseTimestampMs(right?.lifecycleUpdatedAt),
        parseTimestampMs(right?.updatedAt),
        parseTimestampMs(right?.createdAt),
      );
      return rightTs - leftTs;
    })[0] ?? null;
}

export function buildRecoveredTrackingRatingState(visit) {
  const visitId = visit?.id ?? visit?.requestId ?? null;
  if (!visitId) return null;

  const kind = normalizeTrackingVisitKind(visit);
  const hospitalTitle = visit?.hospitalName ?? visit?.hospital ?? null;
  const providerName = visit?.doctorName ?? visit?.doctor ?? null;

  if (kind === "ambulance" || kind === "bed") {
    return buildTrackingRatingState({
      kind,
      visitId,
      hospitalTitle,
      providerName,
      completionCommitted: true,
    });
  }

  return {
    visible: true,
    visitId,
    completeKind: null,
    completionCommitted: true,
    serviceType: "visit",
    title: "Rate your visit",
    subtitle: hospitalTitle ? `For ${hospitalTitle}` : null,
    serviceDetails: {
      hospital: hospitalTitle || null,
      provider: providerName || "Care team",
    },
  };
}
