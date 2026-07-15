type DemoLifecycleResult = {
  success: boolean;
  ready?: boolean;
  retryable?: boolean;
  code?: string;
  error?: string;
  request?: any;
  assignment?: any;
  ambulance?: any;
  [key: string]: any;
};

const TERMINAL_STATUSES = new Set([
  "cancelled",
  "completed",
  "payment_declined",
]);

const toStatus = (value: unknown) => String(value ?? "").trim().toLowerCase();

const rpcFailure = (
  label: string,
  result: any,
  error: any,
  fallbackCode: string,
): DemoLifecycleResult | null => {
  if (error) {
    return {
      success: false,
      retryable: false,
      code: fallbackCode,
      error: `${label} failed: ${error.message}`,
    };
  }
  if (result?.success === true) return null;
  return {
    success: false,
    retryable:
      result?.code === "NO_AMBULANCE_AVAILABLE" ||
      result?.code === "OFFER_EXPIRED_REQUEUED",
    code: result?.code || fallbackCode,
    error: result?.error || `${label} failed`,
    result,
  };
};

export const isDemoHospitalRow = (hospital: any): boolean => {
  const placeId = String(hospital?.place_id ?? "").trim().toLowerCase();
  const verificationStatus = String(hospital?.verification_status ?? "")
    .trim()
    .toLowerCase();
  const features = Array.isArray(hospital?.features)
    ? hospital.features.map((feature: unknown) =>
        String(feature).trim().toLowerCase()
      )
    : [];

  return (
    placeId.startsWith("demo:") ||
    verificationStatus.startsWith("demo") ||
    features.includes("demo_seed") ||
    features.includes("demo_verified") ||
    features.includes("demo_complete") ||
    features.includes("ivisit_demo") ||
    features.some(
      (feature: string) =>
        feature.startsWith("demo_scope:") ||
        feature.startsWith("demo_owner:")
    )
  );
};

const readDemoEmergencyContext = async (
  adminClient: any,
  requestId: string,
): Promise<DemoLifecycleResult> => {
  const { data: request, error: requestError } = await adminClient
    .from("emergency_requests")
    .select(
      "id, display_id, user_id, status, payment_status, service_type, hospital_id, ambulance_id, responder_id, responder_name, responder_phone, responder_vehicle_type, responder_vehicle_plate, responder_location, responder_heading, responder_location_accuracy_meters, responder_location_observed_at, responder_location_received_at, responder_telemetry_sequence, responder_telemetry_lease_expires_at, patient_location, patient_acknowledged_arrival_at, current_responder_assignment_id, dispatch_organization_id, estimated_arrival, created_at, updated_at"
    )
    .eq("id", requestId)
    .maybeSingle();

  if (requestError) {
    return {
      success: false,
      code: "REQUEST_LOOKUP_FAILED",
      error: `Emergency request lookup failed: ${requestError.message}`,
    };
  }
  if (!request) {
    return {
      success: false,
      code: "REQUEST_NOT_FOUND",
      error: "Emergency request not found",
    };
  }

  const { data: hospital, error: hospitalError } = await adminClient
    .from("hospitals")
    .select(
      "id, organization_id, place_id, verification_status, features, coordinates, latitude, longitude"
    )
    .eq("id", request.hospital_id)
    .maybeSingle();

  if (hospitalError) {
    return {
      success: false,
      code: "HOSPITAL_LOOKUP_FAILED",
      error: `Hospital lookup failed: ${hospitalError.message}`,
    };
  }
  if (!hospital || !isDemoHospitalRow(hospital)) {
    return {
      success: false,
      code: "NOT_DEMO_HOSPITAL",
      error: "Demo responder lifecycle is only available for demo hospitals",
    };
  }

  let assignment = null;
  if (request.current_responder_assignment_id) {
    const { data, error } = await adminClient
      .from("emergency_responder_assignments")
      .select(
        "id, emergency_request_id, organization_id, ambulance_id, responder_id, status, offered_at, accepted_at, arrived_at, completed_at, offer_expires_at, telemetry_sequence, telemetry_lease_expires_at"
      )
      .eq("id", request.current_responder_assignment_id)
      .maybeSingle();
    if (error) {
      return {
        success: false,
        code: "ASSIGNMENT_LOOKUP_FAILED",
        error: `Responder assignment lookup failed: ${error.message}`,
      };
    }
    assignment = data ?? null;
  }

  const ambulanceId = assignment?.ambulance_id || request.ambulance_id || null;
  let ambulance = null;
  if (ambulanceId) {
    const { data, error } = await adminClient
      .from("ambulances")
      .select(
        "id, organization_id, hospital_id, profile_id, status, current_call, location, heading, location_accuracy_meters, location_observed_at, location_received_at, telemetry_sequence, telemetry_lease_expires_at"
      )
      .eq("id", ambulanceId)
      .maybeSingle();
    if (error) {
      return {
        success: false,
        code: "AMBULANCE_LOOKUP_FAILED",
        error: `Ambulance lookup failed: ${error.message}`,
      };
    }
    ambulance = data ?? null;
  }

  return {
    success: true,
    ready: true,
    request,
    hospital,
    assignment,
    ambulance,
  };
};

