import { COLORS } from "./colors";

export const VISIT_STATUS = {
  UPCOMING: "upcoming",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  IN_PROGRESS: "in_progress",
};

export const VISIT_TYPES = {
  REGULAR: "Regular Checkup",
  EMERGENCY: "Emergency",
  AMBULANCE_RIDE: "Ambulance Ride",
  BED_BOOKING: "Bed Booking",
  FOLLOW_UP: "Follow-up",
  LAB_TEST: "Lab Test",
  SURGERY: "Surgery",
  TELEHEALTH: "Telehealth",
  CONSULTATION: "Consultation",
};

export const EMERGENCY_VISIT_LIFECYCLE = {
  INITIATED: "initiated",
  CONFIRMED: "confirmed",
  MONITORING: "monitoring",
  ARRIVED: "arrived",
  OCCUPIED: "occupied",
  COMPLETED: "completed",
  POST_COMPLETION: "post_completion",
  RATING_PENDING: "rating_pending",
  RATED: "rated",
  CLEARED: "cleared",
  CANCELLED: "cancelled",
};

export const getStatusColor = (status) => {
  switch (status) {
    case VISIT_STATUS.UPCOMING:
      return COLORS.brandPrimary;
    case VISIT_STATUS.COMPLETED:
      return "#10B981"; // Success Green
    case VISIT_STATUS.CANCELLED:
      return "#EF4444"; // Error Red
    case VISIT_STATUS.IN_PROGRESS:
      return "#F59E0B"; // Warning Orange
    default:
      return "#64748B"; // Slate 500
  }
};

export const getVisitTypeIcon = (type) => {
  switch (type) {
    case VISIT_TYPES.REGULAR:
      return "calendar";
    case VISIT_TYPES.EMERGENCY:
      return "medical";
    case VISIT_TYPES.AMBULANCE_RIDE:
      return "car";
    case VISIT_TYPES.BED_BOOKING:
      return "bed";
    case VISIT_TYPES.TELEHEALTH:
      return "videocam";
    default:
      return "calendar-outline";
  }
};
