import { supabase } from "./supabase";
import { isValidUUID } from "./displayIdService";
import { withRetry, withTimeout } from "./supabaseHelpers";
import { communicationService } from "./communicationService";
import { scheduledVisitReleaseGates } from "./scheduledVisitsService";

const toText = (value) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

export class AsyncConsultContractError extends Error {
  constructor(code, message, cause = null) {
    super(message);
    this.name = "AsyncConsultContractError";
    this.code = code;
    this.cause = cause;
  }
}

export const normalizeAsyncConsultError = (error) => {
  if (error instanceof AsyncConsultContractError) return error;
  const source = [error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(" ");
  if (/unauthorized|outside actor scope|only the patient|assigned clinician/i.test(source)) {
    return new AsyncConsultContractError(
      "authorization_denied",
      "You do not have access to this consult.",
      error,
    );
  }
  if (/closed visit|not active|archived/i.test(source)) {
    return new AsyncConsultContractError(
      "consult_closed",
      "This consult is read-only.",
      error,
    );
  }
  if (/client message id.+another/i.test(source)) {
    return new AsyncConsultContractError(
      "idempotency_mismatch",
      "This message changed. Review it before retrying.",
      error,
    );
  }
  if (/network|fetch failed|timed out|timeout/i.test(source)) {
    return new AsyncConsultContractError(
      "network_error",
      "Check your connection and try again.",
      error,
    );
  }
  if (/required|between 1 and 1000|unsupported/i.test(source)) {
    return new AsyncConsultContractError(
      "invalid_input",
      "Review the message and try again.",
      error,
    );
  }
  return new AsyncConsultContractError(
    "unavailable",
    "The consult is temporarily unavailable.",
    error,
  );
};

const requireConsultGate = () => {
  if (!scheduledVisitReleaseGates.asyncConsult) {
    throw new AsyncConsultContractError(
      "feature_unavailable",
      "Async consult is temporarily unavailable.",
    );
  }
};

const requireUuid = (value, label) => {
  if (!value || !isValidUUID(String(value))) {
    throw new AsyncConsultContractError(
      "invalid_input",
      `${label} is required.`,
    );
  }
  return String(value);
};

export const asyncConsultService = {
  async ensureRoomForVisit(visitId) {
    requireConsultGate();
    requireUuid(visitId, "Visit");
    try {
      const existingRoom = await communicationService.getRoomByVisit(visitId);
      if (existingRoom?.id) {
        const participants = await communicationService.listParticipants(
          existingRoom.id,
        );
        return { room: existingRoom, participants };
      }
      const { data, error } = await withTimeout(
        supabase.rpc("ensure_async_consult_room", {
          p_visit_id: visitId,
        }),
        12000,
        "Consult connection timed out",
      );
      if (error) throw error;
      const room = communicationService.mapRoomRow(data);
      if (!room?.id || room.channelType !== "telemedicine_async") {
        throw new AsyncConsultContractError(
          "invalid_response",
          "The consult room response was incomplete.",
        );
      }
      const participants = await communicationService.listParticipants(room.id);
      return { room, participants };
    } catch (error) {
      throw normalizeAsyncConsultError(error);
    }
  },

  async sendTextMessage(roomId, input = {}) {
    requireConsultGate();
    requireUuid(roomId, "Consult room");
    const body = toText(input.body);
    const clientMessageId = toText(input.clientMessageId);
    if (!body || body.length > 1000 || !clientMessageId) {
      throw new AsyncConsultContractError(
        "invalid_input",
        "Enter a message before sending.",
      );
    }
    const metadata =
      input.metadata && typeof input.metadata === "object"
        ? input.metadata
        : {};

    try {
      const { data, error } = await withRetry(
        () =>
          withTimeout(
            supabase.rpc("send_async_consult_message", {
              p_room_id: roomId,
              p_body: body,
              p_kind: "text",
              p_client_message_id: clientMessageId,
              p_metadata: metadata,
              p_attachment_storage_path: null,
              p_attachment_mime_type: null,
              p_attachment_size_bytes: null,
              p_attachment_duration_ms: null,
            }),
            12000,
            "Message send timed out",
          ),
        { maxRetries: 2 },
      );
      if (error) throw error;
      const message = communicationService.mapMessageRow(data);
      if (!message?.id) {
        throw new AsyncConsultContractError(
          "invalid_response",
          "The message response was incomplete.",
        );
      }
      return message;
    } catch (error) {
      throw normalizeAsyncConsultError(error);
    }
  },

  async markRoomRead(roomId, messageId = null) {
    requireConsultGate();
    requireUuid(roomId, "Consult room");
    if (messageId) requireUuid(messageId, "Message");
    try {
      const { data, error } = await withRetry(
        () =>
          supabase.rpc("mark_async_consult_room_read", {
            p_room_id: roomId,
            p_message_id: messageId,
          }),
        { maxRetries: 2 },
      );
      if (error) throw error;
      return data === true;
    } catch (error) {
      throw normalizeAsyncConsultError(error);
    }
  },
};

export default asyncConsultService;
