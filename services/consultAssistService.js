import { supabase } from "./supabase";
import { isValidUUID } from "./displayIdService";
import { withTimeout } from "./supabaseHelpers";
import { scheduledVisitReleaseGates } from "./scheduledVisitsService";

const toText = (value) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const buildRecentMessageContext = (messages = []) => {
  let remainingChars = 7000;
  const selected = [];
  [...(Array.isArray(messages) ? messages : [])]
    .slice(-12)
    .forEach((message) => {
      if (remainingChars <= 0) return;
      const body = toText(message?.body)?.slice(0, 1000) || null;
      if (!body) return;
      const boundedBody = body.slice(0, remainingChars);
      remainingChars -= boundedBody.length;
      selected.push({
        sender: message?.senderRole || "participant",
        kind: ["text", "image", "video"].includes(message?.kind)
          ? message.kind
          : "text",
        body: boundedBody,
      });
    });
  return selected;
};

export const consultAssistService = {
  async createDraft({ roomId, prompt, recentMessages = [], attachments = [] }) {
    if (!scheduledVisitReleaseGates.consultAiDraft) {
      throw new Error("AI drafting is temporarily unavailable.");
    }
    if (!roomId || !isValidUUID(String(roomId))) {
      throw new Error("A valid consult room is required.");
    }
    const userPrompt = toText(prompt);
    if (!userPrompt || userPrompt.length > 2000) {
      throw new Error("Enter a prompt of 2,000 characters or less.");
    }

    const attachmentContext = (Array.isArray(attachments) ? attachments : [])
      .slice(-4)
      .map((attachment) => ({
        kind: attachment?.kind,
        mime_type: attachment?.attachmentMimeType || null,
        caption: attachment?.body || null,
        size_bytes: attachment?.attachmentSizeBytes || null,
        duration_ms: attachment?.attachmentDurationMs || null,
      }));

    const { data, error } = await withTimeout(
      supabase.functions.invoke("consult-assist", {
        body: {
          room_id: roomId,
          user_prompt: userPrompt,
          recent_messages: buildRecentMessageContext(recentMessages),
          attachment_context: attachmentContext,
        },
      }),
      20000,
      "AI draft request timed out",
    );
    if (error) throw error;
    if (!data?.success || !toText(data?.draft)) {
      throw new Error(data?.error || "AI drafting is temporarily unavailable.");
    }
    return {
      draft: data.draft.trim(),
      aiAssisted: data.ai_assisted === true,
      scope: toText(data.scope) || "Draft only. Review before sending.",
      requestId: toText(data.request_id),
    };
  },
};

export default consultAssistService;

