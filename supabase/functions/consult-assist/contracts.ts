import { v4 } from "https://deno.land/std@0.168.0/uuid/mod.ts";

const MAX_REQUEST_BYTES = 32 * 1024;
const MAX_USER_PROMPT_CHARS = 2_000;
const MAX_RECENT_MESSAGES = 12;
const MAX_RECENT_MESSAGE_CHARS = 1_000;
const MAX_RECENT_CONTEXT_CHARS = 7_000;
const MAX_ATTACHMENT_CONTEXT = 4;
const MAX_ATTACHMENT_CAPTION_CHARS = 500;
const MAX_MIME_TYPE_CHARS = 100;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
const MAX_VIDEO_DURATION_MS = 30_000;
const SHORT_RATE_WINDOW_MS = 60_000;
const SHORT_RATE_LIMIT = 8;
const LONG_RATE_WINDOW_MS = 10 * 60_000;
const LONG_RATE_LIMIT = 30;
const MAX_RATE_BUCKETS = 1_000;

const MESSAGE_KINDS = new Set(["text", "image", "video"]);
const ATTACHMENT_KINDS = new Set(["image", "video"]);
const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

export type ConsultActorKind = "patient" | "clinician" | "participant";

export interface RecentMessageContext {
  sender: ConsultActorKind;
  kind: "text" | "image" | "video";
  body: string;
}

export interface AttachmentContext {
  kind: "image" | "video";
  mimeType: string | null;
  caption: string | null;
  sizeBytes: number | null;
  durationMs: number | null;
}

export interface ConsultAssistInput {
  roomId: string;
  userPrompt: string;
  recentMessages: RecentMessageContext[];
  attachments: AttachmentContext[];
}

export class PublicRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly responseHeaders: Record<string, string>;

  constructor(
    status: number,
    code: string,
    message: string,
    responseHeaders: Record<string, string> = {},
  ) {
    super(message);
    this.name = "PublicRequestError";
    this.status = status;
    this.code = code;
    this.responseHeaders = responseHeaders;
  }
}

const rateBuckets = new Map<string, number[]>();

const requireObject = (value: unknown, message: string) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new PublicRequestError(400, "invalid_request", message);
  }

  return value as Record<string, unknown>;
};

const readBoundedString = (
  value: unknown,
  {
    field,
    maxChars,
    required = false,
  }: { field: string; maxChars: number; required?: boolean },
): string => {
  if (value === undefined || value === null) {
    if (required) {
      throw new PublicRequestError(
        400,
        "invalid_request",
        `${field} is required.`,
      );
    }
    return "";
  }

  if (typeof value !== "string") {
    throw new PublicRequestError(
      400,
      "invalid_request",
      `${field} must be text.`,
    );
  }

  const text = value.trim();
  if (required && !text) {
    throw new PublicRequestError(
      400,
      "invalid_request",
      `${field} is required.`,
    );
  }
  if (text.length > maxChars) {
    throw new PublicRequestError(
      400,
      "invalid_request",
      `${field} is too long.`,
    );
  }

  return text;
};

const normalizeSender = (value: unknown): ConsultActorKind => {
  const sender = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (sender === "patient") return "patient";
  if (["doctor", "clinician", "provider"].includes(sender)) return "clinician";
  return "participant";
};

const readOptionalPositiveInteger = (
  value: unknown,
  field: string,
  max: number,
): number | null => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new PublicRequestError(
      400,
      "invalid_request",
      `${field} must be a whole number.`,
    );
  }
  if (value < 1 || value > max) {
    throw new PublicRequestError(
      400,
      "invalid_request",
      `${field} is outside the supported range.`,
    );
  }
  return value;
};

const parseRecentMessages = (value: unknown): RecentMessageContext[] => {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > MAX_RECENT_MESSAGES) {
    throw new PublicRequestError(
      400,
      "invalid_request",
      `recent_messages must contain at most ${MAX_RECENT_MESSAGES} items.`,
    );
  }

  let totalChars = 0;
  return value.map((candidate, index) => {
    const item = requireObject(
      candidate,
      `recent_messages[${index}] must be an object.`,
    );
    const kind = readBoundedString(item.kind ?? "text", {
      field: `recent_messages[${index}].kind`,
      maxChars: 16,
      required: true,
    }).toLowerCase();
    if (!MESSAGE_KINDS.has(kind)) {
      throw new PublicRequestError(
        400,
        "invalid_request",
        `recent_messages[${index}].kind is invalid.`,
      );
    }

    const body = readBoundedString(item.body, {
      field: `recent_messages[${index}].body`,
      maxChars: MAX_RECENT_MESSAGE_CHARS,
      required: true,
    });
    totalChars += body.length;
    if (totalChars > MAX_RECENT_CONTEXT_CHARS) {
      throw new PublicRequestError(
        400,
        "invalid_request",
        "recent_messages contains too much text.",
      );
    }

    return {
      sender: normalizeSender(item.sender ?? item.sender_role ?? item.role),
      kind: kind as RecentMessageContext["kind"],
      body,
    };
  });
};

