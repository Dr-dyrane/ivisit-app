export type DemoContext = {
  userId: string;
  userSlug: string;
  coverageKey: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  expiresAtEpochMs: number;
};

const DEMO_PREVIEW_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const toSafeUserSlug = (value: string) => {
  const normalized = value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
  return normalized.length > 0 ? normalized.toLowerCase() : "guestdemo";
};

const toCoverageAxisKey = (value: number) =>
  `${value >= 0 ? "p" : "n"}${Math.round(Math.abs(value) * 100)
    .toString()
    .padStart(4, "0")}`;

const toCoverageKey = (latitude: number, longitude: number) =>
  `${toCoverageAxisKey(latitude)}_${toCoverageAxisKey(longitude)}`;

export const buildDemoContext = (
  userId: string,
  latitude: number,
  longitude: number,
  radiusKm: number,
): DemoContext => ({
  userId,
  userSlug: toSafeUserSlug(userId),
  coverageKey: toCoverageKey(latitude, longitude),
  latitude,
  longitude,
  radiusKm,
  expiresAtEpochMs: Date.now() + DEMO_PREVIEW_TTL_MS,
});

export const resolveDemoSeedScopeKey = (ctx: DemoContext): string => {
  // Keep demo seed scope user-stable so GPS drift does not create duplicate demo orgs.
  return ctx.userSlug;
};
