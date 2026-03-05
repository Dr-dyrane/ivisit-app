import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const toText = (value: unknown, fallback = "") => {
	if (typeof value !== "string") return fallback;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : fallback;
};

const toUniqueList = (items: string[]) => [...new Set(items.filter(Boolean))];

const getModelCandidates = () => {
	const raw = toText(Deno.env.get("ANTHROPIC_MODEL"), "");
	const fromEnv = raw
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
	const defaults = [
		"claude-3-5-sonnet-latest",
		"claude-3-5-haiku-latest",
		"claude-3-haiku-20240307",
	];
	return toUniqueList([...fromEnv, ...defaults]);
};

const buildPrompt = (payload: Record<string, unknown>) => {
	const phase = toText(payload?.phase, "prebooking");
	const step = (payload?.step || {}) as Record<string, unknown>;
	const draft = (payload?.draft || {}) as Record<string, unknown>;
	const requestContext = (payload?.requestContext || {}) as Record<string, unknown>;
	const fallbackPrompt = toText(step?.prompt, "What is the main concern right now?");
	const optionLabels = Array.isArray(step?.options)
		? step.options.map((item) => toText(item)).filter(Boolean).slice(0, 12)
		: [];

	const briefContext = {
		phase,
		serviceType: toText(requestContext?.serviceType, "ambulance"),
		specialty: toText(requestContext?.specialty, "any"),
		currentSignals: draft,
		fallbackPrompt,
		options: optionLabels,
	};

	return `You are an emergency triage conversation copy assistant.
Return ONLY valid JSON with this shape:
{"prompt":"..."}

Rules:
- Keep it calm, short, and clear.
- 8-14 words.
- Single question only.
- No diagnosis.
- Keep same intent as fallback prompt.
- Prefer option-first phrasing.

Context JSON:
${JSON.stringify(briefContext)}`;
};

const extractPromptFromAnthropic = (responseJson: Record<string, unknown>) => {
	const content = Array.isArray(responseJson?.content) ? responseJson.content : [];
	const textBlock = content.find((item) => item && typeof item === "object" && (item as { type?: string }).type === "text") as
		| { text?: string }
		| undefined;
	const raw = toText(textBlock?.text, "");
	if (!raw) return null;

	const readPrompt = (candidate: unknown) => {
		if (typeof candidate !== "string") return null;
		const trimmed = candidate.trim();
		return trimmed.length > 0 ? trimmed : null;
	};

	try {
		const parsed = JSON.parse(raw);
		return readPrompt(parsed?.prompt);
	} catch {
		const jsonMatch = raw.match(/\{[\s\S]*\}/);
		if (!jsonMatch) return null;
		try {
			const parsed = JSON.parse(jsonMatch[0]);
			return readPrompt(parsed?.prompt);
		} catch {
			return null;
		}
	}
};

serve(async (req: Request) => {
	if (req.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders });
	}

	try {
		const body = await req.json();
		const fallbackPrompt = toText(body?.step?.prompt, "What feels most wrong right now?");
		const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");

		if (!anthropicKey) {
			return new Response(
				JSON.stringify({
					prompt: fallbackPrompt,
					source: "fallback_no_key",
				}),
				{
					headers: { ...corsHeaders, "Content-Type": "application/json" },
					status: 200,
				}
			);
		}

		const promptSeed = buildPrompt(body || {});
		const models = getModelCandidates();
		let lastError: { model: string; status: number; detail: string } | null = null;

		for (const model of models) {
			const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-api-key": anthropicKey,
					"anthropic-version": "2023-06-01",
				},
				body: JSON.stringify({
					model,
					max_tokens: 120,
					temperature: 0.2,
					messages: [
						{
							role: "user",
							content: promptSeed,
						},
					],
				}),
			});

			if (!aiRes.ok) {
				const errorText = await aiRes.text();
				const detail = toText(errorText, "anthropic_error").slice(0, 180);
				console.warn("[triage-copilot] anthropic error:", model, aiRes.status, detail);
				lastError = { model, status: aiRes.status, detail };
				if (aiRes.status === 401 || aiRes.status === 403) {
					break;
				}
				continue;
			}

			const aiJson = (await aiRes.json()) as Record<string, unknown>;
			const prompt = extractPromptFromAnthropic(aiJson);
			if (prompt) {
				return new Response(
					JSON.stringify({
						prompt,
						source: "anthropic",
						model,
					}),
					{
						headers: { ...corsHeaders, "Content-Type": "application/json" },
						status: 200,
					}
				);
			}

			lastError = {
				model,
				status: 200,
				detail: "empty_prompt",
			};
		}

		return new Response(
			JSON.stringify({
				prompt: fallbackPrompt,
				source: "fallback_api_error",
				modelTried: lastError?.model || null,
				errorHint: lastError?.detail || null,
			}),
			{
				headers: { ...corsHeaders, "Content-Type": "application/json" },
				status: 200,
			}
		);
	} catch (error) {
		console.error("[triage-copilot] fatal:", error);
		return new Response(
			JSON.stringify({
				error: "triage_copilot_failed",
			}),
			{
				headers: { ...corsHeaders, "Content-Type": "application/json" },
				status: 400,
			}
		);
	}
});
