import { supabase } from "./supabase";

const isAiEnabled = () =>
	String(process.env.EXPO_PUBLIC_ENABLE_TRIAGE_AI || "false").toLowerCase() === "true";

const sanitizePrompt = (value) => {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	if (!trimmed) return null;
	if (trimmed.length > 160) return trimmed.slice(0, 160);
	return trimmed;
};

export const triageCopilotService = {
	isEnabled: isAiEnabled,

	async suggestPrompt(payload) {
		if (!isAiEnabled()) return null;
		try {
			const { data, error } = await supabase.functions.invoke("triage-copilot", {
				body: payload,
			});
			if (error) {
				console.warn("[triageCopilotService] invoke failed:", error);
				return null;
			}
			const prompt = sanitizePrompt(data?.prompt);
			if (!prompt) return null;
			return {
				prompt,
				source: typeof data?.source === "string" ? data.source : null,
				model: typeof data?.model === "string" ? data.model : null,
			};
		} catch (error) {
			console.warn("[triageCopilotService] suggestPrompt failed:", error);
			return null;
		}
	},
};

export default triageCopilotService;
