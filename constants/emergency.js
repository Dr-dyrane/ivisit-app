export const AMBULANCE_STATUSES = {
  en_route: { label: "En Route", color: "#F59E0B" },
  dispatched: { label: "Dispatched", color: "#3B82F6" },
  arriving: { label: "Arriving", color: "#10B981" },
  on_scene: { label: "On Scene", color: "#EF4444" },
  completed: { label: "Completed", color: "#10B981" },
  cancelled: { label: "Cancelled", color: "#6B7280" },
  returning: { label: "Returning", color: "#8B5CF6" },
  available: { label: "Available", color: "#10B981" },
};

export const AMBULANCE_TYPES = [
  {
    id: "standard",
    title: "Basic Life Support",
    subtitle: "For non-life threatening conditions",
    price: "$150",
    eta: "10-15 min",
    icon: "medical-outline",
  },
  {
    id: "advanced",
    title: "Advanced Life Support",
    subtitle: "For serious medical conditions",
    price: "$250",
    eta: "5-8 min",
    icon: "pulse-outline",
  },
  {
    id: "critical",
    title: "Critical Care",
    subtitle: "ICU-level care during transport",
    price: "$400",
    eta: "5-12 min",
    icon: "warning-outline",
  },
];
