import { jsonResponse } from "./cors.ts";

export const jsonErrorResponse = (
  error: string,
  status = 400,
  extra: Record<string, unknown> = {},
): Response =>
  jsonResponse(
    {
      success: false,
      error,
      ...extra,
    },
    { status },
  );

export const methodNotAllowedResponse = (): Response =>
  jsonErrorResponse("Method not allowed", 405);
