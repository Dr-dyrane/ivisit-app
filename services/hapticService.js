import * as Haptics from "expo-haptics";
import { NOTIFICATION_PRIORITY } from "../constants/notifications";

let lastHapticTime = 0;
const HAPTIC_DEBOUNCE_MS = 500;

const HAPTIC_PATTERNS = {
  [NOTIFICATION_PRIORITY.URGENT]: async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await new Promise((resolve) => setTimeout(resolve, 100));
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await new Promise((resolve) => setTimeout(resolve, 100));
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  },
  [NOTIFICATION_PRIORITY.HIGH]: async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  },
  [NOTIFICATION_PRIORITY.NORMAL]: async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },
  [NOTIFICATION_PRIORITY.LOW]: async () => {
    // No haptic for low priority
  },
};

export const triggerForPriority = async (priority) => {
  try {
    const now = Date.now();
    if (now - lastHapticTime < HAPTIC_DEBOUNCE_MS) {
      return;
    }

    const pattern = HAPTIC_PATTERNS[priority];
    if (pattern) {
      await pattern();
      lastHapticTime = now;
    }
  } catch (error) {
    // Fail silently - device may not support haptics
  }
};

// PULLBACK NOTE: triggerPress — lightweight interactive press haptic, no debounce
// Maps style string to ImpactFeedbackStyle so call sites stay magic-string-free
const PRESS_STYLE_MAP = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
};

export const triggerPress = (style = "medium") => {
  try {
    if (style === "selection") return Haptics.selectionAsync();
    return Haptics.impactAsync(PRESS_STYLE_MAP[style] ?? Haptics.ImpactFeedbackStyle.Medium);
  } catch {
    // Fail silently — device may not support haptics
  }
};

// PULLBACK NOTE: triggerOutcome — confirmation haptic after async result (success/warning/error)
// Mirrors the notificationAsync pattern already used in LoginInputModal / AuthInputModal
export const triggerOutcome = (type = "success") => {
  try {
    const typeMap = {
      success: Haptics.NotificationFeedbackType.Success,
      warning: Haptics.NotificationFeedbackType.Warning,
      error: Haptics.NotificationFeedbackType.Error,
    };
    return Haptics.notificationAsync(typeMap[type] ?? Haptics.NotificationFeedbackType.Success);
  } catch {
    // Fail silently
  }
};

export default {
  triggerForPriority,
  triggerPress,
  triggerOutcome,
};
