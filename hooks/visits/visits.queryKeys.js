export const visitsQueryKeys = {
  all: ["visits"],
  list: (userId) => ["visits", userId || "anonymous"],
  details: ["visits", "detail"],
  detail: (visitKey, userId = null) => [
    "visits",
    "detail",
    userId || "current-user",
    visitKey || "none",
  ],
};

export default visitsQueryKeys;
