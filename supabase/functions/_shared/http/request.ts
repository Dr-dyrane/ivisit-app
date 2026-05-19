export const isOptionsRequest = (req: Request): boolean => req.method === "OPTIONS";

export const isMethod = (req: Request, method: string): boolean =>
  req.method.toUpperCase() === method.toUpperCase();

export const getAuthorizationHeader = (req: Request): string =>
  req.headers.get("Authorization") ?? "";

export const readJsonBody = async <T = Record<string, unknown>>(
  req: Request,
  fallback: T = {} as T,
): Promise<T> => {
  try {
    return await req.json();
  } catch {
    return fallback;
  }
};
