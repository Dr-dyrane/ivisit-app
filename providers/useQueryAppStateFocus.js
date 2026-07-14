import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import { focusManager } from "@tanstack/react-query";

// PULLBACK NOTE: Native query resume convergence.
// OLD: TanStack Query had no native lifecycle focus signal.
// NEW: AppState drives focusManager on native; web keeps its visibility listener.
export function useQueryAppStateFocus() {
  useEffect(() => {
    if (Platform.OS === "web") {
      return undefined;
    }

    const subscription = AppState.addEventListener("change", (status) => {
      focusManager.setFocused(status === "active");
    });

    return () => subscription.remove();
  }, []);
}
