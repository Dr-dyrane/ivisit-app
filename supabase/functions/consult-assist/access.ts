import { getAuthorizationHeader } from "../_shared/http/request.ts";
import {
  createServiceClient,
  createUserClient,
} from "../_shared/supabase/clients.ts";
import { type ConsultActorKind, PublicRequestError } from "./contracts.ts";

interface AuthenticatedActor {
  userId: string;
}

interface ConsultAccess {
  actorKind: ConsultActorKind;
}

const accessDenied = () =>
  new PublicRequestError(
    403,
    "consult_access_denied",
    "Consult unavailable or access denied.",
  );

const dataUnavailable = () =>
  new PublicRequestError(
    503,
    "consult_unavailable",
    "Consult access is temporarily unavailable.",
    { "Retry-After": "5" },
  );

export const authenticateActor = async (
  req: Request,
): Promise<AuthenticatedActor> => {
  const authHeader = getAuthorizationHeader(req);
  if (!/^Bearer\s+\S+$/i.test(authHeader)) {
    throw new PublicRequestError(
      401,
      "authentication_required",
      "Authentication required.",
    );
  }

  try {
    const anonClient = createUserClient(authHeader);
    const {
      data: { user },
      error,
    } = await anonClient.auth.getUser();

    if (error || !user?.id) {
      throw new PublicRequestError(
        401,
        "authentication_required",
        "Authentication required.",
      );
    }

    return { userId: user.id };
  } catch (error) {
    if (error instanceof PublicRequestError) throw error;
    throw dataUnavailable();
  }
};

// PULLBACK NOTE: Async consult content does not inherit emergency admin access.
// OLD: Emergency room helpers may authorize broad operational roles.
// NEW: Prove patient, assigned clinician, or explicit active participation only.
export const authorizeConsultAccess = async (
  roomId: string,
  userId: string,
): Promise<ConsultAccess> => {
  let serviceClient: ReturnType<typeof createServiceClient>;
  try {
    serviceClient = createServiceClient();
  } catch {
    throw dataUnavailable();
  }

  const { data: room, error: roomError } = await serviceClient
    .from("emergency_chat_rooms")
    .select("id, visit_id, channel_type, status")
    .eq("id", roomId)
    .maybeSingle();

  if (roomError) throw dataUnavailable();
  if (
    !room ||
    room.channel_type !== "telemedicine_async" ||
    room.status !== "active" ||
    !room.visit_id
  ) {
    throw accessDenied();
  }

  const { data: visit, error: visitError } = await serviceClient
    .from("visits")
    .select("id, user_id, doctor_id, care_mode, request_id, status")
    .eq("id", room.visit_id)
    .maybeSingle();

  if (visitError) throw dataUnavailable();
  if (
    !visit ||
    visit.care_mode !== "telemedicine_async" ||
    visit.request_id !== null ||
    !["upcoming", "in_progress"].includes(String(visit.status || ""))
  ) {
    throw accessDenied();
  }

  if (visit.user_id === userId) {
    return { actorKind: "patient" };
  }

  const doctorLookup = visit.doctor_id
    ? serviceClient
      .from("doctors")
      .select("profile_id")
      .eq("id", visit.doctor_id)
      .maybeSingle()
    : Promise.resolve({ data: null, error: null });
  const participantLookup = serviceClient
    .from("emergency_chat_participants")
    .select("role")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .is("left_at", null)
    .maybeSingle();

  const [doctorResult, participantResult] = await Promise.all([
    doctorLookup,
    participantLookup,
  ]);

  if (doctorResult.data?.profile_id === userId) {
    return { actorKind: "clinician" };
  }
  if (participantResult.data) {
    const role = String(participantResult.data.role || "").toLowerCase();
    if (role === "patient") return { actorKind: "patient" };
    if (["doctor", "provider"].includes(role)) {
      return { actorKind: "clinician" };
    }
    return { actorKind: "participant" };
  }

  if (doctorResult.error || participantResult.error) {
    throw dataUnavailable();
  }

  throw accessDenied();
};
