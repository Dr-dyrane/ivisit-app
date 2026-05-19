export const nowMs = (): number => Date.now();

export const elapsedMs = (startedAtMs: number): number =>
  Math.max(0, Date.now() - startedAtMs);
