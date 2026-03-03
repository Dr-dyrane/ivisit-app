let pendingOAuthCallbackUrl = null;

export const setPendingOAuthCallbackUrl = (url) => {
	if (typeof url !== "string" || !url) return;
	pendingOAuthCallbackUrl = url;
};

export const consumePendingOAuthCallbackUrl = () => {
	const current = pendingOAuthCallbackUrl;
	pendingOAuthCallbackUrl = null;
	return current;
};

export const peekPendingOAuthCallbackUrl = () => pendingOAuthCallbackUrl;

