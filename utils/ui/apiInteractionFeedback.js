export const DEFAULT_MIN_API_PENDING_MS = 2000;

export const wait = (durationMs) =>
	new Promise((resolve) => {
		setTimeout(resolve, Math.max(0, durationMs || 0));
	});

export const waitForMinimumPending = async (
	startedAt,
	minimumPendingMs = DEFAULT_MIN_API_PENDING_MS,
) => {
	const elapsedMs = Date.now() - startedAt;
	const remainingMs = minimumPendingMs - elapsedMs;
	if (remainingMs > 0) {
		await wait(remainingMs);
	}
};

const API_ERROR_COPY = Object.freeze({
	ALREADY_ACTIVE: "You already have this request in progress.",
	CONCURRENCY_DB: "You already have this request in progress on another session.",
	IN_FLIGHT: "This request is already being submitted.",
	MISSING_HOSPITAL: "Choose a hospital before continuing.",
	INVALID_SERVICE_TYPE: "Choose a valid service before continuing.",
	NO_HOSPITALS: "No nearby hospitals are ready yet.",
});

export const normalizeApiErrorMessage = (message, fallback = "Something went wrong.") => {
	const rawMessage = typeof message === "string" ? message.trim() : "";
	if (API_ERROR_COPY[rawMessage]) return API_ERROR_COPY[rawMessage];
	const readableMessage = rawMessage.includes("|")
		? rawMessage.split("|").slice(1).join("|").trim()
		: rawMessage;

	return (readableMessage || fallback)
		.replace(/\bvalide\b/gi, "valid")
		.replace(/\s+/g, " ")
		.trim();
};
