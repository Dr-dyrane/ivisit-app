import { MAP_COMMIT_PAYMENT_TRANSACTION_STATES } from "./mapCommitPayment.transaction";

export function getPaymentTransportTitle(transport) {
	const raw = [
		transport?.tierKey,
		transport?.service_type,
		transport?.serviceType,
		transport?.service_name,
		transport?.title,
		transport?.label,
	]
		.filter(Boolean)
		.join(" ")
		.toLowerCase();

	if (raw.includes("bls") || raw.includes("basic") || raw.includes("standard")) {
		return "Everyday care";
	}
	if (raw.includes("als") || raw.includes("advanced") || raw.includes("cardiac")) {
		return "Extra support";
	}
	if (raw.includes("icu") || raw.includes("critical") || raw.includes("intensive")) {
		return "Hospital transfer";
	}

	return transport?.title || transport?.label || transport?.service_name || "Transport";
}

export function getPaymentUserAvatarSource(user) {
	const metadata = user?.user_metadata || user?.metadata || {};
	const uri =
		user?.imageUri ||
		user?.avatarUrl ||
		user?.avatar_url ||
		metadata?.avatar_url ||
		metadata?.picture ||
		metadata?.photo_url ||
		null;

	return typeof uri === "string" && uri.trim() ? { uri: uri.trim() } : null;
}

export function buildCommitPaymentFooterLabels({
	isCombinedFlow = false,
	isExpandedPaymentView = false,
	paymentMethodsSnapshotReady = false,
	isRefreshingPaymentMethods = false,
	selectedPaymentMethod = null,
	isBedFlow = false,
	totalCostLabel = null,
}) {
	const expandedFooterActionLabel = isCombinedFlow
		? "Combined payment soon"
		: !paymentMethodsSnapshotReady || isRefreshingPaymentMethods
			? "Checking payment"
			: !selectedPaymentMethod
				? "Select payment"
				: selectedPaymentMethod?.is_cash
					? isBedFlow
						? "Request booking with cash"
						: "Request transport with cash"
					: totalCostLabel
						? `Pay ${totalCostLabel}`
						: isBedFlow
							? "Book now"
							: "Pay now";

	return {
		expandedFooterActionLabel,
		footerActionLabel: isExpandedPaymentView
			? expandedFooterActionLabel
			: !paymentMethodsSnapshotReady || isRefreshingPaymentMethods
				? "Checking payment"
				: !selectedPaymentMethod
					? "Select payment"
					: "Pay Now",
	};
}

export function buildCommitPaymentStatusConfig({
	submissionKind,
	isBedFlow = false,
	accentColor,
	warningColor,
	errorColor,
	infoColor,
	errorMessage = "",
	statusCopy,
}) {
	if (submissionKind === MAP_COMMIT_PAYMENT_TRANSACTION_STATES.PROCESSING_PAYMENT) {
		return {
			accentColor,
			title: statusCopy.STATUS_PROCESSING_PAYMENT_TITLE,
			description: statusCopy.STATUS_PROCESSING_PAYMENT_DESCRIPTION,
		};
	}

	if (submissionKind === MAP_COMMIT_PAYMENT_TRANSACTION_STATES.FINALIZING_DISPATCH) {
		return {
			accentColor: infoColor,
			title: isBedFlow ? "Finalizing booking" : statusCopy.STATUS_FINALIZING_TITLE,
			description: isBedFlow
				? "Payment received."
				: statusCopy.STATUS_FINALIZING_DESCRIPTION,
		};
	}

	if (submissionKind === MAP_COMMIT_PAYMENT_TRANSACTION_STATES.WAITING_APPROVAL) {
		return {
			accentColor: warningColor,
			title: statusCopy.STATUS_WAITING_TITLE,
			description: statusCopy.STATUS_WAITING_DESCRIPTION,
		};
	}

	if (submissionKind === MAP_COMMIT_PAYMENT_TRANSACTION_STATES.PAYMENT_DECLINED) {
		return {
			accentColor: errorColor,
			title: "Payment declined",
			description:
				"That payment was not accepted. Try again or switch payment method.",
		};
	}

	if (submissionKind === MAP_COMMIT_PAYMENT_TRANSACTION_STATES.FAILED) {
		return {
			accentColor: errorColor,
			title: "Payment could not complete",
			description:
				errorMessage ||
				"Something interrupted payment confirmation. Try again or switch payment method.",
		};
	}

	return {
		accentColor,
		title: isBedFlow ? "Booking submitted" : statusCopy.STATUS_DISPATCHED_TITLE,
		description: isBedFlow
			? "The hospital is responding now."
			: statusCopy.STATUS_DISPATCHED_DESCRIPTION,
	};
}

export default {
	getPaymentTransportTitle,
	getPaymentUserAvatarSource,
	buildCommitPaymentFooterLabels,
	buildCommitPaymentStatusConfig,
};
