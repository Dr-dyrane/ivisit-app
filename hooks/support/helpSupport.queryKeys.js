export const helpSupportQueryKeys = {
  all: ["helpSupport"],
  faqs: () => ["helpSupport", "faqs"],
  tickets: (userId) => ["helpSupport", "tickets", userId || "anonymous"],
};

export default helpSupportQueryKeys;
