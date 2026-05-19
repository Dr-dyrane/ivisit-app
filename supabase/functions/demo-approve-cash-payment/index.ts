import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { jsonResponse, optionsResponse } from "../_shared/http/cors.ts";
import { isOptionsRequest } from "../_shared/http/request.ts";
import { jsonErrorResponse } from "../_shared/http/response.ts";
import { readAuthenticatedUser } from "../_shared/supabase/auth.ts";
import { createServiceClient } from "../_shared/supabase/clients.ts";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isDemoHospital = (hospital: any) => {
  const placeId = String(hospital?.place_id ?? "").trim().toLowerCase();
  const verificationStatus = String(hospital?.verification_status ?? "")
    .trim()
    .toLowerCase();
  const features = Array.isArray(hospital?.features)
    ? hospital.features.map((feature: unknown) => String(feature).trim().toLowerCase())
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

const hydrateApprovedRequest = async (adminClient: any, requestId: string) => {
  const { data: approvedRequest, error: approvedRequestError } =
    await adminClient
      .from("emergency_requests")
      .select(
        "id, display_id, status, payment_status, service_type, ambulance_id, responder_name, responder_phone, responder_vehicle_type, responder_vehicle_plate"
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

    const requestStatus = String(requestRow.status ?? "").trim().toLowerCase();
    const paymentStatus = String(requestRow.payment_status ?? "").trim().toLowerCase();
    if (
      ["accepted", "in_progress", "arrived", "completed"].includes(requestStatus) ||
      ["approved", "paid", "completed"].includes(paymentStatus)
    ) {
      const approvedRequest = await hydrateApprovedRequest(adminClient, requestId);
      return jsonResponse(
        {
          success: true,
          alreadyApproved: true,
          requestId,
          paymentId,
          result: buildApprovalResult({ success: true }, approvedRequest),
        },
        { status: 200 },
      );
    }

    const { data: hospitalRow, error: hospitalError } = await adminClient
      .from("hospitals")
      .select("id, place_id, verification_status, features")
      .eq("id", requestRow.hospital_id)
      .maybeSingle();

    if (hospitalError) {
      throw new Error(`Hospital lookup failed: ${hospitalError.message}`);
    }

    if (!isDemoHospital(hospitalRow)) {
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

    if (method !== "cash") {
      return jsonErrorResponse(
        "Only cash payments can use the demo auto-approval lane",
        400,
      );
    }

    if (paymentRowStatus === "completed") {
      const approvedRequest = await hydrateApprovedRequest(adminClient, requestId);
      return jsonResponse(
        {
          success: true,
          alreadyApproved: true,
          requestId,
          paymentId,
          result: buildApprovalResult({ success: true }, approvedRequest),
        },
        { status: 200 },
      );
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

    let approvedRequest = await hydrateApprovedRequest(adminClient, requestId);
    if (
      String(approvedRequest?.service_type ?? requestRow.service_type ?? "")
        .trim()
        .toLowerCase() === "ambulance" &&
      !approvedRequest?.ambulance_id
    ) {
      const { error: assignError } = await adminClient.rpc(
        "auto_assign_ambulance",
        {
          p_emergency_request_id: requestId,
          p_max_distance_km: 50,
          p_specialty_required: null,
        },
      );

      if (assignError) {
        console.warn(
          "[demo-approve-cash-payment] demo ambulance auto-assign fallback failed",
          assignError.message,
        );
      } else {
        approvedRequest = await hydrateApprovedRequest(adminClient, requestId);
      }
    }

    return jsonResponse(
      {
        success: true,
        approved: true,
        requestId,
        paymentId,
        result: buildApprovalResult(approvalResult, approvedRequest),
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonErrorResponse(message, 500);
  }
});
