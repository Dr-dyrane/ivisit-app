import { EMERGENCY_VISIT_LIFECYCLE } from "../../../../constants/visits";
import { database, StorageKeys } from "../../../../database";
import { paymentService } from "../../../../services/paymentService";
import { visitsService } from "../../../../services/visitsService";
import { classifyVisitSource } from "../../../../utils/scheduledVisitProjection";

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

const getTrackingRatingLifecycleState = (visit) =>
  String(visit?.lifecycleState ?? visit?.lifecycle_state ?? "")
    .trim()
    .toLowerCase();

const getTrackingRatingVisitStatus = (visit) =>
  String(visit?.status ?? "").trim().toLowerCase();

const hasPersistedTrackingRating = (visit) => {
  const ratedAt = visit?.ratedAt ?? visit?.rated_at;
  if (ratedAt !== null && ratedAt !== undefined && String(ratedAt).trim() !== "") {
    return true;
  }

  const rating = Number(visit?.rating);
  return Number.isFinite(rating) && rating > 0;
};

export function isTrackingRatingResolutionFinal(visit) {
  if (!visit || typeof visit !== "object") return false;
  if (hasPersistedTrackingRating(visit)) return true;

  const lifecycleState = getTrackingRatingLifecycleState(visit);
  return (
    lifecycleState === EMERGENCY_VISIT_LIFECYCLE.RATED ||
    lifecycleState === EMERGENCY_VISIT_LIFECYCLE.POST_COMPLETION ||
    lifecycleState === EMERGENCY_VISIT_LIFECYCLE.CLEARED ||
    lifecycleState === EMERGENCY_VISIT_LIFECYCLE.CANCELLED
  );
}

export function isTrackingRatingRecoveryEligible(visit) {
  if (!visit || typeof visit !== "object" || hasPersistedTrackingRating(visit)) {
    return false;
  }

  const lifecycleState = getTrackingRatingLifecycleState(visit);
  if (lifecycleState === EMERGENCY_VISIT_LIFECYCLE.RATING_PENDING) {
    return true;
  }

  const hasCanonicalCompletion =
    lifecycleState === EMERGENCY_VISIT_LIFECYCLE.COMPLETED ||
    (!lifecycleState && getTrackingRatingVisitStatus(visit) === "completed");

  return (
    hasCanonicalCompletion &&
    classifyVisitSource(visit) === "emergency"
  );
}

export const getTrackingRatingVisitKeys = (visit) =>
  [
    visit?.id,
    visit?.requestId,
    visit?.displayId,
    visit?.requestDisplayId,
  ]
    .filter((value) => value !== null && value !== undefined && String(value).trim() !== "")
    .map((value) => String(value));

export function shouldPresentTrackingRatingState(ratingState, visits) {
  if (!ratingState?.visible || !ratingState?.visitId) return false;
  if (!Array.isArray(visits) || visits.length === 0) return true;

  const visitId = String(ratingState.visitId);
  const matchingVisit = visits.find((visit) =>
    getTrackingRatingVisitKeys(visit).includes(visitId),
  );

  if (!matchingVisit) {
    // A just-completed trip can render before the invalidated visits query
    // includes its row. Hydration strips persisted visibility, so only an
    // explicit committed handoff may survive that short data lag.
    return ratingState.completionCommitted === true;
  }

  return (
    getTrackingRatingLifecycleState(matchingVisit) !==
      EMERGENCY_VISIT_LIFECYCLE.RATED &&
    !hasPersistedTrackingRating(matchingVisit)
  );
}

export function shouldPresentRecoveredTrackingRatingState(ratingState, visits) {
  if (!ratingState?.visible || !ratingState?.visitId) return false;
  if (!Array.isArray(visits) || visits.length === 0) return true;

  const visitId = String(ratingState.visitId);
  const matchingVisit = visits.find((visit) =>
    getTrackingRatingVisitKeys(visit).includes(visitId),
  );

  // Recovery may open before the refreshed Visit row reaches the client.
  // Once that row is present, canonical eligibility owns whether the modal
  // remains visible; post_completion/rated/cancelled rows must close it.
  return matchingVisit
    ? isTrackingRatingRecoveryEligible(matchingVisit)
    : true;
}

const getActiveTrackingRequestKeys = (activeMapRequest) =>
  [
    activeMapRequest?.id,
    activeMapRequest?.requestId,
    activeMapRequest?.displayId,
    activeMapRequest?.record?.id,
    activeMapRequest?.record?.requestId,
    activeMapRequest?.record?.displayId,
  ]
    .filter((value) => value !== null && value !== undefined && String(value).trim() !== "")
    .map((value) => String(value));

