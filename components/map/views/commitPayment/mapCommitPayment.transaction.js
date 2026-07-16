export const MAP_COMMIT_PAYMENT_TRANSACTION_STATES = Object.freeze({
	IDLE: "idle",
	WAITING_APPROVAL: "waiting_approval",
	PROCESSING_PAYMENT: "processing_payment",
	FINALIZING_DISPATCH: "finalizing_dispatch",
	// OTA1 E5 -- settlement wait timed out: money may have moved, dispatch is
	// unconfirmed. Dismissible, excluded from isSubmitting; background watch owns
	// the transition to DISPATCHED/PAYMENT_DECLINED once server truth lands.
	SETTLEMENT_PENDING: "settlement_pending",
	DISPATCHED: "dispatched",
	FAILED: "failed",
	PAYMENT_DECLINED: "payment_declined",
});

export const MAP_COMMIT_PAYMENT_METHOD_KINDS = Object.freeze({
	NONE: "none",
	CARD: "card",
	CASH: "cash",
	WALLET: "wallet",
});

const toIdentifier = (value) => {
	if (value == null) return null;
	const text = String(value).trim();
	return text || null;
};

export function createCommitPaymentSubmissionState(kind, meta = {}) {
	return {
		kind: kind || MAP_COMMIT_PAYMENT_TRANSACTION_STATES.IDLE,
		displayId: toIdentifier(meta.displayId),
		requestId: toIdentifier(meta.requestId),
	};
}

export function getCommitPaymentRequestIdentifiers(result, initiatedRequest) {
	const requestId = toIdentifier(
		result?.requestId || initiatedRequest?._realId || initiatedRequest?.requestId,
	);
	const displayId = toIdentifier(
		result?.displayId || initiatedRequest?._displayId || initiatedRequest?.requestId,
	);

	return { requestId, displayId };
}

export function getCommitPaymentMethodKind(paymentMethod) {
	if (!paymentMethod) return MAP_COMMIT_PAYMENT_METHOD_KINDS.NONE;
	if (paymentMethod.is_wallet === true) {
		return MAP_COMMIT_PAYMENT_METHOD_KINDS.WALLET;
	}
	if (paymentMethod.is_cash === true) {
		return MAP_COMMIT_PAYMENT_METHOD_KINDS.CASH;
	}
	return MAP_COMMIT_PAYMENT_METHOD_KINDS.CARD;
}

export function requiresSignedCardConfirmation(methodKind) {
	return methodKind === MAP_COMMIT_PAYMENT_METHOD_KINDS.CARD;
}

export function requiresWalletSettlement(methodKind) {
	return methodKind === MAP_COMMIT_PAYMENT_METHOD_KINDS.WALLET;
}

export function reconcileCanonicalPaymentTotal({
	quotedTotal,
	canonicalTotal,
	costSnapshot = null,
	currency = "USD",
} = {}) {
	const quoted = Number(quotedTotal);
	const canonical = Number(canonicalTotal);
	if (!Number.isFinite(canonical) || canonical < 0) {
		return {
			ok: false,
			code: "CANONICAL_TOTAL_UNAVAILABLE",
			hasMismatch: false,
			costSnapshot,
		};
	}

	const nextCostSnapshot = {
		...(costSnapshot && typeof costSnapshot === "object" ? costSnapshot : {}),
		totalCost: canonical,
		total_cost: canonical,
		currency: currency || costSnapshot?.currency || "USD",
	};
	const hasMismatch =
		Number.isFinite(quoted) && Math.abs(quoted - canonical) > 0.009;

	return {
		ok: !hasMismatch,
		code: hasMismatch ? "CANONICAL_TOTAL_CHANGED" : null,
		hasMismatch,
		quotedTotal: Number.isFinite(quoted) ? quoted : null,
		canonicalTotal: canonical,
		costSnapshot: nextCostSnapshot,
	};
}

export function createCanonicalPaymentRetry({
	userId,
	hospitalId,
	serviceType,
	methodKind,
	initiatedRequest,
	initiationResult,
	settlementCost,
} = {}) {
	const identifiers = getCommitPaymentRequestIdentifiers(
		initiationResult,
		initiatedRequest,
	);
	if (
		!identifiers.requestId ||
		!toIdentifier(userId) ||
		!toIdentifier(hospitalId) ||
		!toIdentifier(serviceType) ||
		!toIdentifier(methodKind)
	) {
		return null;
	}

	return {
		...identifiers,
		userId: toIdentifier(userId),
		hospitalId: toIdentifier(hospitalId),
		serviceType: toIdentifier(serviceType),
		methodKind: toIdentifier(methodKind),
		initiatedRequest,
		initiationResult,
		settlementCost,
	};
}

