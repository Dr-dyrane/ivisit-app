// PULLBACK NOTE: EmergencyContacts surface copy contract.
// Owns: user-facing strings shared across compact and wide layouts so responsive variants preserve the same product language.

export const EMERGENCY_CONTACTS_COPY = {
  screen: {
    title: "Emergency Contacts",
    subtitle: "Safety",
  },
  fab: {
    icon: "person-add",
    label: "Add Contact",
    subText: "Save a reachable number",
  },
  loading: {
    message: "Loading contacts...",
  },
  empty: {
    title: "No contacts yet",
    body: "Add a trusted contact with a working phone number.",
  },
  migration: {
    title: "Contacts to fix",
    body: "These contacts need a phone number before they can be used.",
  },
  context: {
    eyebrow: "Emergency profile",
    title: "Keep one reachable circle.",
    body: "Keep the people you trust most ready to call.",
    footerNeedsReview: "Some contacts still need a phone number.",
    stats: {
      saved: "Saved",
      reachable: "Reachable",
      review: "To review",
    },
  },
  island: {
    primaryTitle: "Ready to call",
    primaryEmptyTitle: "No reachable contact",
    primaryEmptyBody: "Add one trusted number.",
    reachableLabel: "Reachable now",
    reviewTitle: "Review queue",
    reviewReady: "Profile ready",
    reviewClear: "No fixes waiting",
    stateTitle: "Status",
    stateStorage: "Storage",
    stateServer: "Synced to account",
    stateLocal: "Using local-only mode",
    stateSelection: "Selected now",
    addAction: "Add contact",
    reviewAction: "Review contact",
    footerReady: "Used in emergency request flows when sharing is enabled.",
  },
  list: {
    title: "People you can reach fast",
    body: "Tap to reveal. Hold to select.",
  },
};

export default EMERGENCY_CONTACTS_COPY;
