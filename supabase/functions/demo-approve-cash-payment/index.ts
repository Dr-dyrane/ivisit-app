import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  ensureDemoEmergencyAccepted,
  isDemoHospitalRow,
} from "../_shared/domain/demo/emergencyLifecycle.ts";
import { jsonResponse, optionsResponse } from "../_shared/http/cors.ts";
import { isOptionsRequest } from "../_shared/http/request.ts";
import { jsonErrorResponse } from "../_shared/http/response.ts";
import { readAuthenticatedUser } from "../_shared/supabase/auth.ts";
import { createServiceClient } from "../_shared/supabase/clients.ts";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const hydrateApprovedRequest = async (adminClient: any, requestId: string) => {
  const { data: approvedRequest, error: approvedRequestError } =
    await adminClient
      .from("emergency_requests")
      .select(
        "id, display_id, user_id, status, payment_status, service_type, hospital_id, ambulance_id, responder_id, responder_name, responder_phone, responder_vehicle_type, responder_vehicle_plate, responder_location, responder_heading, responder_location_accuracy_meters, responder_location_observed_at, responder_location_received_at, responder_telemetry_sequence, responder_telemetry_lease_expires_at, patient_location, patient_acknowledged_arrival_at, current_responder_assignment_id, dispatch_organization_id, estimated_arrival, created_at, updated_at"
      )
      .eq("id", requestId)
      .maybeSingle();

  if (approvedRequestError) {
    throw new Error(
      `Approved request hydration failed: ${approvedRequestError.message}`,
    );
  }

  return approvedRequest;
};

const buildApprovalResult = (approvalResult: any, approvedRequest: any) => {
  if (!approvedRequest) return approvalResult;
  return {
    ...approvalResult,
    ambulance_id:
      approvalResult?.ambulance_id ?? approvedRequest.ambulance_id ?? null,
    responder_name:
      approvalResult?.responder_name ?? approvedRequest.responder_name ?? null,
    responder_phone:
      approvalResult?.responder_phone ?? approvedRequest.responder_phone ?? null,
    responder_vehicle_type:
      approvalResult?.responder_vehicle_type ??
      approvedRequest.responder_vehicle_type ??
      null,
    responder_vehicle_plate:
      approvalResult?.responder_vehicle_plate ??
      approvedRequest.responder_vehicle_plate ??
      null,
    request: approvedRequest,
  };
};

const settleDemoDispatch = async (
  adminClient: any,
  requestRow: any,
  userId: string,
) => {
  const requestStatus = String(requestRow?.status ?? "").trim().toLowerCase();
  const serviceType = String(requestRow?.service_type ?? "").trim().toLowerCase();
  if (serviceType !== "ambulance" || requestStatus === "completed") {
    return {
      success: true,
      ready: true,
      request: await hydrateApprovedRequest(adminClient, requestRow.id),
    };
  }
  return ensureDemoEmergencyAccepted(adminClient, requestRow.id, userId);
};

const approvalResponse = async ({
  adminClient,
  requestRow,
  userId,
  requestId,
  paymentId,
  approvalResult,
  alreadyApproved,
}: any) => {
  const dispatch = await settleDemoDispatch(adminClient, requestRow, userId);
  const approvedRequest =
    dispatch?.request || await hydrateApprovedRequest(adminClient, requestId);
  return jsonResponse(
    {
      success: true,
      approved: !alreadyApproved,
      alreadyApproved: Boolean(alreadyApproved),
      requestId,
      paymentId,
      dispatch: {
        success: dispatch?.success === true,
        ready: dispatch?.success === true && dispatch?.ready !== false,
        retryable: dispatch?.retryable === true,
        code: dispatch?.code || null,
        error: dispatch?.error || null,
      },
      result: buildApprovalResult(approvalResult, approvedRequest),
    },
    { status: 200 },
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
    const paymentId = String(body?.paymentId ?? "").trim();
    const requestId = String(body?.requestId ?? "").trim();

    if (!UUID_PATTERN.test(paymentId) || !UUID_PATTERN.test(requestId)) {
      return jsonErrorResponse("paymentId and requestId must be valid UUIDs", 400);
    }

    const { data: requestRow, error: requestError } = await adminClient
      .from("emergency_requests")
      .select("id, user_id, status, payment_status, service_type, hospital_id")
      .eq("id", requestId)
      .maybeSingle();

    if (requestError) {
      throw new Error(`Emergency request lookup failed: ${requestError.message}`);
    }

    if (!requestRow || String(requestRow.user_id) !== String(user.id)) {
      return jsonErrorResponse("Request not found for this user", 403);
    }

    const { data: hospitalRow, error: hospitalError } = await adminClient
      .from("hospitals")
      .select("id, place_id, verification_status, features")
      .eq("id", requestRow.hospital_id)
      .maybeSingle();

    if (hospitalError) {
      throw new Error(`Hospital lookup failed: ${hospitalError.message}`);
    }

    if (!isDemoHospitalRow(hospitalRow)) {
      return jsonErrorResponse(
        "Demo auto-approval is only allowed for demo hospitals",
        403,
      );
    }

    const { data: paymentRow, error: paymentError } = await adminClient
      .from("payments")
      .select("id, status, payment_method, emergency_request_id")
      .eq("id", paymentId)
      .eq("emergency_request_id", requestId)
      .maybeSingle();

    if (paymentError) {
      throw new Error(`Payment lookup failed: ${paymentError.message}`);
    }

    if (!paymentRow) {
      return jsonErrorResponse("Payment not found", 404);
    }

    const method = String(paymentRow.payment_method ?? "").trim().toLowerCase();
    const paymentRowStatus = String(paymentRow.status ?? "").trim().toLowerCase();
    const requestStatus = String(requestRow.status ?? "").trim().toLowerCase();
    const paymentStatus = String(requestRow.payment_status ?? "").trim().toLowerCase();

    if (method !== "cash") {
      return jsonErrorResponse(
        "Only cash payments can use the demo auto-approval lane",
        400,
      );
    }

    if (
      paymentRowStatus === "completed" ||
      ["accepted", "in_progress", "arrived", "completed"].includes(requestStatus) ||
      ["approved", "paid", "completed"].includes(paymentStatus)
    ) {
      return approvalResponse({
        adminClient,
        requestRow,
        userId: user.id,
        requestId,
        paymentId,
        approvalResult: { success: true },
        alreadyApproved: true,
      });
    }

    if (paymentRowStatus !== "pending") {
      return jsonErrorResponse(`Payment is not pending: ${paymentRowStatus}`, 400);
    }

    const { data: approvalResult, error: approvalError } = await adminClient.rpc(
      "approve_cash_payment",
      {
        p_payment_id: paymentId,
        p_request_id: requestId,
      }
    );

    if (approvalError) {
      throw new Error(`approve_cash_payment failed: ${approvalError.message}`);
    }

    if (!approvalResult?.success) {
      return jsonErrorResponse(approvalResult?.error || "Cash approval failed", 400);
    }

    const approvedRequestRow = {
      ...requestRow,
      status: approvalResult?.request_status || "in_progress",
      payment_status: "completed",
    };
    return approvalResponse({
      adminClient,
      requestRow: approvedRequestRow,
      userId: user.id,
      requestId,
      paymentId,
      approvalResult,
      alreadyApproved: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonErrorResponse(message, 500);
  }
});
