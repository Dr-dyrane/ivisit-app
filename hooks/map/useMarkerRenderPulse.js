import { useEffect, useState } from "react";
import { Platform } from "react-native";

const DEFAULT_PULSE_DURATION_MS = 420;

export default function useMarkerRenderPulse(
  pulseKey,
  {
    enabled = Platform.OS !== "web",
    durationMs = DEFAULT_PULSE_DURATION_MS,
  } = {},
) {
  const [tracksViewChanges, setTracksViewChanges] = useState(Boolean(enabled));

  useEffect(() => {
    if (!enabled) {
      setTracksViewChanges(false);
      return undefined;
    }

    setTracksViewChanges(true);
    const timeoutId = setTimeout(() => {
      setTracksViewChanges(false);
    }, durationMs);

    return () => clearTimeout(timeoutId);
  }, [durationMs, enabled, pulseKey]);

  return tracksViewChanges;
}
