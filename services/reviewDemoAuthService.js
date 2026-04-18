import { supabase } from "./supabase";

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

const isTruthyEnv = (value) => {
	const normalized = String(value || "").trim().toLowerCase();
	return ["1", "true", "yes", "on"].includes(normalized);
};

const REVIEW_DEMO_EMAIL = normalizeEmail(
	process.env.EXPO_PUBLIC_REVIEW_DEMO_AUTH_EMAIL || "support@ivisit.ng"
);

export const reviewDemoAuthService = {
	isEnabled() {
		return isTruthyEnv(process.env.EXPO_PUBLIC_REVIEW_DEMO_AUTH_ENABLED);
	},

	isReviewEmail(email) {
		return normalizeEmail(email) === REVIEW_DEMO_EMAIL;
	},

	shouldHandleEmail(email) {
		return this.isEnabled() && this.isReviewEmail(email);
	},

	async acknowledgeCodeRequest({ email }) {
		if (!this.shouldHandleEmail(email)) {
			return { success: false, error: "Review demo auth is not enabled for this email." };
		}

		return {
			success: true,
			data: {
				message: "Review code ready",
				reviewDemoAuth: true,
			},
		};
	},

	async exchangeStaticCode({ email, otp }) {
		if (!this.shouldHandleEmail(email)) {
			return { success: false, error: "Review demo auth is not enabled for this email." };
		}

		const { data, error } = await supabase.functions.invoke("review-demo-auth", {
			body: {
				email: normalizeEmail(email),
				otp: String(otp || "").trim(),
			},
		});

		if (error) {
			return { success: false, error: error.message || "Review sign-in is unavailable." };
		}

		if (!data?.success || !data?.otp) {
			return {
				success: false,
				error: data?.error || "Review code could not be verified.",
			};
		}

		return {
			success: true,
			data: {
				email: normalizeEmail(data.email || email),
				otp: String(data.otp),
				verificationType: data.verificationType || "magiclink",
				reviewDemoAuth: true,
			},
		};
	},
};
