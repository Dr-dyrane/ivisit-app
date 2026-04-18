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

export const normalizeApiErrorMessage = (message, fallback = "Something went wrong.") => {
	const rawMessage = typeof message === "string" ? message.trim() : "";
	const readableMessage = rawMessage.includes("|")
		? rawMessage.split("|").slice(1).join("|").trim()
		: rawMessage;

	return (readableMessage || fallback)
		.replace(/\bvalide\b/gi, "valid")
		.replace(/\s+/g, " ")
		.trim();
};
