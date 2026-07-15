import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  completeDemoEmergency,
  ensureDemoEmergencyAccepted,
  markDemoEmergencyArrived,
  reportDemoEmergencyTelemetry,
} from "../_shared/domain/demo/emergencyLifecycle.ts";
import { jsonResponse, optionsResponse } from "../_shared/http/cors.ts";
import { isOptionsRequest } from "../_shared/http/request.ts";
import { jsonErrorResponse } from "../_shared/http/response.ts";
import { readAuthenticatedUser } from "../_shared/supabase/auth.ts";
import { createServiceClient } from "../_shared/supabase/clients.ts";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ACTIONS = new Set([
  "ensure_dispatch",
  "report_telemetry",
  "mark_arrived",
  "mark_completed",
]);

serve(async (req) => {
  if (isOptionsRequest(req)) return optionsResponse();

  try {
    const { user, error: userError } = await readAuthenticatedUser(req);
    if (userError || !user?.id) return jsonErrorResponse("Unauthorized", 401);

    const body = await req.json();
    const requestId = String(body?.requestId ?? "").trim();
    const action = String(body?.action ?? "").trim().toLowerCase();
    if (!UUID_PATTERN.test(requestId) || !ACTIONS.has(action)) {
      return jsonErrorResponse("A valid requestId and action are required", 400);
    }

    const adminClient = createServiceClient();
    const result = action === "mark_completed"
      ? await completeDemoEmergency(adminClient, requestId, user.id)
      : action === "mark_arrived"
        ? await markDemoEmergencyArrived(adminClient, requestId, user.id)
        : action === "report_telemetry"
        ? await reportDemoEmergencyTelemetry(
            adminClient,
            requestId,
            user.id,
            body?.telemetry || {},
          )
        : await ensureDemoEmergencyAccepted(adminClient, requestId, user.id);

    if (!result.success && result.code === "REQUEST_OWNERSHIP_MISMATCH") {
      return jsonErrorResponse("Request not found for this user", 403);
    }
    if (!result.success && result.code === "NOT_DEMO_HOSPITAL") {
      return jsonErrorResponse(result.error || "Demo lifecycle unavailable", 403);
    }

    return jsonResponse(
      {
        action,
        ...result,
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonErrorResponse(message, 500);
  }
});
