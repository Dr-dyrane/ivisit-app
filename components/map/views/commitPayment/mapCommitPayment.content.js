export const MAP_COMMIT_PAYMENT_COPY = {
	HEADER_TITLE: "Payment",
	PAYMENT_METHODS_TITLE: "Pay with",
	BREAKDOWN_TITLE: "Details",
	COST_LOADING: "Locking in transport cost...",
	COST_ERROR: "Total couldn't refresh. You can still continue.",
	CTA_CONFIRM: "Confirm request",
	CTA_DONE: "Done",
	STATUS_PROCESSING_PAYMENT_TITLE: "Confirming payment",
	STATUS_PROCESSING_PAYMENT_DESCRIPTION:
		"Sending your request securely.",
	// Clear that payment is through and the request is being confirmed.
	STATUS_FINALIZING_TITLE: "Payment confirmed",
	STATUS_FINALIZING_DESCRIPTION:
		"Confirming your request - this may take a moment.",
	// OTA1 E5 -- settlement timed out: honest about the wait, never claims dispatch.
	// Kept in-family with the other status descriptions: MapCommitPaymentStatusCard
	// caps statusDescription at numberOfLines={1}, so longer copy ellipsizes away
	// exactly the half that tells the user they may close the sheet.
	STATUS_SETTLEMENT_PENDING_TITLE: "Taking longer than usual",
	STATUS_SETTLEMENT_PENDING_DESCRIPTION:
		"Payment went through. Close this - it updates on its own.",
	STATUS_WAITING_TITLE: "Waiting for approval",
	STATUS_WAITING_DESCRIPTION:
		"Cash request sent to the hospital.",
	STATUS_DISPATCHED_TITLE: "Request live",
	STATUS_DISPATCHED_DESCRIPTION:
		"The hospital is responding now.",
};
