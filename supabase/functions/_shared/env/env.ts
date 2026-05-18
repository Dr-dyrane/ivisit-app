export const getEnv = (...names: string[]): string => {
  for (const name of names) {
    const value = Deno.env.get(name)?.trim();
    if (value) return value;
  }
  return "";
};

export const getBooleanEnv = (fallback: boolean, ...names: string[]): boolean => {
  const value = getEnv(...names).toLowerCase();
  if (!value) return fallback;
  return ["1", "true", "yes", "on", "enabled"].includes(value);
};
