export const nowMs = (): number => Date.now();

export const elapsedMs = (startedAtMs: number): number =>
  Math.max(0, Date.now() - startedAtMs);

export type TimedStepEntry<TData = unknown> = {
  step: string;
  duration_ms: number;
  data: TData;
};

export const runTimedStep = async <TData>(
  timeline: TimedStepEntry[],
  step: string,
  action: () => Promise<TData>,
): Promise<TData> => {
  const startedAt = nowMs();
  const data = await action();
  timeline.push({
    step,
    duration_ms: elapsedMs(startedAt),
    data,
  });
  return data;
};
