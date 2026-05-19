import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { jsonResponse, optionsResponse } from "../_shared/http/cors.ts";
import { getAuthorizationHeader, isOptionsRequest } from "../_shared/http/request.ts";
import { jsonErrorResponse } from "../_shared/http/response.ts";
import { createServiceClient, createUserClient } from "../_shared/supabase/clients.ts";

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

serve(async (req) => {
  if (isOptionsRequest(req)) {
    return optionsResponse();
  }

  try {
    const authHeader = getAuthorizationHeader(req);
    const userClient = createUserClient(authHeader);
    const adminClient = createServiceClient();

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

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
      .select("id, user_id, status, payment_status, hospital_id")
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
      return jsonResponse(
        { success: true, alreadyApproved: true, requestId, paymentId },
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
      return jsonResponse(
        { success: true, alreadyApproved: true, requestId, paymentId },
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

    return jsonResponse(
      { success: true, approved: true, requestId, paymentId, result: approvalResult },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonErrorResponse(message, 500);
  }
});
