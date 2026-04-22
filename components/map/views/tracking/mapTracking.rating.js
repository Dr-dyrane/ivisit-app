export function buildTrackingRatingState({
  kind,
  visitId,
  hospitalTitle,
  providerName,
  completionCommitted = false,
}) {
  if (!visitId) return null;

  if (kind === "bed") {
    return {
      visible: true,
      visitId,
      completeKind: "bed",
      completionCommitted,
      serviceType: "bed",
      title: "Rate your stay",
      subtitle: hospitalTitle ? `For ${hospitalTitle}` : null,
      serviceDetails: {
        hospital: hospitalTitle || null,
        provider: providerName || "Hospital staff",
      },
    };
  }

  return {
    visible: true,
    visitId,
    completeKind: "ambulance",
    completionCommitted,
    serviceType: "ambulance",
    title: "Rate your transport",
    subtitle: hospitalTitle ? `For ${hospitalTitle}` : null,
    serviceDetails: {
      hospital: hospitalTitle || null,
      provider: providerName || "Emergency services",
    },
  };
}
