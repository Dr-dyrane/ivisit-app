export const medicalProfileQueryKeys = {
  all: ["medicalProfile"],
  detail: (userId) => ["medicalProfile", userId || "anonymous"],
};

export default medicalProfileQueryKeys;
