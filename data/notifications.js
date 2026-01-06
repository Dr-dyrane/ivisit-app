// data/notifications.js - Mock notifications data for iVisit

// Notification types
export const NOTIFICATION_TYPES = {
  EMERGENCY: "emergency",
  APPOINTMENT: "appointment",
  VISIT: "visit",
  SYSTEM: "system",
  PROMO: "promo",
};

// Notification priorities
export const NOTIFICATION_PRIORITY = {
  URGENT: "urgent",
  HIGH: "high",
  NORMAL: "normal",
  LOW: "low",
};

// Filter options
export const NOTIFICATION_FILTERS = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "emergency", label: "Emergency" },
  { id: "appointments", label: "Appointments" },
];

// Mock notifications data
export const NOTIFICATIONS = [
  {
    id: "1",
    type: NOTIFICATION_TYPES.EMERGENCY,
    title: "Ambulance Dispatched",
    message: "An ambulance has been dispatched to your location. ETA: 5 minutes.",
    timestamp: "2026-01-06T08:30:00Z",
    read: false,
    priority: NOTIFICATION_PRIORITY.URGENT,
    actionType: "track",
    actionData: { emergencyId: "EMG-001" },
  },
  {
    id: "2",
    type: NOTIFICATION_TYPES.APPOINTMENT,
    title: "Upcoming Appointment",
    message: "Reminder: You have an appointment with Dr. Emily Johnson tomorrow at 10:00 AM.",
    timestamp: "2026-01-05T18:00:00Z",
    read: false,
    priority: NOTIFICATION_PRIORITY.HIGH,
    actionType: "view_appointment",
    actionData: { appointmentId: "1" },
  },
  {
    id: "3",
    type: NOTIFICATION_TYPES.VISIT,
    title: "Visit Completed",
    message: "Your visit to City General Hospital has been completed. View your summary.",
    timestamp: "2026-01-05T14:30:00Z",
    read: true,
    priority: NOTIFICATION_PRIORITY.NORMAL,
    actionType: "view_summary",
    actionData: { visitId: "2" },
  },
  {
    id: "4",
    type: NOTIFICATION_TYPES.SYSTEM,
    title: "App Update Available",
    message: "A new version of iVisit is available. Update now for the latest features.",
    timestamp: "2026-01-04T10:00:00Z",
    read: true,
    priority: NOTIFICATION_PRIORITY.LOW,
    actionType: null,
    actionData: null,
  },
  {
    id: "5",
    type: NOTIFICATION_TYPES.EMERGENCY,
    title: "Emergency Request Confirmed",
    message: "Your emergency request has been received. Help is on the way.",
    timestamp: "2026-01-03T22:15:00Z",
    read: true,
    priority: NOTIFICATION_PRIORITY.URGENT,
    actionType: null,
    actionData: null,
  },
  {
    id: "6",
    type: NOTIFICATION_TYPES.APPOINTMENT,
    title: "Appointment Confirmed",
    message: "Your appointment with Dr. Michael Lee on Jan 20 at 9:00 AM has been confirmed.",
    timestamp: "2026-01-03T09:00:00Z",
    read: true,
    priority: NOTIFICATION_PRIORITY.NORMAL,
    actionType: "view_appointment",
    actionData: { appointmentId: "4" },
  },
  {
    id: "7",
    type: NOTIFICATION_TYPES.PROMO,
    title: "Premium Membership",
    message: "Upgrade to Premium for priority ambulance dispatch and exclusive benefits.",
    timestamp: "2026-01-02T12:00:00Z",
    read: true,
    priority: NOTIFICATION_PRIORITY.LOW,
    actionType: "upgrade",
    actionData: null,
  },
];

// Helper: Get icon for notification type
export const getNotificationIcon = (type) => {
  switch (type) {
    case NOTIFICATION_TYPES.EMERGENCY:
      return "alert-circle";
    case NOTIFICATION_TYPES.APPOINTMENT:
      return "calendar";
    case NOTIFICATION_TYPES.VISIT:
      return "checkmark-circle";
    case NOTIFICATION_TYPES.SYSTEM:
      return "settings";
    case NOTIFICATION_TYPES.PROMO:
      return "gift";
    default:
      return "notifications";
  }
};

// Helper: Get color for priority
export const getPriorityColor = (priority) => {
  switch (priority) {
    case NOTIFICATION_PRIORITY.URGENT:
      return "#EF4444"; // Red
    case NOTIFICATION_PRIORITY.HIGH:
      return "#F59E0B"; // Amber
    case NOTIFICATION_PRIORITY.NORMAL:
      return "#3B82F6"; // Blue
    case NOTIFICATION_PRIORITY.LOW:
      return "#6B7280"; // Gray
    default:
      return "#6B7280";
  }
};

// Helper: Format relative time
export const getRelativeTime = (timestamp) => {
  const now = new Date();
  const date = new Date(timestamp);
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