export function canPresentTrackingRatingWithActiveRequest(
  activeMapRequest,
  visit,
) {
  if (!activeMapRequest?.hasActiveRequest) return true;
  if (!activeMapRequest?.isTerminal || !visit) return false;

  // PULLBACK NOTE: responder-owned terminal handoff
  // OLD: every mounted terminal request blocked recovery, leaving server-completed
  // rides on the map without a rating path until a later manual refresh.
  // NEW: only the same terminal visit may hand off to recovered rating; an
  // in-flow rating state still wins in useMapHistoryFlow, preventing duplicates.
  const activeRequestKeys = getActiveTrackingRequestKeys(activeMapRequest);
  const visitKeys = getTrackingRatingVisitKeys(visit);
  return activeRequestKeys.some((key) => visitKeys.includes(key));
}

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
  // A populated claim list narrows recovery to an interrupted local handoff.
  // An empty list must remain unscoped: a fresh device has no local claim, so
  // canonical completed, unrated Visit truth is the only recovery authority.
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
      const visitKeys = getTrackingRatingVisitKeys(visit);
      const hasVisitKey = visitKeys.length > 0;
      const isExcluded = visitKeys.some((key) => excludedIds.has(key));
      const isAllowed = !allowedIds || visitKeys.some((key) => allowedIds.has(key));
      return (
        isTrackingRatingRecoveryEligible(visit) &&
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
  if (!visitId || !isTrackingRatingRecoveryEligible(visit)) return null;

  const kind = normalizeTrackingVisitKind(visit);
  const hospitalTitle =
    visit?.hospitalName ?? visit?.hospital ?? claim?.hospitalTitle ?? claim?.hospital ?? null;
  const providerName = kind === "ambulance"
    ? visit?.responderName ??
      visit?.responder_name ??
      claim?.providerName ??
      claim?.provider ??
      visit?.doctorName ??
      visit?.doctor ??
      null
    : visit?.doctorName ??
      visit?.doctor ??
      claim?.providerName ??
      claim?.provider ??
      null;

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
 * against the current visits array. Completed, unrated emergency visits remain
 * eligible because responder-owned completion is now canonical. Claims are
 * removed only after rating/skip/cancellation or when a completed visit is not
 * an emergency. This preserves reload recovery without reopening rated visits.
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
		EMERGENCY_VISIT_LIFECYCLE.RATING_PENDING,
		EMERGENCY_VISIT_LIFECYCLE.CLEARED,
		EMERGENCY_VISIT_LIFECYCLE.CANCELLED,
	]);

	const staleIds = claimIds.filter((claimId) => {
		const visit = visits.find((v) => {
			const keys = getTrackingRatingVisitKeys(v);
			return keys.includes(claimId);
		});
		if (!visit) return false;
		if (isTrackingRatingRecoveryEligible(visit)) return false;
		const state = getTrackingRatingLifecycleState(visit);
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
	deleteRecoveryClaim = deleteTrackingRatingRecoveryClaim,
}) {
	if (!visitId) {
		return { ok: true, kind: TRACKING_RATING_RESOLUTION_KINDS.MISSING_VISIT };
	}

	try {
		await visitsService.skipRating(visitId);
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
	deleteRecoveryClaim = deleteTrackingRatingRecoveryClaim,
	processTip = paymentService.processVisitTip,
}) {
	if (!visitId) {
		return { ok: false, kind: TRACKING_RATING_RESOLUTION_KINDS.MISSING_VISIT };
	}

	const nowIso = new Date().toISOString();

	// DOUBLE-RATING FIX (BUG-009/BUG-010): Optimistic pre-write before network call.
	//
	// OLD: deleteRecoveryClaim ran after the server write. If the app was killed between the
	//      network call and the claim delete, the claim survived to the next session.
	//      purgeStaleTrackingRatingClaims then found the visit still at RATING_PENDING
	//      (server write also failed), re-surfaced the modal, and the user had to rate
	//      twice (once per each failed/incomplete ride session).
	//
	// Layer 1 deletes the local recovery claim before the network call and restores
	// it on failure. Layer 2 is the server-owned rate_visit command, which validates
	// completion and makes duplicate submissions no-ops across devices.

	// Step 1: optimistic local claim delete (AsyncStorage)
	const claimDeleteError = await deleteRecoveryClaim(visitId).then(() => null).catch((e) => e);
	if (claimDeleteError) {
		console.warn("[resolveTrackingRatingSubmit] Optimistic claim delete failed (non-fatal):", claimDeleteError);
	}

	try {
		// Step 2: the idempotent server command owns rating and lifecycle truth.
		const ratingPayload = {
			rating,
			ratingComment: comment,
		};
		const { alreadyRated } = await visitsService.updateRating(visitId, ratingPayload);

		let tipError = null;
		if (!alreadyRated && Number(tipAmount) > 0) {
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
			alreadyRated,
		};
	} catch (error) {
		// Server write failed — restore the claim so the recovery system can re-surface
		// the modal in a future session and the user can retry without data loss.
		try {
			await writeTrackingRatingRecoveryClaim(visitId, {
				kind: "retry",
				failedAt: nowIso,
			});
		} catch (rollbackError) {
			console.warn("[resolveTrackingRatingSubmit] Claim rollback failed:", rollbackError);
		}
		return {
			ok: false,
			kind: TRACKING_RATING_RESOLUTION_KINDS.FAILED,
			error,
		};
	}
}
