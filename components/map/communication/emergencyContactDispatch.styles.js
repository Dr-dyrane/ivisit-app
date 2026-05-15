import { StyleSheet } from "react-native";

// PULLBACK NOTE: Contact Dispatch CD-6 - Styles.
// Owns: All visual styling for the contact dispatch modal components.
// Does NOT own: Theme colors (handled by theme file) or content (handled by content file).

export const styles = StyleSheet.create({
  // Status Strip
  statusStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(0, 0, 0, 0.04)",
    marginBottom: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "500",
  },
  statusRetry: {
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 8,
  },

  // Message List
  messageList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageGroup: {
    marginBottom: 16,
  },
  messageGroupOwn: {
    alignItems: "flex-end",
  },
  messageGroupOther: {
    alignItems: "flex-start",
  },
  senderLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
    marginLeft: 4,
  },
  messageBubbles: {
    flexDirection: "column",
    gap: 4,
  },
  messageRow: {
    marginBottom: 12,
  },
  messageBubble: {
    maxWidth: "80%",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    position: "relative",
  },
  messageBubbleOwn: {
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    borderBottomLeftRadius: 4,
  },
  messageBubbleOptimistic: {
    opacity: 0.7,
  },
  messageBubbleFailed: {
    borderWidth: 1,
    borderColor: "#DC2626",
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
    marginHorizontal: 4,
  },
  quickActionIndicator: {
    position: "absolute",
    top: -6,
    left: -6,
    backgroundColor: "#DC2626",
    borderRadius: 8,
    padding: 2,
  },
  optimisticSpinner: {
    position: "absolute",
    right: 8,
    top: "50%",
    marginTop: -10,
  },
  failedIcon: {
    position: "absolute",
    right: 8,
    top: "50%",
    marginTop: -8,
  },
  skeletonBubble: {
    height: 40,
    width: 120,
  },

  // Empty State
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },

  // Archived Banner
  archivedBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.04)",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  archivedText: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },

  // Quick Actions
  quickActionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  quickActionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.1)",
  },
  quickActionChipPressed: {
    opacity: 0.7,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: "500",
  },

  // Composer
  composerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.08)",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(220, 38, 38, 0.1)",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  composerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 10,
    borderRadius: 20,
    gap: 8,
  },
  composerInput: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    maxHeight: 80,
    paddingTop: 8,
  },
  charCount: {
    fontSize: 11,
    position: "absolute",
    bottom: 4,
    right: 52,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonPressed: {
    transform: [{ scale: 0.95 }],
  },
});

export default styles;