export const ensureDemoEmergencyAccepted = async (
  adminClient: any,
  requestId: string,
  expectedUserId?: string | null,
): Promise<DemoLifecycleResult> => {
  let context = await readDemoEmergencyContext(adminClient, requestId);
  if (!context.success) return context;

  if (
    expectedUserId &&
    String(context.request?.user_id ?? "") !== String(expectedUserId)
  ) {
    return {
      success: false,
      code: "REQUEST_OWNERSHIP_MISMATCH",
      error: "Emergency request is not owned by this user",
    };
  }

  if (toStatus(context.request?.service_type) !== "ambulance") {
    return {
      success: false,
      code: "NOT_AMBULANCE_REQUEST",
      error: "Demo responder lifecycle only supports ambulance requests",
    };
  }

  let status = toStatus(context.request?.status);
  if (TERMINAL_STATUSES.has(status)) {
    return {
      success: false,
      code: "REQUEST_TERMINAL",
      error: `Emergency request is already ${status}`,
      request: context.request,
    };
  }
  if (status === "pending_approval") {
    return {
      success: false,
      retryable: true,
      code: "PAYMENT_NOT_READY",
      error: "Emergency payment is not dispatch ready",
      request: context.request,
    };
  }
  if (status === "accepted" || status === "arrived") {
    return context;
  }
  if (status !== "in_progress") {
    return {
      success: false,
      code: "REQUEST_NOT_DISPATCH_READY",
      error: `Emergency request cannot be dispatched from ${status || "unknown"}`,
      request: context.request,
    };
  }

  if (!context.assignment?.id) {
    await refreshDemoAvailableFleetTelemetry(adminClient, context);
    const { data: assignResult, error: assignError } = await adminClient.rpc(
      "auto_assign_ambulance",
      {
        p_emergency_request_id: requestId,
        p_max_distance_km: 50,
        p_specialty_required: null,
      },
    );
    const failure = rpcFailure(
      "Demo ambulance assignment",
      assignResult,
      assignError,
      "DEMO_ASSIGNMENT_FAILED",
    );
    if (failure) return failure;

    context = await readDemoEmergencyContext(adminClient, requestId);
    if (!context.success) return context;
  }

  status = toStatus(context.request?.status);
  const assignmentStatus = toStatus(context.assignment?.status);
  if (status === "accepted" || status === "arrived") return context;
  if (!context.assignment?.id || assignmentStatus !== "offered") {
    return {
      success: false,
      retryable: true,
      code: "DEMO_ASSIGNMENT_NOT_ACCEPT_READY",
      error: "Demo responder assignment is not ready to accept",
      request: context.request,
      assignment: context.assignment,
    };
  }

  const { data: acceptResult, error: acceptError } = await adminClient.rpc(
    "responder_accept_emergency",
    { p_request_id: requestId },
  );
  const acceptFailure = rpcFailure(
    "Demo responder acceptance",
    acceptResult,
    acceptError,
    "DEMO_ACCEPTANCE_FAILED",
  );
  if (acceptFailure) return acceptFailure;

  context = await readDemoEmergencyContext(adminClient, requestId);
  if (!context.success) return context;
  status = toStatus(context.request?.status);
  if (status !== "accepted" && status !== "arrived") {
    return {
      success: false,
      retryable: true,
      code: "DEMO_ACCEPTANCE_NOT_VISIBLE",
      error: "Demo responder acceptance did not reach canonical request state",
      request: context.request,
      assignment: context.assignment,
    };
  }

  return context;
};

