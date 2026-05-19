import { getEnv } from "../../env/env.ts";
import { toSafeBody, toText } from "./text.ts";

const fallbackReply = (messageBody: string, serviceType = "visit") => {
  const lowered = messageBody.toLowerCase();
  if (lowered.includes("where") || lowered.includes("eta") || lowered.includes("time")) {
    return "Demo Dispatch received that. We are checking the responder ETA and will keep this thread updated.";
  }
  if (lowered.includes("cancel")) {
    return "Demo Dispatch can help with cancellation. For this demo, we will keep the request active so you can review the full flow.";
  }
  if (lowered.includes("help") || lowered.includes("urgent") || lowered.includes("emergency")) {
    return "Demo Dispatch is here. We have your request and are keeping the care team updated in this chat.";
  }
  return `Demo Dispatch received your ${serviceType || "visit"} message. We are coordinating the request and will keep you updated here.`;
};

const extractOpenAIText = (responseJson: Record<string, unknown>) => {
  const direct = toText(responseJson?.output_text);
  if (direct) return direct;

  const output = Array.isArray(responseJson?.output) ? responseJson.output : [];
  const chunks: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = Array.isArray((item as { content?: unknown }).content)
      ? ((item as { content?: unknown }).content as unknown[])
      : [];
    for (const contentItem of content) {
      if (!contentItem || typeof contentItem !== "object") continue;
      const text = toText((contentItem as { text?: unknown }).text);
      if (text) chunks.push(text);
    }
  }
  return chunks.join(" ").trim();
};

const generateOpenAIReply = async (context: Record<string, unknown>) => {
  const key = getEnv("OPENAI_API_KEY");
  if (!key) return null;

  const model = toText(getEnv("OPENAI_MODEL"), "gpt-4.1-mini");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      max_output_tokens: 90,
      input: [
        {
          role: "system",
          content:
            "You are iVisit Demo Dispatch. Reply as a calm dispatcher for a product demo. Keep it under 35 words. Do not claim a real emergency service was contacted. Do not give medical advice.",
        },
        {
          role: "user",
          content: JSON.stringify(context),
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.warn("[demo-dispatch-reply] openai error", response.status, detail.slice(0, 180));
    return null;
  }

  const json = (await response.json()) as Record<string, unknown>;
  return toSafeBody(extractOpenAIText(json));
};

const generateAnthropicReply = async (context: Record<string, unknown>) => {
  const key = getEnv("ANTHROPIC_API_KEY");
  if (!key) return null;

  const model = toText(getEnv("ANTHROPIC_MODEL"), "claude-3-5-haiku-latest");
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 90,
      temperature: 0.3,
      messages: [
        {
          role: "user",
          content: `You are iVisit Demo Dispatch. Reply as a calm dispatcher for a product demo.
Rules:
- Keep it under 35 words.
- Do not claim a real emergency service was contacted.
- Do not give medical advice.
- Return only the dispatch reply text.

Context JSON:
${JSON.stringify(context)}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.warn("[demo-dispatch-reply] anthropic error", response.status, detail.slice(0, 180));
    return null;
  }

  const json = (await response.json()) as Record<string, unknown>;
  const content = Array.isArray(json?.content) ? json.content : [];
  const textBlock = content.find(
    (item) => item && typeof item === "object" && (item as { type?: string }).type === "text"
  ) as { text?: string } | undefined;
  return toSafeBody(textBlock?.text);
};

export const generateDemoDispatchReply = async (
  context: Record<string, unknown>,
  messageBody: unknown,
  serviceType: unknown,
) => {
  let provider = "fallback";
  let reply = await generateOpenAIReply(context);
  if (reply) {
    provider = "openai";
  } else {
    reply = await generateAnthropicReply(context);
    if (reply) provider = "anthropic";
  }
  if (!reply) {
    reply = fallbackReply(toSafeBody(messageBody), toText(serviceType, "visit"));
  }

  return { provider, reply };
};
