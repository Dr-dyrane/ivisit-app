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

export const getTrackingRatingVisitKeys = (visit) =>
  [
    visit?.id,
    visit?.requestId,
    visit?.displayId,
    visit?.requestDisplayId,
  ]
    .filter((value) => value !== null && value !== undefined && String(value).trim() !== "")
    .map((value) => String(value));

export function getTrackingRatingRecoveryClaim(visit, claims) {
  const normalizedClaims = normalizeTrackingRatingClaims(claims);
  const keys = getTrackingRatingVisitKeys(visit);
  for (const key of keys) {
    if (normalizedClaims[key]) return normalizedClaims[key];
  }
  return null;
}

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
      const visitKeys = getTrackingRatingVisitKeys(visit);
      const hasVisitKey = visitKeys.length > 0;
      const isExcluded = visitKeys.some((key) => excludedIds.has(key));
      const isAllowed = !allowedIds || visitKeys.some((key) => allowedIds.has(key));
      return (
        lifecycleState === EMERGENCY_VISIT_LIFECYCLE.RATING_PENDING &&
        hasVisitKey &&
        !isExcluded &&
        isAllowed
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

export function buildTrackingResolutionToast({
	action = "rated",
	serviceType = "visit",
	hospitalTitle = null,
	tipAmount = 0,
	tipError = null,
}) {
	const normalizedServiceType = String(serviceType || "visit").toLowerCase();
	const subject =
		normalizedServiceType === "ambulance"
			? "Transport"
			: normalizedServiceType === "bed"
				? "Stay"
				: "Visit";
	const locationSuffix = hospitalTitle ? ` for ${hospitalTitle}` : "";

	if (action === "skipped") {
		return {
			message: `${subject} completed${locationSuffix}.`,
			level: "info",
		};
	}

	if (tipError && Number(tipAmount) > 0) {
		return {
			message: `${subject} feedback saved${locationSuffix}. Tip still needs attention.`,
			level: "warning",
		};
	}

	if (Number(tipAmount) > 0) {
		return {
			message: `${subject} feedback saved${locationSuffix}. Tip added.`,
			level: "success",
		};
	}

	return {
		message: `${subject} feedback saved${locationSuffix}.`,
		level: "success",
	};
}

/**
 * purgeStaleTrackingRatingClaims
 *
 * 5th layer (Supabase truth) — cross-checks every persisted recovery claim
 * against the current visits array. Removes any claim whose visit lifecycle is
 * no longer RATING_PENDING (already RATED, POST_COMPLETION, COMPLETED, or
 * CANCELLED). Should be called once after visits load to flush accumulated
 * stale claims from previous sessions where rating was submitted but the
 * deleteRecoveryClaim write was lost (app kill, network error, etc).
 *
 * @param {Array} visits - normalized visit objects from useVisits()
 * @returns {Promise<Object>} remaining claims after purge
 */
export async function purgeStaleTrackingRatingClaims(visits) {
	if (!Array.isArray(visits) || visits.length === 0) return {};
	const currentClaims = await readTrackingRatingRecoveryClaims();
	const claimIds = Object.keys(currentClaims);
	if (claimIds.length === 0) return {};

	const terminalStates = new Set([
		EMERGENCY_VISIT_LIFECYCLE.RATED,
		EMERGENCY_VISIT_LIFECYCLE.POST_COMPLETION,
		EMERGENCY_VISIT_LIFECYCLE.COMPLETED,
		EMERGENCY_VISIT_LIFECYCLE.CLEARED,
		EMERGENCY_VISIT_LIFECYCLE.CANCELLED,
	]);

	const staleIds = claimIds.filter((claimId) => {
		const visit = visits.find((v) => {
			const keys = getTrackingRatingVisitKeys(v);
			return keys.includes(claimId);
		});
		if (!visit) return false;
		const state = String(visit?.lifecycleState ?? "").toLowerCase();
		return terminalStates.has(state);
	});

	if (staleIds.length === 0) return currentClaims;

	const nextClaims = { ...currentClaims };
	staleIds.forEach((id) => delete nextClaims[id]);
	try {
		await database.write(StorageKeys.TRACKING_RATING_RECOVERY, nextClaims);
	} catch (_error) {
		// Non-fatal — stale claims are harmless, they just won't surface a modal
	}
	return nextClaims;
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
