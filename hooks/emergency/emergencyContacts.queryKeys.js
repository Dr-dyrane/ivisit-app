// PULLBACK NOTE: EmergencyContacts five-layer pass - shared TanStack Query key contract.
// Owns: stable query-key builders reused by query, mutations, realtime invalidation, and hydration.

export const emergencyContactsQueryKeys = {
  all: ["emergencyContacts"],
  list: (userId) => ["emergencyContacts", userId],
};

export default emergencyContactsQueryKeys;
