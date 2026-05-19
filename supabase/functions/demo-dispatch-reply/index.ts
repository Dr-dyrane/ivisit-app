import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { generateDemoDispatchReply } from "../_shared/domain/emergencyChat/demoDispatchAi.ts";
import { toSafeBody, toText } from "../_shared/domain/emergencyChat/text.ts";
import { jsonResponse, optionsResponse } from "../_shared/http/cors.ts";
import { isOptionsRequest } from "../_shared/http/request.ts";
import { jsonErrorResponse } from "../_shared/http/response.ts";
import { readAuthenticatedUser } from "../_shared/supabase/auth.ts";
import { createServiceClient } from "../_shared/supabase/clients.ts";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

serve(async (req) => {
  if (isOptionsRequest(req)) {
    return optionsResponse();
  }

  try {
    const adminClient = createServiceClient();

    const {
      user,
      error: userError,
    } = await readAuthenticatedUser(req);

    if (userError || !user?.id) {
      return jsonErrorResponse("Unauthorized", 401);
    }

    const body = await req.json();
    const roomId = toText(body?.roomId);
    const requestId = toText(body?.requestId);
    const messageId = toText(body?.messageId);

    if (!UUID_PATTERN.test(roomId) || !UUID_PATTERN.test(requestId) || !UUID_PATTERN.test(messageId)) {
      return jsonErrorResponse("roomId, requestId, and messageId must be valid UUIDs", 400);
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
      return jsonErrorResponse("Chat room not available for this user", 403);
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
      return jsonErrorResponse("Request not found for this user", 403);
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

    const { provider, reply } = await generateDemoDispatchReply(
      context,
      sourceMessage.body,
      requestRow.service_type,
    );

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
    return jsonErrorResponse(message, 500);
  }
});
