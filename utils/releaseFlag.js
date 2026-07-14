const normalizeFlag = (value) => String(value ?? "").trim().toLowerCase();

export const readPromotedReleaseFlag = (value) => {
  const normalized = normalizeFlag(value);
  return normalized === "" ? true : normalized === "true";
};

export const readOptInReleaseFlag = (value) => normalizeFlag(value) === "true";
