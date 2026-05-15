import { formatDistanceToNow } from "date-fns";

// PULLBACK NOTE: Contact Dispatch CD-6 - Helpers.
// Owns: Utility functions for message formatting, grouping, and display logic.
// Does NOT own: Component rendering or state management.

/**
 * Formats a timestamp as relative time (e.g., "2 minutes ago")
 */
export function formatMessageTimestamp(timestamp) {
  if (!timestamp) return "";
  try {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  } catch {
    return "";
  }
}

/**
 * Groups messages by sender and time gap
 */
export function groupMessages(messages) {
  if (!messages || messages.length === 0) return [];

  const groups = [];
  let currentGroup = null;

  messages.forEach((msg, index) => {
    const isOwn = msg.senderRole === "patient";
    const prevMsg = messages[index - 1];

    // Start new group if:
    // - First message
    // - Different sender
    // - More than 2 minutes gap
    const shouldStartNewGroup =
      !currentGroup ||
      currentGroup.isOwn !== isOwn ||
      (prevMsg && new Date(msg.createdAt) - new Date(prevMsg.createdAt) > 120000);

    if (shouldStartNewGroup) {
      if (currentGroup) groups.push(currentGroup);
      currentGroup = {
        isOwn,
        senderRole: msg.senderRole,
        senderId: msg.senderId,
        displayName: getSenderDisplayName(msg.senderRole),
        messages: [],
      };
    }

    currentGroup.messages.push(msg);
  });

  if (currentGroup) groups.push(currentGroup);
  return groups;
}

/**
 * Gets display name for sender role
 */
export function getSenderDisplayName(role) {
  const names = {
    patient: "You",
    driver: "Driver",
    crew: "Crew",
    provider: "Provider",
    hospital_admin: "Hospital Admin",
    dispatcher: "Dispatcher",
    support: "Support",
    system: "System",
  };
  return names[role] || role;
}

/**
 * Generates a client message ID for optimistic updates
 */
export function generateClientMessageId() {
  return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Checks if a message is optimistic
 */
export function isOptimisticMessage(message) {
  return message?.id?.startsWith("optimistic_") || message?.isOptimistic === true;
}

/**
 * Checks if a message is a quick action
 */
export function isQuickActionMessage(message) {
  return message?.kind === "quick_action";
}

/**
 * Checks if a message is a system event
 */
export function isSystemMessage(message) {
  return message?.kind === "system" || message?.kind === "status_event";
}

/**
 * Truncates text to a maximum length with ellipsis
 */
export function truncateText(text, maxLength = 100) {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + "...";
}

/**
 * Validates message body length
 */
export function validateMessageBody(body) {
  if (!body || typeof body !== "string") {
    return { valid: false, error: "Message is required" };
  }
  const trimmed = body.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: "Message cannot be empty" };
  }
  if (trimmed.length > 1000) {
    return { valid: false, error: "Message must be 1000 characters or less" };
  }
  return { valid: true, value: trimmed };
}

export default {
  formatMessageTimestamp,
  groupMessages,
  getSenderDisplayName,
  generateClientMessageId,
  isOptimisticMessage,
  isQuickActionMessage,
  isSystemMessage,
  truncateText,
  validateMessageBody,
};
