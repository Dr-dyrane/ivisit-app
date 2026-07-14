import { supabase } from "./supabase";
import { isValidUUID } from "./displayIdService";
import { withRetry, withTimeout } from "./supabaseHelpers";
import { communicationService } from "./communicationService";

// PULLBACK NOTE: Contact Dispatch CD-3 - canonical Supabase adapter.
// Owns: row mapping, input normalization, RPC calls, and filtered realtime subscription for emergency chat.
// Does NOT own: UI state, query cache, or local fallback policy.

// SELECT FIELD LISTS

const ROOM_SELECT_FIELDS = [
  "id",
  "emergency_request_id",
  "visit_id",
  "created_by",
  "status",
  "created_at",
  "updated_at",
  "last_message_at",
  "archived_at",
].join(", ");

const PARTICIPANT_SELECT_FIELDS = [
  "id",
  "room_id",
  "user_id",
  "role",
  "display_name_snapshot",
  "joined_at",
  "left_at",
  "last_read_message_id",
  "last_read_at",
  "created_at",
  "updated_at",
].join(", ");

const MESSAGE_SELECT_FIELDS = [
  "id",
  "room_id",
  "sender_id",
  "sender_role",
  "kind",
  "body",
  "client_message_id",
  "metadata",
  "created_at",
  "updated_at",
  "edited_at",
  "deleted_at",
].join(", ");

// NORMALIZATION HELPERS

const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

const normalizeOptionalText = (value) => {
  const next = normalizeText(value);
  return next.length > 0 ? next : null;
};

const normalizeBeforeCursor = (value) => {
  const text = normalizeOptionalText(value);
  if (!text) return null;
  const time = Date.parse(text);
  return Number.isNaN(time) ? null : text;
};

// ROW MAPPERS

/**
 * Maps emergency_chat_rooms row from snake_case to camelCase.
 */
export const mapEmergencyChatRoomRow = (row) => {
  return communicationService.mapRoomRow(row);
};

/**
 * Maps emergency_chat_participants row from snake_case to camelCase.
 */
export const mapEmergencyChatParticipantRow = (row) => {
  return communicationService.mapParticipantRow(row);
};

/**
 * Maps emergency_chat_messages row from snake_case to camelCase.
 */
export const mapEmergencyChatMessageRow = (row) => {
  return communicationService.mapMessageRow(row);
};

// INPUT NORMALIZATION

/**
 * Normalizes message input for sending.
 * Throws validation error if body is empty or invalid.
 */
export const normalizeEmergencyChatMessageInput = (input = {}, options = {}) => {
  const allowInvalid = options.allowInvalid === true;
  const body = normalizeText(input?.body);

  if (!allowInvalid) {
    if (!body || body.length === 0) {
      throw new Error("INVALID_INPUT|Message body is required");
    }
    if (body.length > 1000) {
      throw new Error("INVALID_INPUT|Message must be 1000 characters or less");
    }
  }

  const kind = normalizeOptionalText(input?.kind) || "text";
  const validKinds = ["text", "quick_action", "status_event"];
  if (!allowInvalid && !validKinds.includes(kind)) {
    throw new Error("INVALID_INPUT|Invalid message kind");
  }

  return {
    body,
    kind,
    clientMessageId: normalizeOptionalText(input?.clientMessageId),
    metadata: input?.metadata && typeof input?.metadata === "object" ? input.metadata : {},
  };
};

// RPC CALLS

/**
 * Idempotently ensures a chat room exists for the given emergency request.
 * Calls ensure_emergency_chat_room RPC.
 */
export async function ensureRoomForRequest(requestId) {
  if (!requestId || !isValidUUID(String(requestId))) {
    throw new Error("INVALID_INPUT|Valid request ID is required");
  }

  const { data, error } = await withRetry(
    () =>
      withTimeout(
        supabase.rpc("ensure_emergency_chat_room", {
          p_request_id: requestId,
        }),
        10000,
        "Room creation timed out"
      ),
    { maxRetries: 3 }
  );

  if (error) throw error;

  if (!data || typeof data !== "object") {
    throw new Error("INVALID_RESPONSE|Unexpected room response");
  }

  const room = data.room ? mapEmergencyChatRoomRow(data.room) : null;
  const participants = Array.isArray(data.participants)
    ? data.participants.map(mapEmergencyChatParticipantRow).filter(Boolean)
    : [];

  return { room, participants };
}

