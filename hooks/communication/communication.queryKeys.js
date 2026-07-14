export const communicationQueryKeys = {
  all: ["communication"],
  roomByVisit: (visitId) => [
    "communication",
    "room",
    "visit",
    visitId || "none",
  ],
  messages: (roomId) => [
    "communication",
    "messages",
    roomId || "none",
  ],
  participants: (roomId) => [
    "communication",
    "participants",
    roomId || "none",
  ],
};

export default communicationQueryKeys;