const parseAttachmentContext = (value: unknown): AttachmentContext[] => {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > MAX_ATTACHMENT_CONTEXT) {
    throw new PublicRequestError(
      400,
      "invalid_request",
      `attachment_context must contain at most ${MAX_ATTACHMENT_CONTEXT} items.`,
    );
  }

  return value.map((candidate, index) => {
    const item = requireObject(
      candidate,
      `attachment_context[${index}] must be an object.`,
    );
    const kind = readBoundedString(item.kind, {
      field: `attachment_context[${index}].kind`,
      maxChars: 16,
      required: true,
    }).toLowerCase();
    if (!ATTACHMENT_KINDS.has(kind)) {
      throw new PublicRequestError(
        400,
        "invalid_request",
        `attachment_context[${index}].kind is invalid.`,
      );
    }

    const mimeType = readBoundedString(item.mime_type, {
      field: `attachment_context[${index}].mime_type`,
      maxChars: MAX_MIME_TYPE_CHARS,
    }).toLowerCase();
    const caption = readBoundedString(item.caption, {
      field: `attachment_context[${index}].caption`,
      maxChars: MAX_ATTACHMENT_CAPTION_CHARS,
    });
    const allowedMimeTypes = kind === "image"
      ? IMAGE_MIME_TYPES
      : VIDEO_MIME_TYPES;
    if (mimeType && !allowedMimeTypes.has(mimeType)) {
      throw new PublicRequestError(
        400,
        "invalid_request",
        `attachment_context[${index}].mime_type is unsupported.`,
      );
    }
    const sizeBytes = readOptionalPositiveInteger(
      item.size_bytes,
      `attachment_context[${index}].size_bytes`,
      kind === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES,
    );
    const durationMs = readOptionalPositiveInteger(
      item.duration_ms,
      `attachment_context[${index}].duration_ms`,
      MAX_VIDEO_DURATION_MS,
    );
    if (kind === "image" && durationMs !== null) {
      throw new PublicRequestError(
        400,
        "invalid_request",
        `attachment_context[${index}].duration_ms is only valid for video.`,
      );
    }

    return {
      kind: kind as AttachmentContext["kind"],
      mimeType: mimeType || null,
      caption: caption || null,
      sizeBytes,
      durationMs,
    };
  });
};

const readBoundedRequestBody = async (req: Request): Promise<string> => {
  if (!req.body) return "";

  const reader = req.body.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    totalBytes += value.byteLength;
    if (totalBytes > MAX_REQUEST_BYTES) {
      await reader.cancel().catch(() => undefined);
      throw new PublicRequestError(
        413,
        "request_too_large",
        "The request is too large.",
      );
    }
    text += decoder.decode(value, { stream: true });
  }

  return text + decoder.decode();
};

export const parseConsultAssistRequest = async (
  req: Request,
): Promise<ConsultAssistInput> => {
  const mediaType = (req.headers.get("content-type") || "")
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
  if (mediaType && mediaType !== "application/json") {
    throw new PublicRequestError(
      415,
      "unsupported_media_type",
      "The request body must be JSON.",
    );
  }

  const contentLength = Number(req.headers.get("content-length") || 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    throw new PublicRequestError(
      413,
      "request_too_large",
      "The request is too large.",
    );
  }

  const rawBody = await readBoundedRequestBody(req);

  let decoded: unknown;
  try {
    decoded = JSON.parse(rawBody);
  } catch {
    throw new PublicRequestError(
      400,
      "invalid_request",
      "A valid JSON request is required.",
    );
  }

  const body = requireObject(decoded, "A valid JSON request is required.");
  const roomId = readBoundedString(body.room_id, {
    field: "room_id",
    maxChars: 64,
    required: true,
  });
  if (!v4.validate(roomId)) {
    throw new PublicRequestError(
      400,
      "invalid_request",
      "room_id must be a UUID.",
    );
  }

  return {
    roomId,
    userPrompt: readBoundedString(body.user_prompt, {
      field: "user_prompt",
      maxChars: MAX_USER_PROMPT_CHARS,
      required: true,
    }),
    recentMessages: parseRecentMessages(body.recent_messages),
    attachments: parseAttachmentContext(body.attachment_context),
  };
};

const pruneRateBuckets = (now: number) => {
  if (rateBuckets.size <= MAX_RATE_BUCKETS) return;

  for (const [key, timestamps] of rateBuckets.entries()) {
    if (
      !timestamps.some((timestamp) => now - timestamp < LONG_RATE_WINDOW_MS)
    ) {
      rateBuckets.delete(key);
    }
    if (rateBuckets.size <= MAX_RATE_BUCKETS) break;
  }
};

export const takeDraftRateLimitSlot = (userId: string) => {
  const now = Date.now();
  pruneRateBuckets(now);

  const recent = (rateBuckets.get(userId) ?? []).filter(
    (timestamp) => now - timestamp < LONG_RATE_WINDOW_MS,
  );
  const shortWindow = recent.filter(
    (timestamp) => now - timestamp < SHORT_RATE_WINDOW_MS,
  );

  if (
    shortWindow.length >= SHORT_RATE_LIMIT || recent.length >= LONG_RATE_LIMIT
  ) {
    const oldestRelevant = shortWindow.length >= SHORT_RATE_LIMIT
      ? shortWindow[0]
      : recent[0];
    const windowMs = shortWindow.length >= SHORT_RATE_LIMIT
      ? SHORT_RATE_WINDOW_MS
      : LONG_RATE_WINDOW_MS;
    const retryAfter = Math.max(
      1,
      Math.ceil((oldestRelevant + windowMs - now) / 1_000),
    );

    rateBuckets.set(userId, recent);
    throw new PublicRequestError(
      429,
      "rate_limited",
      "Draft assistance is temporarily rate limited.",
      { "Retry-After": String(retryAfter) },
    );
  }

  recent.push(now);
  rateBuckets.set(userId, recent);
};
