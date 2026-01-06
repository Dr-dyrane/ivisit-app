// data/visits.js - Mock visits data for iVisit appointments

// Visit status types
export const VISIT_STATUS = {
  UPCOMING: "upcoming",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  IN_PROGRESS: "in_progress",
};

// Visit types
export const VISIT_TYPES = {
  CHECKUP: "Check-up",
  FOLLOWUP: "Follow-up",
  EMERGENCY: "Emergency",
  CONSULTATION: "Consultation",
  PROCEDURE: "Procedure",
};

// Filter options for the UI
export const VISIT_FILTERS = [
  { id: "all", label: "All" },
  { id: "upcoming", label: "Upcoming" },
  { id: "completed", label: "Completed" },
];

// Mock visits data
export const VISITS = [
  {
    id: "1",
    hospital: "City General Hospital",
    doctor: "Dr. Emily Johnson",
    specialty: "Cardiology",
    date: "2026-01-15",
    time: "10:00 AM",
    type: VISIT_TYPES.CHECKUP,
    status: VISIT_STATUS.UPCOMING,
    image: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=300&h=200",
    address: "123 Medical Plaza, Downtown",
    phone: "+1-555-0123",
    notes: "Annual heart check-up. Bring previous ECG reports.",
    estimatedDuration: "45 mins",
  },
  {
    id: "2",
    hospital: "St. Mary's Medical Center",
    doctor: "Dr. Michael Lee",
    specialty: "Orthopedics",
    date: "2026-01-10",
    time: "2:30 PM",
    type: VISIT_TYPES.FOLLOWUP,
    status: VISIT_STATUS.COMPLETED,
    image: "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&q=80&w=300&h=200",
    address: "456 Healthcare Ave, Medical District",
    phone: "+1-555-0456",
    notes: "Post-surgery follow-up for knee replacement.",
    estimatedDuration: "30 mins",
    summary: "Recovery progressing well. Continue physical therapy.",
  },
  {
    id: "3",
    hospital: "Emergency Care Unit",
    doctor: "Dr. Sarah Parker",
    specialty: "Emergency Medicine",
    date: "2026-01-05",
    time: "8:00 PM",
    type: VISIT_TYPES.EMERGENCY,
    status: VISIT_STATUS.COMPLETED,
    image: "https://images.unsplash.com/photo-1632833239869-a37e3a5806d2?auto=format&fit=crop&q=80&w=300&h=200",
    address: "789 Quick Response Blvd",
    phone: "+1-555-0789",
    notes: "Allergic reaction treatment.",
    estimatedDuration: "2 hours",
    summary: "Treated with epinephrine. Prescribed EpiPen for emergencies.",
  },
  {
    id: "4",
    hospital: "Metro Health Center",
    doctor: "Dr. James Wilson",
    specialty: "General Care",
    date: "2026-01-20",
    time: "9:00 AM",
    type: VISIT_TYPES.CONSULTATION,
    status: VISIT_STATUS.UPCOMING,
    image: "https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?auto=format&fit=crop&q=80&w=300&h=200",
    address: "321 Community Care St",
    phone: "+1-555-0321",
    notes: "Initial consultation for chronic fatigue.",
    estimatedDuration: "1 hour",
  },
  {
    id: "5",
    hospital: "University Medical Center",
    doctor: "Dr. Lisa Chen",
    specialty: "Neurology",
    date: "2026-01-25",
    time: "11:30 AM",
    type: VISIT_TYPES.PROCEDURE,
    status: VISIT_STATUS.UPCOMING,
    image: "https://images.unsplash.com/photo-1551190822-a9333d879b1f?auto=format&fit=crop&q=80&w=300&h=200",
    address: "100 University Ave, Medical Campus",
    phone: "+1-555-0100",
    notes: "MRI scan for headache diagnosis.",
    estimatedDuration: "1.5 hours",
  },
];

// Helper function to get status color
export const getStatusColor = (status) => {
  switch (status) {
    case VISIT_STATUS.UPCOMING:
      return "#3B82F6"; // Blue
    case VISIT_STATUS.IN_PROGRESS:
      return "#F59E0B"; // Amber
    case VISIT_STATUS.COMPLETED:
      return "#10B981"; // Green
    case VISIT_STATUS.CANCELLED:
      return "#EF4444"; // Red
    default:
      return "#6B7280"; // Gray
  }
};

// Helper function to get visit type icon
export const getVisitTypeIcon = (type) => {
  switch (type) {
    case VISIT_TYPES.CHECKUP:
      return "fitness-outline";
    case VISIT_TYPES.FOLLOWUP:
      return "refresh-outline";
    case VISIT_TYPES.EMERGENCY:
      return "alert-circle-outline";
    case VISIT_TYPES.CONSULTATION:
      return "chatbubble-ellipses-outline";
    case VISIT_TYPES.PROCEDURE:
      return "medical-outline";
    default:
      return "calendar-outline";
  }
};

