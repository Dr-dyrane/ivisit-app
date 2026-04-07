import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error("Supabase environment is not configured");
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: authHeader ? { headers: { Authorization: authHeader } } : undefined,
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user?.id) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const paymentId = String(body?.paymentId ?? "").trim();
    const requestId = String(body?.requestId ?? "").trim();

    if (!UUID_PATTERN.test(paymentId) || !UUID_PATTERN.test(requestId)) {
      return new Response(
        JSON.stringify({ success: false, error: "paymentId and requestId must be valid UUIDs" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
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
      return new Response(
        JSON.stringify({ success: false, error: "Request not found for this user" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const requestStatus = String(requestRow.status ?? "").trim().toLowerCase();
    const paymentStatus = String(requestRow.payment_status ?? "").trim().toLowerCase();
    if (
      ["accepted", "in_progress", "arrived", "completed"].includes(requestStatus) ||
      ["approved", "paid", "completed"].includes(paymentStatus)
    ) {
      return new Response(
        JSON.stringify({ success: true, alreadyApproved: true, requestId, paymentId }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
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
      return new Response(
        JSON.stringify({ success: false, error: "Demo auto-approval is only allowed for demo hospitals" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
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
      return new Response(JSON.stringify({ success: false, error: "Payment not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const method = String(paymentRow.payment_method ?? "").trim().toLowerCase();
    const paymentRowStatus = String(paymentRow.status ?? "").trim().toLowerCase();

    if (method !== "cash") {
      return new Response(
        JSON.stringify({ success: false, error: "Only cash payments can use the demo auto-approval lane" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (paymentRowStatus === "completed") {
      return new Response(
        JSON.stringify({ success: true, alreadyApproved: true, requestId, paymentId }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (paymentRowStatus !== "pending") {
      return new Response(
        JSON.stringify({ success: false, error: `Payment is not pending: ${paymentRowStatus}` }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
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
      return new Response(
        JSON.stringify({ success: false, error: approvalResult?.error || "Cash approval failed" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, approved: true, requestId, paymentId, result: approvalResult }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