/**
 * Lists messages for a room with pagination.
 */
export async function listMessages(roomId, { limit = 50, before = null } = {}) {
  if (!roomId || !isValidUUID(String(roomId))) {
    return [];
  }
  const legacyCursor = normalizeBeforeCursor(before);
  const page = await communicationService.listMessages(roomId, {
    limit,
    before: legacyCursor
      ? { createdAt: legacyCursor, id: "ffffffff-ffff-ffff-ffff-ffffffffffff" }
      : null,
  });
  return page.items;
}

/**
 * Sends a message to a room via RPC.
 * Returns the server message row, or the existing message if clientMessageId matches.
 */
export async function sendMessage(roomId, input) {
  if (!roomId || !isValidUUID(String(roomId))) {
    throw new Error("INVALID_INPUT|Valid room ID is required");
  }

  const normalized = normalizeEmergencyChatMessageInput(input);

  const { data, error } = await withRetry(
    () =>
      withTimeout(
        supabase.rpc("send_emergency_chat_message", {
          p_room_id: roomId,
          p_body: normalized.body,
          p_kind: normalized.kind,
          p_client_message_id: normalized.clientMessageId,
          p_metadata: normalized.metadata,
        }),
        10000,
        "Message send timed out"
      ),
    { maxRetries: 3 }
  );

  if (error) throw error;

  return data ? mapEmergencyChatMessageRow(data) : null;
}

/**
 * Requests an automated demo Dispatch reply for a user-authored chat message.
 * The Edge Function no-ops for non-demo requests and handles AI/fallback policy.
 */
export async function requestDemoDispatchReply({ roomId, requestId, messageId }) {
  if (
    !roomId ||
    !requestId ||
    !messageId ||
    !isValidUUID(String(roomId)) ||
    !isValidUUID(String(requestId)) ||
    !isValidUUID(String(messageId))
  ) {
    return { success: false, skipped: "invalid_input" };
  }

  const { data, error } = await withTimeout(
    supabase.functions.invoke("demo-dispatch-reply", {
      body: {
        roomId,
        requestId,
        messageId,
      },
    }),
    15000,
    "Demo dispatch reply timed out"
  );

  if (error) throw error;
  return data || { success: true };
}

/**
 * Marks a room as read up to a specific message (or latest if null).
 */
export async function markRoomRead(roomId, messageId = null) {
  if (!roomId || !isValidUUID(String(roomId))) {
    throw new Error("INVALID_INPUT|Valid room ID is required");
  }

  if (messageId && !isValidUUID(String(messageId))) {
    throw new Error("INVALID_INPUT|Valid message ID is required");
  }

  const { data, error } = await withRetry(
    () =>
      supabase.rpc("mark_emergency_chat_room_read", {
        p_room_id: roomId,
        p_message_id: messageId,
      }),
    { maxRetries: 3 }
  );

  if (error) throw error;

  return data === true;
}

// REALTIME SUBSCRIPTION

/**
 * Subscribes to message changes for a specific room.
 * Returns unsubscribe function.
 */
export function subscribeToMessages(roomId, onEvent, onStatus) {
  return communicationService.subscribeToMessages(roomId, onEvent, onStatus);
}

// SERVICE EXPORT

export const emergencyChatService = {
  mapRoomRow: mapEmergencyChatRoomRow,
  mapParticipantRow: mapEmergencyChatParticipantRow,
  mapMessageRow: mapEmergencyChatMessageRow,
  normalizeInput: normalizeEmergencyChatMessageInput,
  ensureRoomForRequest,
  listMessages,
  sendMessage,
  requestDemoDispatchReply,
  markRoomRead,
  subscribeToMessages,
};

export default emergencyChatService;
