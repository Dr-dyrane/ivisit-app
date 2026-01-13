import { COLORS } from "./colors";

export const NOTIFICATION_TYPES = {
  EMERGENCY: "emergency",
  APPOINTMENT: "appointment",
  VISIT: "visit",
  SYSTEM: "system",
  PROMOTION: "promotion",
  SUPPORT: "support",
};

export const NOTIFICATION_PRIORITY = {
  URGENT: "urgent",
  HIGH: "high",
  NORMAL: "normal",
  LOW: "low",
};

export const NOTIFICATION_FILTERS = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "emergency", label: "Emergency" },
  { id: "appointments", label: "Appointments" },
  { id: "support", label: "Support" },
];

export const getNotificationIcon = (type) => {
  switch (type) {
    case NOTIFICATION_TYPES.EMERGENCY:
      return "medical";
    case NOTIFICATION_TYPES.APPOINTMENT:
      return "calendar";
    case NOTIFICATION_TYPES.VISIT:
      return "location";
    case NOTIFICATION_TYPES.SYSTEM:
      return "settings";
    case NOTIFICATION_TYPES.PROMOTION:
      return "star";
    case NOTIFICATION_TYPES.SUPPORT:
      return "chatbubbles"; // or "help-buoy"
    default:
      return "notifications";
  }
};

export const getPriorityColor = (priority) => {
  switch (priority) {
    case NOTIFICATION_PRIORITY.URGENT:
      return "#EF4444"; // Red
    case NOTIFICATION_PRIORITY.HIGH:
      return "#F59E0B"; // Orange
    case NOTIFICATION_PRIORITY.NORMAL:
      return COLORS.brandPrimary; // Blue/Brand
    case NOTIFICATION_PRIORITY.LOW:
      return "#64748B"; // Gray
    default:
      return "#64748B";
  }
};

export const getRelativeTime = (timestamp) => {
  if (!timestamp) return "";
  const now = new Date();
  const date = new Date(timestamp);
  const diff = Math.floor((now - date) / 1000); // seconds

  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString();
};

export const HAPTIC_PATTERNS = {
  [NOTIFICATION_PRIORITY.URGENT]: "heavy_triple",
  [NOTIFICATION_PRIORITY.HIGH]: "warning",
  [NOTIFICATION_PRIORITY.NORMAL]: "success",
  [NOTIFICATION_PRIORITY.LOW]: "none",
};

export const SOUND_CONFIG = {
  [NOTIFICATION_PRIORITY.URGENT]: {
    enabled: true,
    file: "notification-urgent.mp3",
    volume: 1.0,
  },
  [NOTIFICATION_PRIORITY.HIGH]: {
    enabled: true,
    file: "notification-high.mp3",
    volume: 0.8,
  },
  [NOTIFICATION_PRIORITY.NORMAL]: {
    enabled: false,
    file: null,
    volume: 0.0,
  },
  [NOTIFICATION_PRIORITY.LOW]: {
    enabled: false,
    file: null,
    volume: 0.0,
  },
};
