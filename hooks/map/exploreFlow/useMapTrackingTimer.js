// hooks/map/exploreFlow/useMapTrackingTimer.js
// Shared broadcast timer — one setInterval for all consumers,
// preventing double re-renders when multiple hooks need nowMs.

import { useState, useEffect } from "react";

const listeners = new Set();
let timerId = null;

function tick() {
  const now = Date.now();
  for (const listener of listeners) {
    listener(now);
  }
}

/**
 * useMapTrackingTimer
 *
 * Returns the current timestamp (ms) updating every second,
 * shared across all active callers via a single interval.
 * When isActive is false the caller is unregistered and the
 * interval is cleared when no listeners remain.
 */
export function useMapTrackingTimer(isActive) {
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    if (!isActive) return undefined;

    listeners.add(setNowMs);
    if (listeners.size === 1) {
      timerId = setInterval(tick, 1000);
    }

    return () => {
      listeners.delete(setNowMs);
      if (listeners.size === 0 && timerId !== null) {
        clearInterval(timerId);
        timerId = null;
      }
    };
  }, [isActive]);

  return nowMs;
}
