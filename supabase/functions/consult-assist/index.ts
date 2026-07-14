import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { authenticateActor, authorizeConsultAccess } from "./access.ts";
import { generateConsultDraft } from "./anthropic.ts";
import {
  parseConsultAssistRequest,
  PublicRequestError,
  takeDraftRateLimitSlot,
} from "./contracts.ts";

const BASE_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Expose-Headers": "Retry-After, X-Request-Id",
  "Access-Control-Max-Age": "86400",
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
  "X-Content-Type-Options": "nosniff",
};

const response = (
  body: Record<string, unknown>,
  status: number,
  requestId: string,
  headers: Record<string, string> = {},
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...BASE_HEADERS,
      ...headers,
      "X-Request-Id": requestId,
    },
  });

serve(async (req: Request) => {
  const requestId = crypto.randomUUID();

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: { ...BASE_HEADERS, "X-Request-Id": requestId },
    });
  }

  if (req.method !== "POST") {
    return response(
      {
        success: false,
        code: "method_not_allowed",
        error: "Method not allowed.",
        request_id: requestId,
      },
      405,
      requestId,
      { Allow: "POST, OPTIONS" },
    );
  }

  try {
    const actor = await authenticateActor(req);
    takeDraftRateLimitSlot(actor.userId);

    const input = await parseConsultAssistRequest(req);
    const access = await authorizeConsultAccess(input.roomId, actor.userId);
    const draft = await generateConsultDraft(
      input,
      access.actorKind,
      requestId,
    );

    return response(
      {
        success: true,
        draft,
        ai_assisted: true,
        scope:
          "Draft only. Review before sending. This does not diagnose or prescribe.",
        request_id: requestId,
      },
      200,
      requestId,
    );
  } catch (error) {
    if (error instanceof PublicRequestError) {
      if (error.status >= 500) {
        console.error(`[consult-assist:${requestId}] request failed`, {
          code: error.code,
        });
      }
      return response(
        {
          success: false,
          code: error.code,
          error: error.message,
          request_id: requestId,
        },
        error.status,
        requestId,
        error.responseHeaders,
      );
    }

    console.error(`[consult-assist:${requestId}] unexpected failure`);
    return response(
      {
        success: false,
        code: "internal_error",
        error: "Draft assistance is temporarily unavailable.",
        request_id: requestId,
      },
      500,
      requestId,
      { "Retry-After": "15" },
    );
  }
});