export function canResumeCanonicalPaymentRetry(retry, context = {}) {
	if (!retry?.requestId || !retry?.initiatedRequest || !retry?.initiationResult) {
		return false;
	}

	return (
		retry.userId === toIdentifier(context.userId) &&
		retry.hospitalId === toIdentifier(context.hospitalId) &&
		retry.serviceType === toIdentifier(context.serviceType) &&
		retry.methodKind === toIdentifier(context.methodKind)
	);
}

export function isCommitPaymentIdleState(submissionState) {
	return submissionState?.kind === MAP_COMMIT_PAYMENT_TRANSACTION_STATES.IDLE;
}

export function isCommitPaymentDismissibleState(submissionState, { isSubmitting = false } = {}) {
	const kind = submissionState?.kind;
	// PULLBACK NOTE: PT-C — WAITING_APPROVAL removed from dismissible states (defect PT-6, class 2.14)
	// OLD: WAITING_APPROVAL || DISPATCHED || (FINALIZING_DISPATCH && !isSubmitting)
	// NEW: WAITING_APPROVAL is a committed server action — non-dismissible, CTA must stay locked
	// PULLBACK NOTE: OTA1 E5 -- FINALIZING_DISPATCH && !isSubmitting was unreachable
	// (UX-D D-6 derives isSubmitting true for finalizing_dispatch); the reachable
	// dismissible timeout state is SETTLEMENT_PENDING.
	return (
		kind === MAP_COMMIT_PAYMENT_TRANSACTION_STATES.DISPATCHED ||
		kind === MAP_COMMIT_PAYMENT_TRANSACTION_STATES.SETTLEMENT_PENDING
	);
}

export function isCommitPaymentFailureState(submissionState) {
	const kind = submissionState?.kind;
	return (
		kind === MAP_COMMIT_PAYMENT_TRANSACTION_STATES.FAILED ||
		kind === MAP_COMMIT_PAYMENT_TRANSACTION_STATES.PAYMENT_DECLINED
	);
}

export function validateCommitPaymentSubmitContract({
	hospital,
	paymentMethodsSnapshotReady = false,
	isRefreshingPaymentMethods = false,
	selectedPaymentMethod = null,
	isCombinedFlow = false,
	paymentUnsupportedMessage = "Payment is not ready yet.",
	stripePaymentMethodId = null,
	totalCostValue = null,
	demoCashOnly = false,
}) {
	if (!hospital?.id) {
		return {
			ok: false,
			level: "error",
			message: "Choose a hospital before continuing.",
		};
	}

	if (!paymentMethodsSnapshotReady || isRefreshingPaymentMethods) {
		return {
			ok: false,
			level: "info",
			message: "Checking payment method.",
		};
	}

	if (!selectedPaymentMethod) {
		return {
			ok: false,
			level: "error",
			message: "Select a payment method.",
		};
	}

	if (isCombinedFlow) {
		return {
			ok: false,
			level: "info",
			message: paymentUnsupportedMessage,
		};
	}

	const methodKind = getCommitPaymentMethodKind(selectedPaymentMethod);

	if (demoCashOnly && methodKind !== MAP_COMMIT_PAYMENT_METHOD_KINDS.CASH) {
		return {
			ok: false,
			level: "error",
			message: "Demo checkout uses the cash approval flow.",
		};
	}

	if (methodKind === MAP_COMMIT_PAYMENT_METHOD_KINDS.CARD && !stripePaymentMethodId) {
		return {
			ok: false,
			level: "error",
			message: "Choose a saved card to continue.",
		};
	}

	if (
		(methodKind === MAP_COMMIT_PAYMENT_METHOD_KINDS.CARD ||
			methodKind === MAP_COMMIT_PAYMENT_METHOD_KINDS.WALLET) &&
		!Number.isFinite(totalCostValue)
	) {
		return {
			ok: false,
			level: "error",
			message: "Could not lock the payment total right now. Try again.",
		};
	}

	return {
		ok: true,
		level: "success",
		message: null,
		methodKind,
	};
}

export default {
	MAP_COMMIT_PAYMENT_TRANSACTION_STATES,
	MAP_COMMIT_PAYMENT_METHOD_KINDS,
	createCommitPaymentSubmissionState,
	getCommitPaymentRequestIdentifiers,
	getCommitPaymentMethodKind,
	requiresSignedCardConfirmation,
	requiresWalletSettlement,
	reconcileCanonicalPaymentTotal,
	createCanonicalPaymentRetry,
	canResumeCanonicalPaymentRetry,
	isCommitPaymentIdleState,
	isCommitPaymentDismissibleState,
	isCommitPaymentFailureState,
	validateCommitPaymentSubmitContract,
};