const normalizePoint = (value: any): { lat: number; lng: number } | null => {
  if (!value) return null;
  if (typeof value === "string") {
    const pointMatch = value
      .trim()
      .match(/^POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)$/i);
    if (pointMatch) {
      return { lng: Number(pointMatch[1]), lat: Number(pointMatch[2]) };
    }
    try {
      return normalizePoint(JSON.parse(value));
    } catch (_error) {
      return null;
    }
  }
  if (typeof value !== "object") return null;
  if (Array.isArray(value.coordinates) && value.coordinates.length >= 2) {
    const lng = Number(value.coordinates[0]);
    const lat = Number(value.coordinates[1]);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  }
  const lat = Number(value.lat ?? value.latitude);
  const lng = Number(value.lng ?? value.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
};

const refreshDemoAvailableFleetTelemetry = async (
  adminClient: any,
  context: DemoLifecycleResult,
): Promise<number> => {
  const organizationId = context.hospital?.organization_id;
  if (!organizationId) return 0;

  const { data: ambulances, error } = await adminClient
    .from("ambulances")
    .select("id, location, heading, telemetry_sequence")
    .eq("organization_id", organizationId)
    .eq("status", "available")
    .is("current_call", null)
    .limit(12);
  if (error) return 0;

  const fallbackLocation =
    normalizePoint(context.hospital?.coordinates) ||
    normalizePoint({
      latitude: context.hospital?.latitude,
      longitude: context.hospital?.longitude,
    }) ||
    normalizePoint(context.request?.patient_location);
  let refreshedCount = 0;

  for (const ambulance of Array.isArray(ambulances) ? ambulances : []) {
    const location = normalizePoint(ambulance?.location) || fallbackLocation;
    if (!ambulance?.id || !location) continue;
    const { data: telemetryResult, error: telemetryError } = await adminClient.rpc(
      "report_responder_telemetry",
      {
        p_payload: {
          ambulance_id: ambulance.id,
          sequence: Math.max(0, Number(ambulance.telemetry_sequence) || 0) + 1,
          observed_at: new Date().toISOString(),
          heading: Number.isFinite(Number(ambulance.heading))
            ? Number(ambulance.heading)
            : 0,
          accuracy_meters: 10,
          location,
        },
      },
    );
    if (!telemetryError && telemetryResult?.success === true) {
      refreshedCount += 1;
    }
  }

  return refreshedCount;
};

const reportDemoTelemetryForContext = async (
  adminClient: any,
  context: DemoLifecycleResult,
  telemetry: any = {},
): Promise<DemoLifecycleResult> => {
  const request = context.request;
  const assignment = context.assignment;
  const location =
    normalizePoint(telemetry?.location) ||
    normalizePoint(request?.patient_location) ||
    normalizePoint(context.ambulance?.location) ||
    normalizePoint(request?.responder_location);

  if (!assignment?.id || !context.ambulance?.id || !location) {
    return {
      success: false,
      code: "DEMO_ARRIVAL_LOCATION_UNAVAILABLE",
      error: "Demo responder arrival needs an assigned ambulance and location",
    };
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const ambulance = context.ambulance;
    const sequence = Math.max(0, Number(ambulance.telemetry_sequence) || 0) + 1;
    const observedAt = new Date().toISOString();
    const { data, error } = await adminClient.rpc("report_responder_telemetry", {
      p_payload: {
        ambulance_id: ambulance.id,
        request_id: request.id,
        assignment_id: assignment.id,
        sequence,
        observed_at: observedAt,
        heading: Number.isFinite(Number(telemetry?.heading))
          ? Number(telemetry.heading)
          : Number.isFinite(Number(ambulance.heading))
            ? Number(ambulance.heading)
            : 0,
        accuracy_meters: Number.isFinite(Number(telemetry?.accuracyMeters))
          ? Math.max(0, Math.min(5000, Number(telemetry.accuracyMeters)))
          : 0,
        location,
      },
    });
    const failure = rpcFailure(
      "Demo responder telemetry",
      data,
      error,
      "DEMO_TELEMETRY_FAILED",
    );
    if (!failure) return { success: true, ready: true, telemetry: data };
    if (data?.code !== "STALE_SEQUENCE" && data?.code !== "SEQUENCE_CONFLICT") {
      return failure;
    }

    const refreshed = await readDemoEmergencyContext(adminClient, request.id);
    if (!refreshed.success) return refreshed;
    context = refreshed;
  }

  return {
    success: false,
    retryable: true,
    code: "DEMO_TELEMETRY_RETRY_EXHAUSTED",
    error: "Demo responder telemetry could not converge",
  };
};

