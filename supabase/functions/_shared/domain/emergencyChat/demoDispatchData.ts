import { toText } from "./text.ts";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isUuid = (value: string) => UUID_PATTERN.test(value);

export const isDemoHospital = (hospital: any) => {
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

export const findActiveParticipant = async (
  adminClient: any,
  roomId: string,
  userId: string,
) => {
  const { data, error } = await adminClient
    .from("emergency_chat_participants")
    .select("id, role")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .is("left_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(`Participant lookup failed: ${error.message}`);
  }
  return data;
};

export const findAvailableRoom = async (
  adminClient: any,
  roomId: string,
  requestId: string,
) => {
  const { data, error } = await adminClient
    .from("emergency_chat_rooms")
    .select("id, emergency_request_id, status")
    .eq("id", roomId)
    .eq("emergency_request_id", requestId)
    .maybeSingle();

  if (error) {
    throw new Error(`Room lookup failed: ${error.message}`);
  }
  return data;
};

export const findSourceMessage = async (
  adminClient: any,
  roomId: string,
  messageId: string,
) => {
  const { data, error } = await adminClient
    .from("emergency_chat_messages")
    .select("id, room_id, sender_id, sender_role, kind, body, metadata, created_at")
    .eq("id", messageId)
    .eq("room_id", roomId)
    .maybeSingle();

  if (error) {
    throw new Error(`Message lookup failed: ${error.message}`);
  }
  return data;
};

export const findEmergencyRequest = async (
  adminClient: any,
  requestId: string,
) => {
  const { data, error } = await adminClient
    .from("emergency_requests")
    .select("id, user_id, hospital_id, hospital_name, service_type, status, display_id")
    .eq("id", requestId)
    .maybeSingle();

  if (error) {
    throw new Error(`Emergency request lookup failed: ${error.message}`);
  }
  return data;
};

export const findHospitalForRequest = async (
  adminClient: any,
  hospitalId: string | null | undefined,
) => {
  if (!hospitalId) return null;

  const { data, error } = await adminClient
    .from("hospitals")
    .select("id, name, place_id, verification_status, features")
    .eq("id", hospitalId)
    .maybeSingle();

  if (error) {
    throw new Error(`Hospital lookup failed: ${error.message}`);
  }
  return data;
};

export const findExistingDemoReply = async (
  adminClient: any,
  roomId: string,
  clientMessageId: string,
) => {
  const { data, error } = await adminClient
    .from("emergency_chat_messages")
    .select("id")
    .eq("room_id", roomId)
    .eq("client_message_id", clientMessageId)
    .maybeSingle();

  if (error) {
    throw new Error(`Existing reply lookup failed: ${error.message}`);
  }
  return data;
};

export const listRecentRoomMessages = async (
  adminClient: any,
  roomId: string,
) => {
  const { data, error } = await adminClient
    .from("emergency_chat_messages")
    .select("sender_role, kind, body, created_at")
    .eq("room_id", roomId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) {
    throw new Error(`Recent messages lookup failed: ${error.message}`);
  }
  return data || [];
};

export const insertDemoDispatchReply = async (
  adminClient: any,
  roomId: string,
  messageId: string,
  clientMessageId: string,
  reply: string,
  provider: string,
) => {
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

  return inserted;
};
