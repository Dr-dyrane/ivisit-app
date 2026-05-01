export const visitsQueryKeys = {
  all: ["visits"],
  list: (userId) => ["visits", userId || "anonymous"],
};

export default visitsQueryKeys;
