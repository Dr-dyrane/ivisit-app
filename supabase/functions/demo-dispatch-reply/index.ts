import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getEnv } from "../_shared/env/env.ts";
import { jsonResponse, optionsResponse } from "../_shared/http/cors.ts";
import { createServiceClient, createUserClient } from "../_shared/supabase/clients.ts";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const toText = (value: unknown, fallback = "") => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const toSafeBody = (value: unknown) => toText(value).slice(0, 1000);

const isDemoHospital = (hospital: any) => {
  const placeId = toText(hospital?.place_id).toLowerCase();
  const verificationStatus = toText(hospital?.verification_status).toLowerCase();
  const features = Array.isArray(hospital?.features)
    ? hospital.features.map((feature: unknown) => toText(feature).toLowerCase())
    : [];

  return (
    placeId.startsWith("demo:") ||
    verificationStatus.startsWith("demo") ||
    features.some(
      (feature) =>
        feature.includes("demo") ||
        feature.startsWith("demo_scope:") ||
        feature.startsWith("demo_owner:")
    )
  );
};

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return optionsResponse();
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createUserClient(authHeader);
    const adminClient = createServiceClient();

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user?.id) {
      return jsonResponse({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const roomId = toText(body?.roomId);
    const requestId = toText(body?.requestId);
    const messageId = toText(body?.messageId);

    if (!UUID_PATTERN.test(roomId) || !UUID_PATTERN.test(requestId) || !UUID_PATTERN.test(messageId)) {
      return jsonResponse(
        { success: false, error: "roomId, requestId, and messageId must be valid UUIDs" },
        { status: 400 },
      );
    }

    const { data: participant, error: participantError } = await adminClient
      .from("emergency_chat_participants")
      .select("id, role")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .is("left_at", null)
      .maybeSingle();

    if (participantError) {
      throw new Error(`Participant lookup failed: ${participantError.message}`);
    }
    if (!participant) {
      return jsonResponse(
        { success: false, error: "Chat room not available for this user" },
        { status: 403 },
      );
    }

    const { data: room, error: roomError } = await adminClient
      .from("emergency_chat_rooms")
      .select("id, emergency_request_id, status")
      .eq("id", roomId)
      .eq("emergency_request_id", requestId)
      .maybeSingle();

    if (roomError) {
      throw new Error(`Room lookup failed: ${roomError.message}`);
    }
    if (!room || room.status === "archived") {
      return jsonResponse({ success: true, skipped: "room_unavailable" });
    }

    const { data: sourceMessage, error: sourceMessageError } = await adminClient
      .from("emergency_chat_messages")
      .select("id, room_id, sender_id, sender_role, kind, body, metadata, created_at")
      .eq("id", messageId)
      .eq("room_id", roomId)
      .maybeSingle();

    if (sourceMessageError) {
      throw new Error(`Message lookup failed: ${sourceMessageError.message}`);
    }
    if (!sourceMessage || String(sourceMessage.sender_id) !== String(user.id)) {
      return jsonResponse({ success: true, skipped: "not_user_message" });
    }
    if (sourceMessage.metadata?.automated === true) {
      return jsonResponse({ success: true, skipped: "automated_message" });
    }

    const { data: requestRow, error: requestError } = await adminClient
      .from("emergency_requests")
      .select("id, user_id, hospital_id, hospital_name, service_type, status, display_id")
      .eq("id", requestId)
      .maybeSingle();

    if (requestError) {
      throw new Error(`Emergency request lookup failed: ${requestError.message}`);
    }
    if (!requestRow || String(requestRow.user_id) !== String(user.id)) {
      return jsonResponse(
        { success: false, error: "Request not found for this user" },
        { status: 403 },
      );
    }

    const { data: hospitalRow, error: hospitalError } = requestRow.hospital_id
      ? await adminClient
          .from("hospitals")
          .select("id, name, place_id, verification_status, features")
          .eq("id", requestRow.hospital_id)
          .maybeSingle()
      : { data: null, error: null };

    if (hospitalError) {
      throw new Error(`Hospital lookup failed: ${hospitalError.message}`);
    }
    if (!isDemoHospital(hospitalRow)) {
      return jsonResponse({ success: true, skipped: "not_demo" });
    }

    const clientMessageId = `demo-dispatch:${messageId}`;
    const { data: existingReply, error: existingError } = await adminClient
      .from("emergency_chat_messages")
      .select("id")
      .eq("room_id", roomId)
      .eq("client_message_id", clientMessageId)
      .maybeSingle();

    if (existingError) {
      throw new Error(`Existing reply lookup failed: ${existingError.message}`);
    }
    if (existingReply?.id) {
      return jsonResponse({ success: true, skipped: "already_replied", messageId: existingReply.id });
    }

    const { data: recentMessages, error: recentError } = await adminClient
      .from("emergency_chat_messages")
      .select("sender_role, kind, body, created_at")
      .eq("room_id", roomId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(8);

    if (recentError) {
      throw new Error(`Recent messages lookup failed: ${recentError.message}`);
    }

    const context = {
      serviceType: toText(requestRow.service_type, "visit"),
      requestStatus: toText(requestRow.status, "pending"),
      requestDisplayId: toText(requestRow.display_id),
      hospitalName: toText(requestRow.hospital_name) || toText(hospitalRow?.name, "demo hospital"),
      userMessage: toSafeBody(sourceMessage.body),
      recentMessages: (recentMessages || []).reverse().map((message: any) => ({
        role: toText(message.sender_role, "patient"),
        kind: toText(message.kind, "text"),
        body: toSafeBody(message.body),
      })),
    };

    let provider = "fallback";
    let reply = await generateOpenAIReply(context);
    if (reply) {
      provider = "openai";
    } else {
      reply = await generateAnthropicReply(context);
      if (reply) provider = "anthropic";
    }
    if (!reply) {
      reply = fallbackReply(toSafeBody(sourceMessage.body), toText(requestRow.service_type, "visit"));
    }

    const { data: inserted, error: insertError } = await adminClient
      .from("emergency_chat_messages")
      .insert({
        room_id: roomId,
        sender_id: null,
        sender_role: "dispatcher",
        kind: "text",
        body: reply,
        client_message_id: clientMessageId,
        metadata: {
          automated: true,
          demo: true,
          provider,
          demo_reply_for_message_id: messageId,
        },
      })
      .select("id, created_at")
      .single();

    if (insertError) {
      throw new Error(`Reply insert failed: ${insertError.message}`);
    }

    await adminClient
      .from("emergency_chat_rooms")
      .update({
        last_message_at: inserted.created_at,
        updated_at: new Date().toISOString(),
      })
      .eq("id", roomId);

    return jsonResponse({
      success: true,
      provider,
      messageId: inserted.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[demo-dispatch-reply] fatal", message);
    return jsonResponse({ success: false, error: message }, { status: 500 });
  }
});
