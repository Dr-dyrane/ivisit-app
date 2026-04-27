export const MAP_COMMIT_PAYMENT_TRANSACTION_STATES = Object.freeze({
	IDLE: "idle",
	WAITING_APPROVAL: "waiting_approval",
	PROCESSING_PAYMENT: "processing_payment",
	FINALIZING_DISPATCH: "finalizing_dispatch",
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

export function isCommitPaymentIdleState(submissionState) {
	return submissionState?.kind === MAP_COMMIT_PAYMENT_TRANSACTION_STATES.IDLE;
}

export function isCommitPaymentDismissibleState(submissionState, { isSubmitting = false } = {}) {
	const kind = submissionState?.kind;
	// PULLBACK NOTE: PT-C — WAITING_APPROVAL removed from dismissible states (defect PT-6, class 2.14)
	// OLD: WAITING_APPROVAL || DISPATCHED || (FINALIZING_DISPATCH && !isSubmitting)
	// NEW: WAITING_APPROVAL is a committed server action — non-dismissible, CTA must stay locked
	return (
		kind === MAP_COMMIT_PAYMENT_TRANSACTION_STATES.DISPATCHED ||
		(kind === MAP_COMMIT_PAYMENT_TRANSACTION_STATES.FINALIZING_DISPATCH && !isSubmitting)
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

	if (methodKind === MAP_COMMIT_PAYMENT_METHOD_KINDS.WALLET) {
		return {
			ok: false,
			level: "error",
			message: "Choose card or cash for this request.",
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
		methodKind === MAP_COMMIT_PAYMENT_METHOD_KINDS.CARD &&
		!Number.isFinite(totalCostValue)
	) {
		return {
			ok: false,
			level: "error",
			message: "Could not lock the card total right now. Try again.",
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
	isCommitPaymentIdleState,
	isCommitPaymentDismissibleState,
	isCommitPaymentFailureState,
	validateCommitPaymentSubmitContract,
};
