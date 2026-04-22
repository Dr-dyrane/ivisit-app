import { EMERGENCY_VISIT_LIFECYCLE } from "../../../../constants/visits";
import { database, StorageKeys } from "../../../../database";
import { paymentService } from "../../../../services/paymentService";

export const TRACKING_RATING_RESOLUTION_KINDS = Object.freeze({
	MISSING_VISIT: "missing_visit",
	SKIPPED: "skipped",
	RATED: "rated",
	FAILED: "failed",
});

const normalizeTrackingRatingClaims = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};

export async function readTrackingRatingRecoveryClaims() {
  try {
    const stored = await database.read(StorageKeys.TRACKING_RATING_RECOVERY, {});
    return normalizeTrackingRatingClaims(stored);
  } catch (_error) {
    return {};
  }
}

export async function writeTrackingRatingRecoveryClaim(visitId, claim = {}) {
  if (!visitId) return {};
  const normalizedVisitId = String(visitId);
  const currentClaims = await readTrackingRatingRecoveryClaims();
  const nextClaims = {
    ...currentClaims,
    [normalizedVisitId]: {
      claimedAt: new Date().toISOString(),
      ...claim,
    },
  };
  await database.write(StorageKeys.TRACKING_RATING_RECOVERY, nextClaims);
  return nextClaims;
}

export async function deleteTrackingRatingRecoveryClaim(visitId) {
  if (!visitId) return {};
  const normalizedVisitId = String(visitId);
  const currentClaims = await readTrackingRatingRecoveryClaims();
  if (!currentClaims[normalizedVisitId]) return currentClaims;
  const nextClaims = { ...currentClaims };
  delete nextClaims[normalizedVisitId];
  await database.write(StorageKeys.TRACKING_RATING_RECOVERY, nextClaims);
  return nextClaims;
}

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

export function findPendingTrackingRatingVisit(
  visits,
  { excludeVisitIds = [], allowedVisitIds = null } = {},
) {
  if (!Array.isArray(visits) || visits.length === 0) return null;

  const excludedIds = new Set(
    excludeVisitIds
      .filter((value) => value !== null && value !== undefined && String(value).trim() !== "")
      .map((value) => String(value)),
  );
  const allowedIds =
    Array.isArray(allowedVisitIds) && allowedVisitIds.length > 0
      ? new Set(
          allowedVisitIds
            .filter(
              (value) => value !== null && value !== undefined && String(value).trim() !== "",
            )
            .map((value) => String(value)),
        )
      : null;

  return [...visits]
    .filter((visit) => {
      const lifecycleState = String(visit?.lifecycleState ?? "").toLowerCase();
      const visitId = visit?.id ?? visit?.requestId ?? null;
      return (
        lifecycleState === EMERGENCY_VISIT_LIFECYCLE.RATING_PENDING &&
        !!visitId &&
        !excludedIds.has(String(visitId)) &&
        (!allowedIds || allowedIds.has(String(visitId)))
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

export function buildRecoveredTrackingRatingState(visit, claim = null) {
  const visitId = visit?.id ?? visit?.requestId ?? null;
  if (!visitId) return null;

  const kind = normalizeTrackingVisitKind(visit);
  const hospitalTitle =
    visit?.hospitalName ?? visit?.hospital ?? claim?.hospitalTitle ?? claim?.hospital ?? null;
  const providerName =
    visit?.doctorName ?? visit?.doctor ?? claim?.providerName ?? claim?.provider ?? null;

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

export async function resolveTrackingRatingSkip({
	visitId,
	updateVisit,
	deleteRecoveryClaim = deleteTrackingRatingRecoveryClaim,
}) {
	if (!visitId) {
		return { ok: true, kind: TRACKING_RATING_RESOLUTION_KINDS.MISSING_VISIT };
	}

	try {
		await updateVisit?.(visitId, {
			lifecycleState: EMERGENCY_VISIT_LIFECYCLE.POST_COMPLETION,
			lifecycleUpdatedAt: new Date().toISOString(),
		});
		await deleteRecoveryClaim(visitId);
		return { ok: true, kind: TRACKING_RATING_RESOLUTION_KINDS.SKIPPED };
	} catch (error) {
		return {
			ok: false,
			kind: TRACKING_RATING_RESOLUTION_KINDS.FAILED,
			error,
		};
	}
}

export async function resolveTrackingRatingSubmit({
	visitId,
	rating,
	comment,
	tipAmount,
	tipCurrency,
	updateVisit,
	deleteRecoveryClaim = deleteTrackingRatingRecoveryClaim,
	processTip = paymentService.processVisitTip,
}) {
	if (!visitId) {
		return { ok: false, kind: TRACKING_RATING_RESOLUTION_KINDS.MISSING_VISIT };
	}

	const nowIso = new Date().toISOString();
	try {
		await updateVisit?.(visitId, {
			rating,
			ratingComment: comment,
			ratedAt: nowIso,
			lifecycleState: EMERGENCY_VISIT_LIFECYCLE.RATED,
			lifecycleUpdatedAt: nowIso,
		});
		await deleteRecoveryClaim(visitId);

		let tipError = null;
		if (Number(tipAmount) > 0) {
			try {
				await processTip(visitId, Number(tipAmount), tipCurrency || "USD");
			} catch (error) {
				tipError = error;
			}
		}

		return {
			ok: true,
			kind: TRACKING_RATING_RESOLUTION_KINDS.RATED,
			tipError,
		};
	} catch (error) {
		return {
			ok: false,
			kind: TRACKING_RATING_RESOLUTION_KINDS.FAILED,
			error,
		};
	}
}
