export function buildTrackingSharePayload({
  telemetryWarningLabel,
  etaLabel,
  serviceLabel,
  distanceLabel,
  pickupLabel,
  hospitalName,
  responderName,
  responderPlate,
}) {
  const statusLine = telemetryWarningLabel
    ? telemetryWarningLabel
    : etaLabel && etaLabel !== "--"
      ? `${serviceLabel} arriving in ${etaLabel}`
      : `${serviceLabel} is on the way`;

  const detailLine = [distanceLabel && distanceLabel !== "--" ? distanceLabel : null]
    .filter(Boolean)
    .join(" · ");

  const messageLines = [
    "iVisit update",
    statusLine,
    detailLine || null,
    pickupLabel ? `Pickup: ${pickupLabel}` : null,
    hospitalName ? `Hospital: ${hospitalName}` : null,
    responderName && responderName !== "Driver assigned"
      ? `Driver: ${responderName}`
      : null,
    responderPlate ? `Vehicle: ${responderPlate}` : null,
  ].filter(Boolean);

  return {
    title: "iVisit ETA",
    subject: "iVisit ETA",
    message: messageLines.join("\n"),
  };
}
