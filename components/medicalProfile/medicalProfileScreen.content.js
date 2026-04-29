export const MEDICAL_PROFILE_SCREEN_COPY = {
  screen: {
    title: "Medical Profile",
    subtitle: "Health information",
  },
  center: {
    title: "Medical profile",
  },
  context: {
    title: "Care details ready",
    body: "Keep key health details current.",
    completionLabel: "Saved fields",
    lastUpdatedLabel: "Last updated",
    primaryAction: "Edit details",
  },
  island: {
    title: "Health status",
    criticalLabel: "Critical details",
    historyLabel: "History",
    notesLabel: "Notes",
  },
  sections: [
    {
      key: "current",
      title: "Current health",
      rows: [
        {
          key: "bloodType",
          label: "Blood type",
          iconName: "water-outline",
          placeholder: "Add blood type",
        },
        {
          key: "allergies",
          label: "Allergies",
          iconName: "warning-outline",
          placeholder: "Add allergies",
        },
        {
          key: "medications",
          label: "Current medications",
          iconName: "medical-outline",
          placeholder: "Add current medications",
        },
      ],
    },
    {
      key: "history",
      title: "History and notes",
      rows: [
        {
          key: "conditions",
          label: "Chronic conditions",
          iconName: "fitness-outline",
          placeholder: "Add chronic conditions",
        },
        {
          key: "surgeries",
          label: "Past surgeries",
          iconName: "bandage-outline",
          placeholder: "Add past surgeries",
        },
        {
          key: "notes",
          label: "Emergency notes",
          iconName: "document-text-outline",
          placeholder: "Add emergency notes",
        },
      ],
    },
  ],
  editor: {
    title: "Edit details",
    save: "Save details",
    cancel: "Cancel",
  },
  messages: {
    loading: "Loading your medical profile...",
    saved: "Medical profile updated successfully.",
    localSaved:
      "Saved on this device. Sync will resume when the service is back.",
    failed: "Failed to update medical profile.",
    syncFallback:
      "Saved locally. Remote sync will resume when the service is back.",
  },
};
