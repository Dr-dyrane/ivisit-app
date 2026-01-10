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

export default {
  triggerForPriority,
};
