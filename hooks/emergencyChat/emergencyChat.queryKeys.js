// PULLBACK NOTE: Contact Dispatch CD-4 - shared TanStack Query key contract.
// Owns: stable query-key builders reused by query, mutations, realtime invalidation, and hydration.

export const emergencyChatQueryKeys = {
  all: ["emergencyChat"],
  roomByRequest: (requestId) => ["emergencyChat", "room", requestId],
  messages: (roomId) => ["emergencyChat", "messages", roomId],
  participants: (roomId) => ["emergencyChat", "participants", roomId],
};

export default emergencyChatQueryKeys;
