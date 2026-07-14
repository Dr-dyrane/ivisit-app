export const scheduledVisitQueryKeys = {
  all: ["scheduledVisits"],
  availabilityRoot: ["scheduledVisits", "availability"],
  availability: ({
    hospitalId,
    specialty,
    careMode,
    fromAt,
    toAt,
    timezoneConfirmedAt,
  }) => [
    "scheduledVisits",
    "availability",
    hospitalId || "none",
    specialty || "none",
    careMode || "none",
    fromAt || "none",
    toAt || "none",
    timezoneConfirmedAt || "unconfirmed",
  ],
  facility: (hospitalId) => [
    "scheduledVisits",
    "facility",
    hospitalId || "none",
  ],
};

export default scheduledVisitQueryKeys;
