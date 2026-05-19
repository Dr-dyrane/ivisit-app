import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { generateDemoDispatchReply } from "../_shared/domain/emergencyChat/demoDispatchAi.ts";
import {
  findActiveParticipant,
  findAvailableRoom,
  findEmergencyRequest,
  findExistingDemoReply,
  findHospitalForRequest,
  findSourceMessage,
  insertDemoDispatchReply,
  isDemoHospital,
  isUuid,
  listRecentRoomMessages,
} from "../_shared/domain/emergencyChat/demoDispatchData.ts";
import { toSafeBody, toText } from "../_shared/domain/emergencyChat/text.ts";
import { jsonResponse, optionsResponse } from "../_shared/http/cors.ts";
import { isOptionsRequest } from "../_shared/http/request.ts";
import { jsonErrorResponse } from "../_shared/http/response.ts";
import { readAuthenticatedUser } from "../_shared/supabase/auth.ts";
import { createServiceClient } from "../_shared/supabase/clients.ts";

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

    if (!isUuid(roomId) || !isUuid(requestId) || !isUuid(messageId)) {
      return jsonErrorResponse("roomId, requestId, and messageId must be valid UUIDs", 400);
    }

    const participant = await findActiveParticipant(adminClient, roomId, user.id);
    if (!participant) {
      return jsonErrorResponse("Chat room not available for this user", 403);
    }

    const room = await findAvailableRoom(adminClient, roomId, requestId);
    if (!room || room.status === "archived") {
      return jsonResponse({ success: true, skipped: "room_unavailable" });
    }

    const sourceMessage = await findSourceMessage(adminClient, roomId, messageId);
    if (!sourceMessage || String(sourceMessage.sender_id) !== String(user.id)) {
      return jsonResponse({ success: true, skipped: "not_user_message" });
    }
    if (sourceMessage.metadata?.automated === true) {
      return jsonResponse({ success: true, skipped: "automated_message" });
    }

    const requestRow = await findEmergencyRequest(adminClient, requestId);
    if (!requestRow || String(requestRow.user_id) !== String(user.id)) {
      return jsonErrorResponse("Request not found for this user", 403);
    }

    const hospitalRow = await findHospitalForRequest(adminClient, requestRow.hospital_id);
    if (!isDemoHospital(hospitalRow)) {
      return jsonResponse({ success: true, skipped: "not_demo" });
    }

    const clientMessageId = `demo-dispatch:${messageId}`;
    const existingReply = await findExistingDemoReply(adminClient, roomId, clientMessageId);
    if (existingReply?.id) {
      return jsonResponse({ success: true, skipped: "already_replied", messageId: existingReply.id });
    }

    const recentMessages = await listRecentRoomMessages(adminClient, roomId);

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

    const inserted = await insertDemoDispatchReply(
      adminClient,
      roomId,
      messageId,
      clientMessageId,
      reply,
      provider,
    );

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
