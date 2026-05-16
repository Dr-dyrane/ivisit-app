// PULLBACK NOTE: Contact Dispatch CD-6 - Content.
// Owns: Static copy strings and labels for the contact dispatch modal.
// Does NOT own: Theme colors (handled by theme file) or styles (handled by styles file).

export const emergencyChatContent = {
  // Modal
  title: "Contact Dispatch",
  closeLabel: "Close",

  // Status states
  statusConnecting: "Connecting...",
  statusLoading: "Loading messages...",
  statusError: "Connection error. Tap to retry.",
  statusReconnecting: "Reconnecting...",
  statusArchived: "This conversation is archived.",
  archivedReadonly: "This conversation is archived. New messages are disabled.",
  statusRetry: "Retry",

  // Empty state
  emptyTitle: "Send an update",
  emptyBody: "Use this for pickup changes, arrival updates, or dispatch instructions.",

  // Quick actions
  quickActions: [
    { key: "moving", label: "Moving toward ambulance" },
    { key: "meet_halfway", label: "Meet halfway?" },
    { key: "pickup_changed", label: "Pickup changed" },
    { key: "call_me", label: "Please call me" },
    { key: "arrived", label: "We arrived" },
  ],

  // Composer
  composerPlaceholder: "Type a message...",
  composerPlaceholderDisabled: "Cannot send messages",
  composerSend: "Send",
  composerSending: "Sending...",
  composerCharLimit: 1000,
  composerError: "Failed to send. Tap to retry.",

  // Message bubbles
  messageYou: "You",
  messageSystem: "System",
  messagePatient: "Patient",
  messageDriver: "Driver",
  messageCrew: "Crew",
  messageProvider: "Provider",
  messageHospitalAdmin: "Hospital Admin",
  messageDispatcher: "Dispatcher",
  messageSupport: "Support",

  // Accessibility
  accessibility: {
    modal: "Contact dispatch modal",
    close: "Close contact dispatch",
    sendMessage: "Send message",
    quickAction: "Quick action: ",
    retry: "Retry connection",
    archived: "Archived conversation",
  },
};

export default emergencyChatContent;
