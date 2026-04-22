function asPayloadObject(payload) {
  return payload && typeof payload === "object" ? payload : null;
}

export function extractMapSheetSourceContext(payload = null) {
  const payloadObject = asPayloadObject(payload);
  if (!payloadObject?.sourcePhase) {
    return null;
  }

  return {
    sourcePhase: payloadObject.sourcePhase,
    sourceSnapState: payloadObject.sourceSnapState || null,
    sourcePayload: payloadObject.sourcePayload || null,
  };
}

export function buildBedDecisionSourcePayload({
  careIntent = "bed",
  savedTransport = null,
  payload = null,
} = {}) {
  const sourceContext = extractMapSheetSourceContext(payload);

  return {
    careIntent,
    savedTransport: careIntent === "both" ? savedTransport || null : null,
    ...(sourceContext || {}),
  };
}
