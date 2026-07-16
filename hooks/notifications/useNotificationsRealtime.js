import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePreferences } from "../../contexts/PreferencesContext";
import { notificationsService } from "../../services/notificationsService";
import hapticService from "../../services/hapticService";
import soundService from "../../services/soundService";
import { notificationsQueryKeys } from "./notifications.queryKeys";

// PULLBACK NOTE: Notifications five-layer pass - Supabase realtime bridge.
// Owns: user-scoped realtime invalidation and arrival feedback (sound + haptic).
// Does NOT own: direct UI mutation; Query remains the convergence layer.

export function useNotificationsRealtime({ userId, enabled = true }) {
  const queryClient = useQueryClient();
  const { preferences } = usePreferences();

  // Preferences are read through a ref so toggling a setting never tears the
  // channel down and resubscribes mid-session.
  const preferencesRef = useRef(preferences);
  preferencesRef.current = preferences;

  useEffect(() => {
    if (!enabled || !userId) return undefined;

    const subscription = notificationsService.subscribe(userId, (payload) => {
      queryClient.invalidateQueries({
        queryKey: notificationsQueryKeys.list(userId),
      });

      // Feedback marks arrival only; updates and dismissals stay silent.
      if (payload?.eventType !== "INSERT") return;
      if (preferencesRef.current?.notificationsEnabled === false) return;

      const priority = payload?.new?.priority;
      if (typeof priority !== "string" || !priority) return;

      // soundService owns the notificationSoundsEnabled gate via setSoundEnabled.
      // No haptics preference exists, so the master toggle above is its gate.
      void soundService.playForPriority(priority);
      void hapticService.triggerForPriority(priority);
    });

    return () => {
      subscription?.unsubscribe?.();
    };
  }, [enabled, queryClient, userId]);
}

export default useNotificationsRealtime;
