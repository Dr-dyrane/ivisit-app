export const toText = (value: unknown, fallback = "") => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

export const toSafeBody = (value: unknown) => toText(value).slice(0, 1000);
