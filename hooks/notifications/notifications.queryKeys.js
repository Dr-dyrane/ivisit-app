export const notificationsQueryKeys = {
  all: ["notifications"],
  list: (userId) => ["notifications", userId || "anonymous"],
};

export default notificationsQueryKeys;