export const reportDemoEmergencyTelemetry = async (
  adminClient: any,
  requestId: string,
  expectedUserId?: string | null,
  telemetry: any = {},
): Promise<DemoLifecycleResult> => {
  let context = await ensureDemoEmergencyAccepted(
    adminClient,
    requestId,
    expectedUserId,
  );
  if (!context.success) return context;
  if (["arrived", "completed"].includes(toStatus(context.request?.status))) {
    return context;
  }

  const telemetryResult = await reportDemoTelemetryForContext(
    adminClient,
    context,
    telemetry,
  );
  if (!telemetryResult.success) return telemetryResult;
  context = await readDemoEmergencyContext(adminClient, requestId);
  return {
    ...context,
    telemetry: telemetryResult.telemetry,
  };
};

export const markDemoEmergencyArrived = async (
  adminClient: any,
  requestId: string,
  expectedUserId?: string | null,
): Promise<DemoLifecycleResult> => {
  let context = await ensureDemoEmergencyAccepted(
    adminClient,
    requestId,
    expectedUserId,
  );
  if (!context.success) return context;
  if (toStatus(context.request?.status) === "arrived") return context;

  const telemetryResult = await reportDemoTelemetryForContext(adminClient, context, {
    location: context.request?.patient_location,
    accuracyMeters: 5,
  });
  if (!telemetryResult.success) return telemetryResult;

  const { data: arrivalResult, error: arrivalError } = await adminClient.rpc(
    "responder_arrive_emergency",
    { p_request_id: requestId },
  );
  const arrivalFailure = rpcFailure(
    "Demo responder arrival",
    arrivalResult,
    arrivalError,
    "DEMO_ARRIVAL_FAILED",
  );
  if (arrivalFailure) {
    const refreshed = await readDemoEmergencyContext(adminClient, requestId);
    if (
      refreshed.success &&
      ["arrived", "completed"].includes(toStatus(refreshed.request?.status))
    ) {
      return refreshed;
    }
    return arrivalFailure;
  }

  context = await readDemoEmergencyContext(adminClient, requestId);
  return context;
};

export const completeDemoEmergency = async (
  adminClient: any,
  requestId: string,
  expectedUserId?: string | null,
): Promise<DemoLifecycleResult> => {
  let context = await readDemoEmergencyContext(adminClient, requestId);
  if (!context.success) return context;

  if (
    expectedUserId &&
    String(context.request?.user_id ?? "") !== String(expectedUserId)
  ) {
    return {
      success: false,
      code: "REQUEST_OWNERSHIP_MISMATCH",
      error: "Emergency request is not owned by this user",
    };
  }

  const status = toStatus(context.request?.status);
  if (status === "completed") return context;
  if (status !== "arrived") {
    return {
      success: false,
      retryable: true,
      code: "DEMO_COMPLETION_NOT_READY",
      error: "Demo responder completion requires canonical arrival",
      request: context.request,
      assignment: context.assignment,
    };
  }
  if (!context.request?.patient_acknowledged_arrival_at) {
    return {
      success: false,
      retryable: true,
      code: "PATIENT_ARRIVAL_ACKNOWLEDGEMENT_REQUIRED",
      error: "Patient arrival confirmation is required before demo completion",
      request: context.request,
      assignment: context.assignment,
    };
  }

  const { data: completionResult, error: completionError } =
    await adminClient.rpc("responder_complete_emergency", {
      p_request_id: requestId,
    });
  const completionFailure = rpcFailure(
    "Demo responder completion",
    completionResult,
    completionError,
    "DEMO_COMPLETION_FAILED",
  );
  if (completionFailure) {
    const refreshed = await readDemoEmergencyContext(adminClient, requestId);
    if (
      refreshed.success &&
      toStatus(refreshed.request?.status) === "completed"
    ) {
      return refreshed;
    }
    return completionFailure;
  }

  context = await readDemoEmergencyContext(adminClient, requestId);
  return context;
};
