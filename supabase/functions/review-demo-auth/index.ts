import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REVIEW_PROFILE = {
	full_name: "iVisit Review Tester",
	role: "patient",
	onboarding_status: "complete",
	phone: "+15555550123",
};

const toText = (value: unknown, fallback = "") => {
	if (typeof value !== "string") return fallback;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : fallback;
};

const normalizeEmail = (value: unknown) => toText(value).toLowerCase();

const isTruthy = (value: unknown) => {
	const normalized = toText(value).toLowerCase();
	return ["1", "true", "yes", "on"].includes(normalized);
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { ...corsHeaders, "Content-Type": "application/json" },
	});

const findAuthUserByEmail = async (admin: any, email: string) => {
	let page = 1;
	const perPage = 200;

	while (page <= 25) {
		const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
		if (error) {
			throw new Error(`auth listUsers failed: ${error.message}`);
		}

		const users = data?.users || [];
		const found = users.find(
			(user: any) => normalizeEmail(user?.email) === email
		);
		if (found) return found;
		if (users.length < perPage) break;
		page += 1;
	}

	return null;
};

const ensureReviewUser = async (admin: any, email: string) => {
	const existing = await findAuthUserByEmail(admin, email);
	if (existing?.id) {
		if (!existing.email_confirmed_at && !existing.confirmed_at) {
			const { error } = await admin.auth.admin.updateUserById(existing.id, {
				email_confirm: true,
				user_metadata: {
					...(existing.user_metadata || {}),
					full_name: REVIEW_PROFILE.full_name,
					role: REVIEW_PROFILE.role,
					source: "google_play_review",
				},
			});
			if (error) {
				throw new Error(`auth updateUserById failed: ${error.message}`);
			}
		}
		return existing;
	}

	const randomPassword = crypto.randomUUID() + crypto.randomUUID();
	const { data, error } = await admin.auth.admin.createUser({
		email,
		password: randomPassword,
		email_confirm: true,
		user_metadata: {
			full_name: REVIEW_PROFILE.full_name,
			role: REVIEW_PROFILE.role,
			source: "google_play_review",
		},
	});

	if (error || !data?.user?.id) {
		throw new Error(`auth createUser failed: ${error?.message || "unknown error"}`);
	}

	return data.user;
};

const syncReviewProfile = async (admin: any, userId: string, email: string) => {
	const { error } = await admin.from("profiles").upsert(
		{
			id: userId,
			email,
			full_name: REVIEW_PROFILE.full_name,
			role: REVIEW_PROFILE.role,
			phone: REVIEW_PROFILE.phone,
			onboarding_status: REVIEW_PROFILE.onboarding_status,
			updated_at: new Date().toISOString(),
		},
		{ onConflict: "id" }
	);

	if (error) {
		throw new Error(`profile upsert failed: ${error.message}`);
	}
};

serve(async (req: Request) => {
	if (req.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders });
	}

	if (req.method !== "POST") {
		return jsonResponse({ success: false, error: "Method not allowed" }, 405);
	}

	try {
		const enabled = isTruthy(Deno.env.get("REVIEW_DEMO_AUTH_ENABLED"));
		const reviewEmail = normalizeEmail(
			Deno.env.get("REVIEW_DEMO_AUTH_EMAIL") || "support@ivisit.ng"
		);
		const reviewOtp = toText(Deno.env.get("REVIEW_DEMO_AUTH_OTP"));

		if (!enabled || !reviewOtp) {
			return jsonResponse({ success: false, error: "Review sign-in is disabled" }, 404);
		}

		const body = await req.json().catch(() => ({}));
		const email = normalizeEmail(body?.email);
		const otp = toText(body?.otp);

		if (email !== reviewEmail || otp !== reviewOtp) {
			return jsonResponse({ success: false, error: "Invalid review code" }, 401);
		}

		const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
		const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
		if (!supabaseUrl || !serviceRoleKey) {
			throw new Error("Supabase environment is not configured");
		}

		const admin = createClient(supabaseUrl, serviceRoleKey, {
			auth: { persistSession: false, autoRefreshToken: false },
		});
		const user = await ensureReviewUser(admin, reviewEmail);
		await syncReviewProfile(admin, user.id, reviewEmail);

		const { data, error } = await admin.auth.admin.generateLink({
			type: "magiclink",
			email: reviewEmail,
		});

		if (error || !data?.properties?.email_otp) {
			throw new Error(`generateLink failed: ${error?.message || "missing otp"}`);
		}

		return jsonResponse({
			success: true,
			email: reviewEmail,
			otp: data.properties.email_otp,
			verificationType: data.properties.verification_type || "magiclink",
		});
	} catch (error) {
		return jsonResponse(
			{
				success: false,
				error: error instanceof Error ? error.message : "Review sign-in failed",
			},
			500
		);
	}
});
