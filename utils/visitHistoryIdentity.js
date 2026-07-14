const normalizeName = (value) => {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized || null;
};

export const resolveVisitActorIdentity = ({
  sourceKind,
  requestType,
  doctorName,
  responderName,
}) => {
  const doctor = normalizeName(doctorName);
  const responder = normalizeName(responderName);

  if (sourceKind === "scheduled_visit") {
    return {
      actorName: doctor,
      actorRole: doctor ? "Doctor" : "Care team",
      doctorName: doctor,
      responderName: responder,
    };
  }

  if (sourceKind === "emergency" && requestType === "ambulance") {
    return {
      actorName: responder || doctor,
      actorRole: responder ? "Responder" : doctor ? "Doctor" : "Response team",
      doctorName: doctor,
      responderName: responder,
    };
  }

  return {
    actorName: doctor || responder,
    actorRole: doctor ? "Doctor" : responder ? "Responder" : "Care team",
    doctorName: doctor,
    responderName: responder,
  };
};

export default resolveVisitActorIdentity;
