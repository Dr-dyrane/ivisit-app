import { supabase } from "./supabase";
import { isValidUUID } from "./displayIdService";
import { withRetry } from "./supabaseHelpers";

export const COMMUNICATION_MESSAGE_PAGE_SIZE = 30;
export const COMMUNICATION_MESSAGE_MAX_PAGE_SIZE = 100;

const ROOM_SELECT_FIELDS = [
  "id",
  "emergency_request_id",
  "visit_id",
  "channel_type",
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
  "attachment_storage_path",
  "attachment_mime_type",
  "attachment_size_bytes",
  "attachment_duration_ms",
  "ai_assisted",
  "created_at",
  "updated_at",
  "edited_at",
  "deleted_at",
].join(", ");

const toText = (value) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const toFiniteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const mapCommunicationRoomRow = (row) => {
  if (!row || typeof row !== "object") return null;
  return {
    id: toText(row.id),
    emergencyRequestId: toText(row.emergency_request_id),
    visitId: toText(row.visit_id),
    channelType: toText(row.channel_type) || "emergency",
    createdBy: toText(row.created_by),
    status: toText(row.status) || "active",
    createdAt: toText(row.created_at),
    updatedAt: toText(row.updated_at),
    lastMessageAt: toText(row.last_message_at),
    archivedAt: toText(row.archived_at),
  };
};

export const mapCommunicationParticipantRow = (row) => {
  if (!row || typeof row !== "object") return null;
  return {
    id: toText(row.id),
    roomId: toText(row.room_id),
    userId: toText(row.user_id),
    role: toText(row.role),
    displayNameSnapshot: toText(row.display_name_snapshot),
    joinedAt: toText(row.joined_at),
    leftAt: toText(row.left_at),
    lastReadMessageId: toText(row.last_read_message_id),
    lastReadAt: toText(row.last_read_at),
    createdAt: toText(row.created_at),
    updatedAt: toText(row.updated_at),
  };
};

export const mapCommunicationMessageRow = (row) => {
  if (!row || typeof row !== "object") return null;
  return {
    id: toText(row.id),
    roomId: toText(row.room_id),
    senderId: toText(row.sender_id),
    senderRole: toText(row.sender_role),
    kind: toText(row.kind) || "text",
    body: typeof row.body === "string" ? row.body.trim() : "",
    clientMessageId: toText(row.client_message_id),
    metadata:
      row.metadata && typeof row.metadata === "object" ? row.metadata : {},
    attachmentStoragePath: toText(row.attachment_storage_path),
    attachmentMimeType: toText(row.attachment_mime_type),
    attachmentSizeBytes: toFiniteNumber(row.attachment_size_bytes),
    attachmentDurationMs: toFiniteNumber(row.attachment_duration_ms),
    aiAssisted: row.ai_assisted === true,
    createdAt: toText(row.created_at),
    updatedAt: toText(row.updated_at),
    editedAt: toText(row.edited_at),
    deletedAt: toText(row.deleted_at),
  };
};

const normalizeCursor = (cursor) => {
  if (!cursor || typeof cursor !== "object") return null;
  const createdAt = toText(cursor.createdAt);
  const id = toText(cursor.id);
  if (!createdAt || Number.isNaN(Date.parse(createdAt)) || !isValidUUID(id)) {
    return null;
  }
  return { createdAt, id };
};

const quoteFilterValue = (value) =>
  `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

export const communicationService = {
  mapRoomRow: mapCommunicationRoomRow,
  mapParticipantRow: mapCommunicationParticipantRow,
  mapMessageRow: mapCommunicationMessageRow,

  async getRoom(roomId) {
    if (!roomId || !isValidUUID(String(roomId))) return null;
    const { data, error } = await supabase
      .from("emergency_chat_rooms")
      .select(ROOM_SELECT_FIELDS)
      .eq("id", roomId)
      .maybeSingle();
    if (error) throw error;
    return mapCommunicationRoomRow(data);
  },

  async getRoomByVisit(visitId) {
    if (!visitId || !isValidUUID(String(visitId))) return null;
    const { data, error } = await supabase
      .from("emergency_chat_rooms")
      .select(ROOM_SELECT_FIELDS)
      .eq("visit_id", visitId)
      .eq("channel_type", "telemedicine_async")
      .maybeSingle();
    if (error) throw error;
    return mapCommunicationRoomRow(data);
  },

  async listParticipants(roomId) {
    if (!roomId || !isValidUUID(String(roomId))) return [];
    const { data, error } = await supabase
      .from("emergency_chat_participants")
      .select(PARTICIPANT_SELECT_FIELDS)
      .eq("room_id", roomId)
      .is("left_at", null)
      .order("joined_at", { ascending: true });
    if (error) throw error;
    return (data || []).map(mapCommunicationParticipantRow).filter(Boolean);
  },

  async listMessages(
    roomId,
    { limit = COMMUNICATION_MESSAGE_PAGE_SIZE, before = null } = {},
  ) {
    if (!roomId || !isValidUUID(String(roomId))) {
      return { items: [], nextCursor: null };
    }

    const safeLimit = Math.min(
      Math.max(Number(limit) || COMMUNICATION_MESSAGE_PAGE_SIZE, 1),
      COMMUNICATION_MESSAGE_MAX_PAGE_SIZE,
    );
    let query = supabase
      .from("emergency_chat_messages")
      .select(MESSAGE_SELECT_FIELDS)
      .eq("room_id", roomId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(safeLimit);

    const cursor = normalizeCursor(before);
    if (cursor) {
      const timestamp = quoteFilterValue(cursor.createdAt);
      query = query.or(
        `created_at.lt.${timestamp},and(created_at.eq.${timestamp},id.lt.${cursor.id})`,
      );
    }

    const { data, error } = await withRetry(() => query, { maxRetries: 2 });
    if (error) throw error;

    const descending = (data || [])
      .map(mapCommunicationMessageRow)
      .filter(Boolean);
    const oldest = descending[descending.length - 1] || null;
    return {
      items: descending.reverse(),
      nextCursor:
        descending.length === safeLimit && oldest?.createdAt && oldest?.id
          ? { createdAt: oldest.createdAt, id: oldest.id }
          : null,
    };
  },

  subscribeToMessages(roomId, onEvent, onStatus) {
    if (
      !roomId ||
      !isValidUUID(String(roomId)) ||
      typeof onEvent !== "function"
    ) {
      return { unsubscribe: () => {} };
    }

    const channel = supabase
      .channel(`communication_messages_${roomId}_${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "emergency_chat_messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          onEvent({
            new: payload.new
              ? mapCommunicationMessageRow(payload.new)
              : null,
            old: payload.old
              ? mapCommunicationMessageRow(payload.old)
              : null,
            eventType: payload.eventType,
          });
        },
      )
      .subscribe((status) => onStatus?.(status));

    return {
      unsubscribe: () => {
        supabase.removeChannel(channel);
      },
    };
  },

  subscribeToRoom(roomId, onEvent, onStatus) {
    if (
      !roomId ||
      !isValidUUID(String(roomId)) ||
      typeof onEvent !== "function"
    ) {
      return { unsubscribe: () => {} };
    }

    const channel = supabase
      .channel(`communication_room_${roomId}_${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "emergency_chat_rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          onEvent({
            new: payload.new ? mapCommunicationRoomRow(payload.new) : null,
            old: payload.old ? mapCommunicationRoomRow(payload.old) : null,
            eventType: payload.eventType,
          });
        },
      )
      .subscribe((status) => onStatus?.(status));

    return {
      unsubscribe: () => {
        supabase.removeChannel(channel);
      },
    };
  },
};

export default communicationService;
