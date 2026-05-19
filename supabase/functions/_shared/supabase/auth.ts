import { getAuthorizationHeader } from "../http/request.ts";
import { createUserClient } from "./clients.ts";

export const probeOptionalAuthHeader = async (
  req: Request,
  logPrefix: string,
): Promise<{
  authHeader: string;
  valid: boolean;
  user: any | null;
  error: any | null;
}> => {
  const authHeader = getAuthorizationHeader(req);
  if (!authHeader) {
    return {
      authHeader,
      valid: false,
      user: null,
      error: null,
    };
  }

  try {
    const authClient = createUserClient(authHeader);
    const {
      data: { user },
      error,
    } = await authClient.auth.getUser();
    const valid = !error && !!user;
    console.log(`[${logPrefix}] auth header present`, { valid });

    return {
      authHeader,
      valid,
      user: user ?? null,
      error: error ?? null,
    };
  } catch (error) {
    console.log(
      `[${logPrefix}] auth check failed, continuing anonymously`,
      error,
    );

    return {
      authHeader,
      valid: false,
      user: null,
      error,
    };
  }
};

export const requireAuthenticatedUser = async (
  req: Request,
  {
    missingMessage = "No authorization header",
    invalidMessage = "Invalid user",
  }: {
    missingMessage?: string;
    invalidMessage?: string;
  } = {},
): Promise<{
  authHeader: string;
  supabaseClient: any;
  user: any;
}> => {
  const authHeader = getAuthorizationHeader(req);
  if (!authHeader) {
    throw new Error(missingMessage);
  }

  const supabaseClient = createUserClient(authHeader);
  const {
    data: { user },
    error,
  } = await supabaseClient.auth.getUser();

  if (error || !user) {
    throw new Error(invalidMessage);
  }

  return {
    authHeader,
    supabaseClient,
    user,
  };
};
